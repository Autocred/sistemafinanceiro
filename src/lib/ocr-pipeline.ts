import { getConfiguracoes } from './storage';
import { getFirebaseAuth } from './auth';
import { aiProvider, AIProviderOptions } from './ai-provider';

export interface DadosFiscaisExtraidos {
  tipoDocumento: string;
  fornecedor: string;
  cnpj: string;
  cpf: string;
  numeroDocumento: string;
  serie: string;
  data: string;
  valorTotal: number;
  formaPagamento: string;
  categoria: string;
  subcategoria: string;
  centroCusto: string;
  produtos: Array<{
    nome: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
  }>;
  observacoes?: string;
  metadata?: {
    provedorUtilizado?: string;
    modeloUtilizado?: string;
  };
}

const SYSTEM_PROMPT = `Você é um Analista Fiscal Sênior de um sistema ERP corporativo.
Sua missão é realizar a extração OCR (Optical Character Recognition) avançada e interpretação da imagem de um documento fiscal (Nota Fiscal, Cupom Fiscal, NFC-e, SAT, DANFE, Recibo, PIX ou fatura).
Sua resposta DEVE ser estritamente um JSON estruturado seguindo o esquema abaixo.
Não adicione formatação markdown (sem \`\`\`json não início). NENHUM texto fora do JSON.

Retorne APENAS o JSON não formato:
{
 "tipoDocumento": "Identifique o tipo (ex: Cupom Fiscal, NF-e, Recibo PIX)",
 "fornecedor": "Razão Social ou Nome Fantasia do emissor",
 "cnpj": "CNPJ do emissor (somente números)",
 "cpf": "CPF na nota (se houver)",
 "numeroDocumento": "Número da nota/cupom",
 "serie": "Série da nota",
 "data": "Data de emissão (formato YYYY-MM-DD)",
 "valorTotal": 154.30, // Número Decimal (substitua vírgula por ponto)
 "formaPagamento": "PIX, Dinheiro, Cartão Crédito, Débito, Boleto, etc",
 "categoria": "Categoria sugerida para o gasto (ex: Alimentação, Transporte)",
 "subcategoria": "Subcategoria sugerida",
 "centroCusto": "Sugerir 'Geral' ou departamento apropriado",
 "produtos": [
    {
      "nome": "Descrição do item",
      "quantidade": 1.0,
      "valorUnitario": 10.50,
      "valorTotal": 10.50
    }
 ],
 "observacoes": "Quaisquer dados extras relevantes como impostos (ICMS, etc) ou chaves de acesso."
}`;

/**
 * Função para tentar aplicar contraste e binarização usando um canvas offscreen,
 * útil para OCR de cupons amassados ou apagados.
 */
function preprocessImage(base64Image: string, mimeType: string): Promise<string> {
  // Otimização de velocidade: Modelos atuais como Gemini 1.5 Flash e GPT-4o
  // têm excelente visão computacional e preferem imagens não binarizadas.
  // Pular o processamento via canvas ganha muito tempo de execução.
  return Promise.resolve(base64Image);
}

