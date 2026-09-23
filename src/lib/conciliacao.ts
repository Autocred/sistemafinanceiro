import { Transacao, ConciliacaoItem } from './types';
import { gerarId, formatarMoeda } from './storage';

/**
 * PARSER E MOTOR DE CONCILIAÇÃO BANCÁRIA (OFX / CSV)
 */

export function parseConteudoConciliacao(conteudo: string, nomeArquivo: string): ConciliacaoItem[] {
  const itens: ConciliacaoItem[] = [];
  const ext = nomeArquivo.toLowerCase().split('.').pop();

  if (ext === 'ofx' || conteudo.includes('<OFX>')) {
    // Parser simplificado OFX (Tags <STMTTRN>)
    const regexTrn = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;

    while ((match = regexTrn.exec(conteudo)) !== null) {
      const bloco = match[1];

      const trnTypeMatch = /<TRNTYPE>(.*?)[\r\n<]/i.exec(bloco);
      const dtPostedMatch = /<DTPOSTED>(.*?)[\r\n<]/i.exec(bloco);
      const trnAmtMatch = /<TRNAMT>(.*?)[\r\n<]/i.exec(bloco);
      const memoMatch = /<MEMO>(.*?)[\r\n<]/i.exec(bloco) || /<NAME>(.*?)[\r\n<]/i.exec(bloco);
      const fitIdMatch = /<FITID>(.*?)[\r\n<]/i.exec(bloco);

      const val = parseFloat(trnAmtMatch ? trnAmtMatch[1].replace(',', '.') : '0');
      let dt = dtPostedMatch ? dtPostedMatch[1].substring(0, 8) : '';
      if (dt.length === 8) {
        dt = `${dt.substring(0, 4)}-${dt.substring(4, 6)}-${dt.substring(6, 8)}`;
      } else {
        dt = new Date().toISOString().split('T')[0];
      }

      itens.push({
        id: fitIdMatch ? fitIdMatch[1] : gerarId(),
        data: dt,
        descricao: memoMatch ? memoMatch[1].trim() : 'Lançamento OFX',
        valor: Math.abs(val),
        tipo: val >= 0 ? 'receita' : 'despesa',
        documento: fitIdMatch ? fitIdMatch[1] : undefined,
        status: 'pendente'
      });
    }
  } else {
    // Parser CSV (Separação por vírgula ou ponto e vírgula)
    const linhas = conteudo.split(/\r?\n/);
    for (let i = 1; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      if (!linha) continue;

      const cols = linha.includes(';') ? linha.split(';') : linha.split(',');
      if (cols.length >= 3) {
        const rawData = cols[0].replace(/"/g, '').trim();
        const rawDesc = cols[1].replace(/"/g, '').trim();
        const rawVal = cols[2].replace(/"/g, '').replace('R$', '').replace(/\s/g, '').replace(',', '.').trim();

        const val = parseFloat(rawVal);
        if (!isNaN(val)) {
          let dtFormatted = rawData;
          if (rawData.includes('/')) {
            const parts = rawData.split('/');
            if (parts.length === 3) {
              dtFormatted = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }

          itens.push({
            id: gerarId(),
            data: dtFormatted,
            descricao: rawDesc || 'Lançamento CSV',
            valor: Math.abs(val),
            tipo: val >= 0 ? 'receita' : 'despesa',
            status: 'pendente'
          });
        }
      }
    }
  }

  return itens;
}

/**
 * ENCONTRA CORRESPONDÊNCIAS AUTOMÁTICAS DE LANÇAMENTOS NO SISTEMA
 */
export function executarMatchConciliacao(
  extratoItens: ConciliacaoItem[],
  transacoes: Transacao[] = []
): ConciliacaoItem[] {
  return extratoItens.map(item => {
    // Busca transação com mesmo valor, tipo e data idêntica ou diferença de até 2 dias
    const matchExato = transacoes.find(t => {
      const valorIgual = Math.abs(t.valor - item.valor) < 0.01;
      const tipoIgual = t.tipo === item.tipo;
      const dataIgual = (t.dataVencimento || t.data) === item.data;
      return valorIgual && tipoIgual && dataIgual;
    });

    if (matchExato) {
      return {
        ...item,
        transacaoCorrespondenteId: matchExato.id,
        scoreMatch: 100,
        status: 'conciliado'
      };
    }

    // Busca aproximada por valor e tolerância de 3 dias
    const matchAproximado = transacoes.find(t => {
      const valorIgual = Math.abs(t.valor - item.valor) < 0.01;
      const tipoIgual = t.tipo === item.tipo;
      const diffMs = Math.abs(new Date((t.dataVencimento || t.data)).getTime() - new Date(item.data).getTime());
      const diffDias = diffMs / (1000 * 60 * 60 * 24);
      return valorIgual && tipoIgual && diffDias <= 3;
    });

    if (matchAproximado) {
      return {
        ...item,
        transacaoCorrespondenteId: matchAproximado.id,
        scoreMatch: 85,
        status: 'divergente'
      };
    }

    return item;
  });
}
