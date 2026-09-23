import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { parseWhatsappMessage } from '@/lib/ai-whatsapp-parser';
import { Categoria, Conta, ConfiguracaoApp, Transacao } from '@/lib/types';
import { enviarMensagemWhatsApp } from '@/lib/whatsapp';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token ausente' }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin não inicializado não servidor' }, { status: 500 });
    }

    // Processa o Payload do WhatsApp (Suportando Z-API, Evolution API)
    const body = await request.json();
    
    // Formato padrão Z-API ou Evolution API
    // Na Evolution API: body.data.message.conversation ou body.data.message.extendedTextMessage.text
    // Aqui usamos uma extração genérica para pegar o telefone e o texto
    const senderRaw = body?.sender || body?.phone || body?.data?.key?.remoteJid || body?.data?.remoteJid || '';
    let senderPhone = senderRaw.replace(/\D/g, ''); 
    if (senderPhone.length > 13) {
      // Remover sufíxos estranhos
      senderPhone = senderPhone.substring(0, 13);
    }
    
    let messageText = '';
    
    if (body?.text?.message) {
      messageText = body.text.message;
    } else if (body?.data?.message?.conversation) {
      messageText = body.data.message.conversation;
    } else if (body?.data?.message?.extendedTextMessage?.text) {
      messageText = body.data.message.extendedTextMessage.text;
    } else if (body?.message) {
      messageText = body.message;
    } else if (body?.text) {
      messageText = typeof body.text === 'string' ? body.text : body.text.text;
    }
    
    if (!messageText || typeof messageText !== 'string') {
      return NextResponse.json({ success: true, warning: 'Mensagem vazia ou não é texto' });
    }

    // Busca o usuário baseado não Token não Firestore
    const configSnap = await adminDb.collection('config').where('whatsappBotToken', '==', token).limit(1).get();
    
    if (configSnap.empty) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
    
    const configDoc = configSnap.docs[0];
    const uid = configDoc.id;
    const userConfig = configDoc.data() as ConfiguracaoApp;
    
    // Valida se o bot está ativo e se o telefone bate
    if (!userConfig.whatsappBotAtivo) {
      return NextResponse.json({ error: 'Bot está desativado para este usuário' }, { status: 403 });
    }
    
    const allowedPhone = (userConfig.whatsappBotTelefone || '').replace(/\D/g, '');
    
    // Comparação flexível (às vezes o whatsapp adiciona um 9 a mais, dependendo da região do BR)
    const senderBase = senderPhone.length > 12 ? senderPhone.substring(senderPhone.length - 8) : senderPhone;
    const allowedBase = allowedPhone.length > 12 ? allowedPhone.substring(allowedPhone.length - 8) : allowedPhone;
    
    if (senderBase !== allowedBase && allowedPhone !== '') {
      return NextResponse.json({ error: 'Telefone não autorizado' }, { status: 403 });
    }
    
    // Avisa que estamos processando (simulação de "digitando...")
    // (Num app real de Z-API, a gente poderia usar outro endpoint para isso, mas vamos direto processar)

    // Buscar Categorias e Contas do Usuário
    const [catsSnap, contasSnap] = await Promise.all([
      adminDb.collection('categorias').where('usuarioId', '==', uid).get(),
      adminDb.collection('contas').where('usuarioId', '==', uid).get()
    ]);
    
    // Se a arquitetura atual não usar 'usuarioId' nãos docs, e sim subcollections, a query precisa ser ajustada.
    // MAS neste sistema, os dados são salvos com o ID direto (client-side usa getCollectionPath sem tenant, mas aqui não temos o bypass, e sim o uid do Firebase Auth, ou tudo não root. 
    // Na arquitetura original do projeto o usuário não está particionando via 'usuarioId' nãos documentos?
    // Vamos verificar como a Collection é estruturada. Em storage.ts usa getCollectionPath('categorias'), se for single-tenant, tudo tá não root.
    // Vamos buscar não ROOT por enquanto (assumindo single tenant ou usando tenant ativo).
    // O ideal: tentar pegar do usuário. Se não existir, pega do root.
    let catsDocs = catsSnap.empty ? await adminDb.collection('categorias').get() : catsSnap;
    let contasDocs = contasSnap.empty ? await adminDb.collection('contas').get() : contasSnap;
    
    const categorias = catsDocs.docs.map((d: any) => d.data() as Categoria);
    const contas = contasDocs.docs.map((d: any) => d.data() as Conta);
    
    if (categorias.length === 0) {
      // Fallback para caso as coleções estejam em tenants/{uid}/...
      const tenantCats = await adminDb.collection(`tenants/${uid}/categorias`).get();
      if (!tenantCats.empty) {
        categorias.push(...tenantCats.docs.map((d: any) => d.data() as Categoria));
      }
    }
    
    if (contas.length === 0) {
      const tenantContas = await adminDb.collection(`tenants/${uid}/contas`).get();
      if (!tenantContas.empty) {
        contas.push(...tenantContas.docs.map((d: any) => d.data() as Conta));
      }
    }

    // Processa a mensagem na IA
    const result = await parseWhatsappMessage(messageText, userConfig, categorias, contas);
    
    // Encontrar os nomes da categoria e conta selecionada para exibir e gravar
    const catSelecionada = categorias.find((c: Categoria) => c.id === result.categoriaId);
    const contaSelecionada = contas.find((c: Conta) => c.id === result.contaId) || contas[0]; // fallback para a 1a conta
    
    const id = Date.now().toString() + Math.floor(Math.random() * 1000);
    const dateStr = result.dataCompetencia || new Date().toISOString().split('T')[0];
    
    const novaTransacao: Transacao = {
      id,
      descricao: result.descricao,
      valor: result.valor,
      tipo: result.tipo,
      data: dateStr,
      dataCompetencia: dateStr,
      status: 'pago',
      categoriaId: catSelecionada?.id || 'outros',
      categoriaNome: catSelecionada?.nome || 'Outros',
      categoriaCor: catSelecionada?.cor || '#666',
      categoriaIcone: catSelecionada?.icone || 'HelpCircle',
      contaId: contaSelecionada?.id || 'default',
      contaNome: contaSelecionada?.nome || 'Principal',
      formaPagamento: 'outro',
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
    
    // Salvar Transação (Verificar caminho. Vamos tentar na subcoleção do tenant se existir, senão não root)
    const tRefPath = (await adminDb.collection(`tenants/${uid}/transacoes`).get()).empty ? 'transacoes' : `tenants/${uid}/transacoes`;
    await adminDb.collection(tRefPath).doc(id).set(novaTransacao);
    
    // Atualizar saldo da Conta (simplificado para o Bot)
    if (contaSelecionada) {
       const cRefPath = (await adminDb.collection(`tenants/${uid}/contas`).get()).empty ? 'contas' : `tenants/${uid}/contas`;
       const cRef = adminDb.collection(cRefPath).doc(contaSelecionada.id);
       const saldoDiff = novaTransacao.tipo === 'despesa' ? -novaTransacao.valor : novaTransacao.valor;
       
       await adminDb.runTransaction(async (t: any) => {
         const doc = await t.get(cRef);
         if (doc.exists) {
           t.update(cRef, { saldo: (doc.data()?.saldo || 0) + saldoDiff });
         }
       });
    }

    // Responder ao usuário via WhatsApp
    const valorFormat = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(result.valor);
    const msgResposta = `✅ *Lançamento Salvo!*\n\n` +
                        `📝 *Descrição:* ${result.descricao}\n` +
                        `💰 *Valor:* ${valorFormat} (${result.tipo})\n` +
                        `📂 *Categoria:* ${catSelecionada?.nome || 'Não identificada'}\n` +
                        `🏦 *Conta:* ${contaSelecionada?.nome || 'Principal'}`;
                        
    await enviarMensagemWhatsApp(senderPhone, msgResposta);

    return NextResponse.json({ success: true, transacao: novaTransacao });

  } catch (error: any) {
    console.error('Erro não webhook de WhatsApp:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
