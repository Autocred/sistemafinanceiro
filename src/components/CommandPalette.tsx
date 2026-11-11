'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (transacao: any) => void;
  tenantId?: string | null;
}

export function CommandPalette({ isOpen, onClose, onSelect, tenantId }: CommandPaletteProps) {
  const [queryStr, setQueryStr] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && tenantId) {
      setQueryStr('');
      setTimeout(() => inputRef.current?.focus(), 100);

      const fetchTransacoes = async () => {
        setLoading(true);
        try {
          const { getDb } = await import('@/lib/firebase');
          const db = getDb();
          const { getCollectionPath } = await import('@/lib/storage');
          const q = collection(db, getCollectionPath('transacoes'));
          const snap = await getDocs(q);
          const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          data.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
          setTransacoes(data);
        } catch (e) {
          console.error('[CommandPalette] Erro ao buscar transações:', e);
        }
        setLoading(false);
      };
      fetchTransacoes();
    }
  }, [isOpen, tenantId]);

  if (!isOpen) return null;

  const results = transacoes
    .filter(
      t =>
        t.descricao?.toLowerCase().includes(queryStr.toLowerCase()) ||
        (t.fornecedorNome && t.fornecedorNome.toLowerCase().includes(queryStr.toLowerCase()))
    )
    .slice(0, 8);

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-start justify-center pt-[10vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ border: '1px solid var(--border)' }}
      >
        <div className="flex items-center px-4 py-4 border-b border-gray-200 dark:border-slate-800">
          <Search className="w-6 h-6 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={queryStr}
            onChange={e => setQueryStr(e.target.value)}
            className="flex-1 bg-transparent text-xl outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400"
            placeholder="Pesquisar lançamentos ou fornecedores..."
          />
          <div className="text-xs font-bold text-gray-400 border border-gray-300 dark:border-slate-700 rounded px-2 py-1">
            ESC
          </div>
        </div>
        {loading && <div className="p-6 text-center text-gray-500">Carregando dados...</div>}
        {!loading && queryStr.length > 0 && (
          <div className="overflow-y-auto max-h-[60vh]">
            {results.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                Nenhum resultado encontrado para &quot;{queryStr}&quot;
              </div>
            ) : (
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Lançamentos Encontrados
                </div>
                {results.map(t => (
                  <div
                    key={t.id}
                    onClick={() => onSelect(t)}
                    className="flex items-center justify-between p-3 mx-1 my-1 rounded-xl cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg shadow-sm"
                        style={{ backgroundColor: t.categoriaCor || '#64748b' }}
                      >
                        {t.categoriaIcone || '🏷️'}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 dark:text-gray-100">{t.descricao}</div>
                        <div className="text-sm text-gray-500">
                          {t.data?.split('-').reverse().join('/')}{' '}
                          {t.fornecedorNome ? '• ' + t.fornecedorNome : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-gray-800 dark:text-gray-100">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          Number(t.valor) || 0
                        )}
                      </div>
                      <div
                        className="text-xs font-bold"
                        style={{ color: t.tipo === 'receita' ? '#16a34a' : '#ef4444' }}
                      >
                        {t.tipo === 'receita' ? 'Receita' : 'Despesa'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {!loading && !queryStr && (
          <div className="p-6 text-center text-gray-400 flex flex-col items-center gap-2">
            <Search className="w-12 h-12 text-gray-300" />
            <span>Digite para encontrar lançamentos instantaneamente.</span>
          </div>
        )}
      </div>
    </div>
  );
}
