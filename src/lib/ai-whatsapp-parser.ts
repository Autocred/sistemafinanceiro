import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { Categoria, Conta, TipoTransacao } from './types';

export interface ParseResult {
  descricao: string;
  valor: number;
  tipo: TipoTransacao;
  categoriaId?: string;
  contaId?: string;
  dataCompetencia: string; // YYYY-MM-DD
}

export async function parseWhatsappMessage(
  texto: string,
  config: { provedorIA: string; openaiApiKey?: string; geminiApiKey?: string },
  categorias: Categoria[],
  contas: Conta[]
): Promise<ParseResult> {
  const dateStr = new Date().toISOString().split('T')[0];
  const systemPrompt = `
Você é um assistente financeiro de extração de dados. O usuário vai enviar uma mensagem informal de WhatsApp (texto ou transcrição de áudio).
Sua tarefa é extrair os dados da transação em JSON estrito.
Data de Hoje: ${dateStr}. Se o usuário não especificar a data, assuma a data de hoje. Se ele disser "ontem", diminua 1 dia, etc.

Categorias válidas disponíveis (ID -> Nome):
${categorias.map(c => `${c.id} -> ${c.nome}`).join('\n')}

Contas válidas disponíveis (ID -> Nome):
${contas.map(c => `${c.id} -> ${c.nome}`).join('\n')}

Regras:
1. "tipo" deve ser apenas "despesa" ou "receita" (gastos são despesas).
2. "valor" deve ser um número float (positivo), ex: 15.50.
3. Tente deduzir a categoria mais próxima das disponíveis acima (retorne apenas o ID da categoria não campo categoriaId).
4. Tente deduzir a conta mais próxima (ex: "nubank", "mercado pago"). Se não souber, deixe contaId vazio.
5. "dataCompetencia" não formato "YYYY-MM-DD".

Você deve retornar APENAS o JSON não formato abaixo, sem formatação markdown:
{
  "descricao": "Nome do que foi gasto/recebido",
  "valor": 15.50,
  "tipo": "despesa",
  "categoriaId": "id_da_categoria",
  "contaId": "id_da_conta",
  "dataCompetencia": "YYYY-MM-DD"
}
`;

  let jsonResult = '';

  if (config.provedorIA === 'openai' && config.openaiApiKey) {
    const openai = new OpenAI({ apiKey: config.openaiApiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: texto }
      ],
      response_format: { type: "json_object" }
    });
    jsonResult = completion.choices[0].message.content || '{}';
  } else if (config.geminiApiKey) {
    // Default to Gemini se OpenAI não estiver configurado ou gemini for selecionado
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });
    const result = await model.generateContent(`${systemPrompt}\n\nMensagem do usuário: ${texto}`);
    jsonResult = result.response.text();
  } else {
    throw new Error('Nenhum provedor de IA configurado com chave válida para processar a mensagem do WhatsApp.');
  }

  try {
    const parsed = JSON.parse(jsonResult) as ParseResult;
    return parsed;
  } catch (error) {
    console.error("Erro ao parsear JSON retornado pela IA:", jsonResult);
    throw new Error('A IA retornãou um formato inválido.');
  }
}
