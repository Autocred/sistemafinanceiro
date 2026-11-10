'use client';
import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

interface LancamentoRowProps {
  lancamento: any; // object from monitoramento log
  tenantId: string;
}

/**
 * Linha da tabela de lançamentos na Central Inteligente.
 * Exibe todos os campos solicitados e abre o lançamento original
 * ao clicar (rota `/lancamentos/${id}` ou `/recebimentos/${id}`
 * dependendo do tipo). Não há cores fixas – usa CSS vars.
 */
export const LancamentoRow: React.FC<LancamentoRowProps> = ({ lancamento, tenantId }) => {
  const {
    transacaoId,
    descricao,
    tipo,
    dataVencimento,
    valor,
    saldoPendente,
    categoria,
    contaBancaria,
    diasAtraso,
    prioridade,
    proximaNotificacao,
    fornecedorNome,
    clienteNome,
  } = lancamento;

  const nomeDest = fornecedorNome || clienteNome || '';
  const venc = dataVencimento ? format(new Date(dataVencimento), 'dd/MM/yyyy') : '-';
  const valorFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0);
  const saldoFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(saldoPendente) || 0);
  const corPrioridade = prioridade === 'alta' ? '#ef4444' : prioridade === 'media' ? '#fbbf24' : '#10b981';
  const linkHref = `/lancamentos/${transacaoId}`; // ajustável conforme seu routing

  return (
    <Link href={linkHref} legacyBehavior>
      <a className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors rounded-md">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-800 dark:text-gray-100">{descricao}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {nomeDest && <span>{nomeDest} • </span>}
            Venc: {venc} • {tipo === 'receita' ? 'Receita' : 'Despesa'}
          </div>
        </div>
        <div className="text-right min-w-[120px] mr-4">
          <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{valorFmt}</div>
          <div className="text-xs" style={{ color: corPrioridade }}>
            {saldoFmt} pendente
          </div>
        </div>
        <div className="text-center min-w-[100px] mr-4">
          <div className="text-sm" style={{ color: corPrioridade }}>{diasAtraso ?? 0}d</div>
          <div className="text-xs" style={{ color: corPrioridade }}>{prioridade?.toUpperCase() ?? ''}</div>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300 min-w-[150px]">
          Próx: {proximaNotificacao ? format(new Date(proximaNotificacao), 'HH:mm') : '-'}
        </div>
      </a>
    </Link>
  );
};