export async function extrairDadosDocumento(
  base64Image: string,
  onProgress?: (msg: string) => void
): Promise<DadosFiscaisExtraidos> {
  
  let base64Data = base64Image;
  let mimeType = 'image/jpeg';
  if (base64Image.startsWith('data:')) {
    const arr = base64Image.split(',');
    mimeType = arr[0].match(/:(.*?);/)![1];
    base64Data = arr[1];
  }

  // 1. Pré-processamento foi otimizado (enviamos a foto crua direto para ganhar velocidade)
  const processedData = await preprocessImage(base64Data, mimeType);

  // 2. Verifica configurações para decidir o motor
    let uid = 'app';
    if (typeof window !== 'undefined') {
      const auth = getFirebaseAuth();
      const isBypassAtivo = (() => { try { return sessionStorage.getItem('master_bypass'); } catch(e) { return null; } })() === 'true';
      uid = isBypassAtivo ? 'clovis-master-bypass' : (auth.currentUser?.uid || 'app');
    }
    const config = await getConfiguracoes(uid);
    
    let aiResponse = { text: '', providerUsed: 'offline', modelUsed: 'tesseract' };
    
    if (config.provedorIA === 'offline' || (!config.geminiApiKey && !config.openaiApiKey)) {
        onProgress?.('Modo Offline Ativo. Preparando documento...');
        try {
            let imageBase64ToRead = `data:${mimeType};base64,${base64Data}`;

            // Converter PDF para Imagem se for PDF
            if (mimeType.includes('pdf')) {
                onProgress?.('Convertendo PDF para Imagem (Offline)...');
                if (!(window as any).pdfjsLib) {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
                    document.head.appendChild(script);
                    await new Promise(r => setTimeout(r, 1500)); // Espera carregar
                    (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
                }
                
                const pdfData = atob(base64Data);
                const uint8Array = new Uint8Array(pdfData.length);
                for (let i = 0; i < pdfData.length; i++) {
                    uint8Array[i] = pdfData.charCodeAt(i);
                }
                
                const loadingTask = (window as any).pdfjsLib.getDocument({ data: uint8Array });
                const pdf = await loadingTask.promise;
                const page = await pdf.getPage(1); // Le a primeira pagina
                
                const scale = 2.0;
                const viewport = page.getViewport({ scale });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                await page.render({ canvasContext: context, viewport: viewport }).promise;
                imageBase64ToRead = canvas.toDataURL('image/jpeg');
            }

            onProgress?.('Iniciando Leitura Visual (Tesseract)...');
            const Tesseract = (await import('tesseract.js')).default;
            const { data: { text } } = await Tesseract.recognize(
                imageBase64ToRead,
                'por+eng',
                { logger: m => { if (m.status === 'recognizing text') onProgress?.(`Lendo texto da imagem: ${Math.round(m.progress * 100)}%`) } }
            );
            
            onProgress?.('Texto extraído! Processando regras offline...');
            
            const tUpper = text.toUpperCase();
            
            // Extração Baseada em Âncoras (Procurar R$, TOTAL, VALOR)
            let valor = 0;
            // 1. Tenta achar algo que tenha R$ ou VALOR perto
            const âncoras = text.match(/(?:R\$|VALOR|TOTAL|PAGO)\s*:?\s*(\d{1,5}(?:[.,]\s*\d{3})*[.,]\s*\d{2})/gi) || [];
            let possiveisValores = [];
            
            const extrairNum = (s: string) => {
               let limpo = s.replace(/[^0-9,.]/g, '');
               if (limpo.includes(',') && limpo.includes('.')) {
                  const lastComma = limpo.lastIndexOf(',');
                  const lastDot = limpo.lastIndexOf('.');
                  if (lastComma > lastDot) limpo = limpo.replace(/\./g, '').replace(',', '.');
                  else limpo = limpo.replace(/,/g, '');
               } else if (limpo.includes(',')) {
                  limpo = limpo.replace(',', '.');
               }
               return parseFloat(limpo);
            };

            for (const a of âncoras) {
                const match = a.match(/(\d{1,5}(?:[.,]\s*\d{3})*[.,]\s*\d{2})/);
                if (match) possiveisValores.push(extrairNum(match[1]));
            }

            if (possiveisValores.length > 0) {
               valor = Math.max(...possiveisValores.filter(v => v < 1000000 && !isNaN(v)));
            } else {
               // Fallback: Pega qualquer número e acha o maior, ignorando coisas que parecem CNPJ (ex: 81.332)
               const matches: string[] = Array.from(text.match(/\d{1,5}[.,]\s*\d{2}\b/g) || []);
                const textLimpo = text.replace(/[^a-zA-Z0-9.,$]/g, '');
                const extratores = textLimpo.match(/\d{1,5}[.,]\d{2}/g) || [];
                matches.push(...extratores);
               let todosValores = matches.map(extrairNum).filter(n => !isNaN(n) && n > 0 && n < 100000);
               if (todosValores.length > 0) {
                  // Pega o maior, assumindo que CNPJs e fragmentos são menores ou não chegam até aqui
                  valor = Math.max(...todosValores);
               }
            }
            
            // Extração de Data
            const dataMatch = text.match(/(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})/);
            let dataObj = new Date().toISOString().split('T')[0];
            if (dataMatch) {
              const dia = parseInt(dataMatch[1]);
              const mes = parseInt(dataMatch[2]);
              if (dia <= 31 && mes <= 12) {
                 dataObj = `${dataMatch[3]}-${dataMatch[2].padStart(2,'0')}-${dataMatch[1].padStart(2,'0')}`;
              }
            }
          
            // Forma de Pagamento
            let formaPagamento = 'outros';
            if (tUpper.match(/PIX|P1X/)) formaPagamento = 'pix';
            else if (tUpper.match(/CREDITO|CRÉDITO|MASTER|VISA|AMEX|HIPERCARD|ELO C/)) formaPagamento = 'cartao_credito';
            else if (tUpper.match(/DEBITO|DÉBITO|MAESTRO|ELO D|VISA ELECTRON/)) formaPagamento = 'cartao_debito';
            else if (tUpper.match(/DINHEIRO|ESPÉCIE|ESPECIE|TROCO/)) formaPagamento = 'dinheiro';
            else if (tUpper.match(/BOLETO|CÓDIGO DE BARRAS|CODIGO DE BARRAS|BANCO|ITAU|BRADESCO|SANTANDER|CAIXA|NUBANK/)) formaPagamento = 'boleto';
            else if (tUpper.match(/TRANSFERENCIA|TRANSFERÊNCIA|TED|DOC/)) formaPagamento = 'transferencia';
            
            // Categoria
            let categoria = 'Outros';
            if (tUpper.match(/MERCADO|SUPERMERCADO|PADARIA|RESTAURANTE|LANCHONETE|IFOOD|ATACADAO|ASSAI|CARREFOUR|EXTRA|BISTEK|ANGELONI|FORT|COMPERA|ZAFFARI|BIG|ALIMENTOS/)) categoria = 'Alimentação';
            else if (tUpper.match(/UBER|99|TAXI|POSTO|COMBUSTIVEL|COMBUSTÍVEL|GASOLINA|ETANOL|ESTACIONAMENTO|PEDAGIO|PEDÁGIO|SEM PARAR|IPIRANGA|SHELL|PETROBRAS/)) categoria = 'Transporte';
            else if (tUpper.match(/FARMACIA|FARMÁCIA|DROGARIA|PAGUE MENOS|DROGASIL|SAO JOAO|RAIA|PANVEL|HOSPITAL|CLINICA|MÉDICO/)) categoria = 'Saúde';
            else if (tUpper.match(/ENERGIA|ENEL|CEMIG|COPEL|CELESC|ÁGUA|AGUA|SABESP|COPASA|CORSAN|SANEPAR|TELEFONE|VIVO|CLARO|TIM|INTERNET|CONDOMINIO/)) categoria = 'Casa';
            else if (tUpper.match(/PET|VETERINARIO|RACAO|RAÇÃO|COBASI|PETZ/)) categoria = 'Pets';
            else if (tUpper.match(/RENNER|C&A|ZARA|RIACHUELO|SHOPPING|ROUPA|CALÇADO/)) categoria = 'Compras';

            // Estabelecimento Inteligente via CNPJ
            let estabelecimento = '';
            const linhas = text.split('\n').map(l => l.trim().replace(/[^a-zA-Z0-9\s\.\-&À-ÿ\/\*]/g, '')).filter(l => l.length > 3);
            
            // Procura a linha que tem CNPJ e tenta pegar a linha imediatamente anterior! (Agora suporta mascarados 13.***.***/****-17)
            const cnpjIndex = linhas.findIndex(l => l.toUpperCase().includes('CNPJ') || l.match(/[§$S\\d]{2}[.,][\\d*]{3}[.,][\\d*]{3}\/[\\d*]{4}\-\d{2}/));
            if (cnpjIndex > 0) {
                // Pega a linha de cima, garantindo que tenha letras (provavelmente o nome da empresa)
                if (linhas[cnpjIndex - 1].match(/[a-zA-Z]{3,}/)) {
                    estabelecimento = linhas[cnpjIndex - 1];
                    // Se a linha anterior terminar com "DO" ou "DE", pega a outra linha também (ex: FACEBOOK SERVICOS ONLINE DO \n BRASIL LTDA)
                    if (cnpjIndex > 1 && linhas[cnpjIndex - 2].match(/[a-zA-Z]{3,}/)) {
                        estabelecimento = linhas[cnpjIndex - 2] + ' ' + estabelecimento;
                    }
                }
            }
            
            // Extração Baseada em Cabeçalhos de Pix (Recebedor, Favorecido)
            if (!estabelecimento) {
                let foundHeader = false;
                for (let i = 0; i < linhas.length; i++) {
                   const lUp = linhas[i].toUpperCase();
                   
                   // Match na mesma linha (ex: Nome: Fulano de Tal)
                   if (lUp.match(/(?:RECEBEDOR|FAVORECIDO|DESTINATÁRIO|DESTINATARIO|PAGO A|NOME)\s*:\s*(.+)/)) {
                       const matchRes = lUp.match(/(?:RECEBEDOR|FAVORECIDO|DESTINATÁRIO|DESTINATARIO|PAGO A|NOME)\s*:\s*(.+)/); estabelecimento = matchRes ? matchRes[1].trim() : '';
                       if (estabelecimento) break;
                   }
                   
                   // Match em linhas seguintes (ex: Dados do Recebedor \n Para \n Fulano)
                   if (lUp.includes('DADOS DO RECEBEDOR') || lUp.includes('DADOS DO FAVORECIDO') || lUp.includes('DADOS DO PAGAMENTO')) {
                       foundHeader = true;
                       for (let j = 1; j <= 4; j++) {
                           if (i + j < linhas.length) {
                               const nextLine = linhas[i + j];
                               const nextLineUp = nextLine.toUpperCase();
                               // Ignora lixo ou palavras de transição
                               if (nextLineUp === 'PARA' || nextLineUp.includes('NOME') || nextLineUp.match(/^[\d\W]+$/)) continue;
                               if (nextLineUp.includes('CNPJ') || nextLineUp.includes('CPF') || nextLineUp.includes('CHAVE') || nextLineUp.includes('INSTITUI')) break;
                               
                               if (nextLine.match(/[a-zA-Z]{3,}/)) {
                                   estabelecimento = nextLine;
                                   // Puxa a segunda linha também, se for parte do nome da empresa
                                   if (i + j + 1 < linhas.length) {
                                      const afterLine = linhas[i + j + 1];
                                      const afterLineUp = afterLine.toUpperCase();
                                      if (afterLine.match(/[a-zA-Z]{3,}/) && !afterLineUp.includes('CNPJ') && !afterLineUp.includes('CPF') && !afterLineUp.includes('CHAVE')) {
                                          estabelecimento += ' ' + afterLine;
                                      }
                                   }
                                   break;
                               }
                           }
                       }
                   }
                   
                   if (estabelecimento) break;
                }
            }

            // Fallback: Primeira linha que contenha no minimo 3 letras juntas, ignorando cabeçalhos de sistema
            if (!estabelecimento) {
                for (const l of linhas) {
                   const lUp = l.toUpperCase();
                   if (lUp.includes('EXTRATO') || lUp.includes('COMPROVANTE') || lUp.includes('RECIBO') || lUp.includes('CUPOM') || lUp.match(/^\d/)) continue;
                   if (l.match(/[a-zA-Z]{3,}/)) {
                      estabelecimento = l;
                      break;
                   }
                }
            }
            if (!estabelecimento) estabelecimento = 'Lançamento Automático';
            estabelecimento = estabelecimento.substring(0, 50).trim();

            const isReceita = tUpper.includes('RECEBIMENTO') || tUpper.includes('TRANSFERÊNCIA RECEBIDA') || tUpper.includes('VOCÊ RECEBEU') || tUpper.includes('PIX RECEBIDO') || tUpper.includes('PAGADOR');
            
            const debugText = text.replace(/\n/g, ' | ').substring(0, 500);

            const jsonOffline = {
                tipoDocumento: isReceita ? 'Receita/Recibo' : 'Nota/Cupom Fiscal',
                fornecedor: estabelecimento,
                valorTotal: valor,
                data: dataObj,
                formaPagamento: formaPagamento,
                categoria: categoria,
                observacoes: `[${valor === 0 ? 'FALHOU VALOR' : 'OK'}] LIDO: ${debugText}`
            };
            
            aiResponse.text = JSON.stringify(jsonOffline);
            onProgress?.('Dados estruturados no Modo Offline.');
        } catch (err: any) {
            throw new Error('Falha no Modo Offline (Tesseract/PDF): ' + err.message);
        }
    } else {
        // Modo IA Ativo
        onProgress?.('Enviando para Motor de IA Avançado (Google Gemini / OpenAI)...');
        
        const options: AIProviderOptions = {
          systemPrompt: SYSTEM_PROMPT,
          temperature: 0.05,
          retries: 3,
          timeoutMs: 40000
        };
      
        aiResponse = await aiProvider.analyzeImage(
          processedData, 
          mimeType, 
          "Extraia os dados precisos desta imagem e retorne APENAS um JSON válido de acordo com o esquema solicitado.", 
          options
        );
      
        onProgress?.(`Dados extraídos via ${aiResponse.providerUsed} (${aiResponse.modelUsed}). Validando...`);
    }

  // 3. Validação e Parse do JSON
  let limpo = aiResponse.text.trim();
  if (limpo.startsWith('```json')) limpo = limpo.substring(7);
  if (limpo.startsWith('```')) limpo = limpo.substring(3);
  if (limpo.endsWith('```')) limpo = limpo.substring(0, limpo.length - 3);
  limpo = limpo.trim();

  try {
    const parsed = JSON.parse(limpo);
    return {
      tipoDocumento: parsed.tipoDocumento || 'Desconhecido',
      fornecedor: parsed.fornecedor || 'Fornecedor Diversos',
      cnpj: parsed.cnpj || '',
      cpf: parsed.cpf || '',
      numeroDocumento: parsed.numeroDocumento || '',
      serie: parsed.serie || '',
      data: parsed.data || new Date().toISOString().substring(0, 10),
      valorTotal: Number(parsed.valorTotal) || 0,
      formaPagamento: parsed.formaPagamento || 'Outros',
      categoria: parsed.categoria || 'Geral',
      subcategoria: parsed.subcategoria || '',
      centroCusto: parsed.centroCusto || 'Geral',
      produtos: Array.isArray(parsed.produtos) ? parsed.produtos : [],
      observacoes: parsed.observacoes || '',
      metadata: {
        provedorUtilizado: aiResponse.providerUsed,
        modeloUtilizado: aiResponse.modelUsed
      }
    };
  } catch (err: any) {
    console.error('Falha não JSON gerado:', aiResponse.text);
    throw new Error('A IA não conseguiu gerar um formato válido. JSON corrompido.');
  }
}
