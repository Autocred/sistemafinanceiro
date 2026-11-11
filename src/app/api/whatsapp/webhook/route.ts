import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { parseWhatsappMessage, parseWhatsappAudio, ParseResult } from '@/lib/ai-whatsapp-parser';
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
      return NextResponse.json({ error: 'Firebase Admin não inicializado no servidor' }, { status: 500 });
    }

    // Processa o Payload do WhatsApp (Suportando Z-API, Evolution API, Baileys)
    const body = await request.json();

    const senderRaw = body?.sender || body?.phone || body?.data?.key?.remoteJid || body?.data?.remoteJid || '';
    let senderPhone = senderRaw.replace(/\D/g, '');
    if (senderPhone.length > 13) {
      senderPhone = senderPhone.substring(0, 13);
    }

    let messageText = '';
    let audioBase64: string | null = null;
    let audioMimeType: string = 'audio/ogg';

    if (body?.text?.message) {
      messageText = body.text.message;
    } else if (body?.data?.message?.conversation) {
      messageText = body.data.message.conversation;
    } else if (body?.data?.message?.extendedTextMessage?.text) {
      messageText = body.data.message.extendedTextMessage.text;
    } else if (body?.message && typeof body.message === 'string') {
      messageText = body.message;
    } else if (body?.text) {
      messageText = typeof body.text === 'string' ? body.text : body.text.text;
    }

    // Identificação de Áudio (Z-API, Evolution API, Baileys)
    const audioUrl =
      body?.audio?.audioUrl ||
      body?.audio?.url ||
      body?.audioUrl ||
      body?.data?.message?.audioMessage?.url ||
      body?.data?.message?.audio?.url;

    if (audioUrl && typeof audioUrl === 'string') {
      try {
        const audioRes = await fetch(audioUrl);
        if (audioRes.ok) {
          const arrayBuf = await audioRes.arrayBuffer();
          audioBase64 = Buffer.from(arrayBuf).toString('base64');
          audioMimeType = audioRes.headers.get('content-type') || 'audio/ogg';
        }
      } catch (err) {
        console.error('[WHATSAPP WEBHOOK] Falha ao baixar áudio da URL:', err);
      }
    } else if (body?.data?.message?.base64) {
      audioBase64 = body.data.message.base64;
      audioMimeType = body.data.message.mimetype || 'audio/ogg';
    } else if (body?.audio?.base64) {
      audioBase64 = body.audio.base64;
      audioMimeType = body.audio.mimetype || 'audio/ogg';
    }

    if (!messageText && !audioBase64) {
      return NextResponse.json({ success: true, warning: 'Mensagem vazia ou tipo não suportado' });
    }

    // Busca o usuário baseado no Token no Firestore
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

    // Buscar Categorias e Contas do Usuário
    const [catsSnap, contasSnap] = await Promise.all([
      adminDb.collection('categorias').where('usuarioId', '==', uid).get(),
      adminDb.collection('contas').where('usuarioId', '==', uid).get()
    ]);

    let catsDocs = catsSnap.empty ? await adminDb.collection('categorias').get() : catsSnap;
    let contasDocs = contasSnap.empty ? await adminDb.collection('contas').get() : contasSnap;

    const categorias = catsDocs.docs.map((d: any) => d.data() as Categoria);
    const contas = contasDocs.docs.map((d: any) => d.data() as Conta);

    if (categorias.length === 0) {
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

    // Processa a mensagem na IA (Áudio ou Texto)
    let result: ParseResult;
    if (audioBase64) {
      result = await parseWhatsappAudio(audioBase64, audioMimeType, userConfig, categorias, contas);
    } else {
      result = await parseWhatsappMessage(messageText, userConfig, categorias, contas);
    }

    // Encontrar os nomes da categoria e conta selecionada para exibir e gravar
    const catSelecionada = categorias.find((c: Categoria) => c.id === result.categoriaId);
    const contaSelecionada = contas.find((c: Conta) => c.id === result.contaId) || contas[0];

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

    // Salvar Transação
    const tRefPath = (await adminDb.collection(`tenants/${uid}/transacoes`).get()).empty
      ? 'transacoes'
      : `tenants/${uid}/transacoes`;
    await adminDb.collection(tRefPath).doc(id).set(novaTransacao);

    // Atualizar saldo da Conta
    if (contaSelecionada) {
      const cRefPath = (await adminDb.collection(`tenants/${uid}/contas`).get()).empty
        ? 'contas'
        : `tenants/${uid}/contas`;
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
    const origemTexto = audioBase64 ? '🎙️ _Áudio processado por IA_' : '💬 _Mensagem de texto_';
    const msgResposta =
      `✅ *Lançamento Salvo com Sucesso!*\n${origemTexto}\n\n` +
      `📝 *Descrição:* ${result.descricao}\n` +
      `💰 *Valor:* ${valorFormat} (${result.tipo.toUpperCase()})\n` +
      `📂 *Categoria:* ${catSelecionada?.nome || 'Não identificada'}\n` +
      `🏦 *Conta:* ${contaSelecionada?.nome || 'Principal'}`;

    await enviarMensagemWhatsApp(senderPhone, msgResposta);

    return NextResponse.json({ success: true, transacao: novaTransacao });
  } catch (error: any) {
    console.error('Erro no webhook de WhatsApp:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
