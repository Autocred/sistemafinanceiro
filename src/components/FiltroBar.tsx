import React from 'react';
// Button component not needed; using native button

export type FiltroTipo =
  | 'todas'
  | 'aPagar'
  | 'aReceber'
  | 'vencidas'
  | 'venceHoje'
  | 'prioritarias';

interface FiltroBarProps {
  selected: FiltroTipo;
  onChange: (filtro: FiltroTipo) => void;
}

/**
 * Barra de filtros para a Central Inteligente.
 * Cada botão respeita a paleta do tenant via CSS var `--primary`.
 * Não há cores hard‑coded; usamos classes Tailwind que herdam a cor via `text-primary` etc.
 */
export const FiltroBar: React.FC<FiltroBarProps> = ({ selected, onChange }) => {
  const filtros: { label: string; value: FiltroTipo }[] = [
    { label: 'TODAS', value: 'todas' },
    { label: 'A PAGAR', value: 'aPagar' },
    { label: 'A RECEBER', value: 'aReceber' },
    { label: 'VENCIDAS', value: 'vencidas' },
    { label: 'VENCEM HOJE', value: 'venceHoje' },
    { label: 'PRIORITÁRIAS', value: 'prioritarias' },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {filtros.map(f => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors 
            ${selected === f.value ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200'}
          `}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
};
