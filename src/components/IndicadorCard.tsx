import React from 'react';
import { Icon } from 'lucide-react';

interface IndicadorCardProps {
  title: string;
  value: string | number;
  icon: React.ReactElement;
  /**
   * Cor da bandeira (background) – use a cor primária do tenant ou padrão.
   */
  bgColor?: string;
}

/**
 * Card de indicador usado na Central Inteligente de Alertas.
 * Respeita as regras White‑Label – nenhuma cor fixa; se `bgColor`
 * não for fornecida, o componente usa a variável CSS `--primary` que
 * já está configurada a partir da configuração do tenant.
 */
export const IndicadorCard: React.FC<IndicadorCardProps> = ({ title, value, icon, bgColor }) => {
  const style = bgColor ? { backgroundColor: bgColor } : {};
  return (
    <div className="flex items-center p-4 rounded-xl shadow-sm bg-white dark:bg-slate-800" style={style}>
      <div className="p-2 rounded-full bg-gray-100 dark:bg-slate-700 mr-4">{icon}</div>
      <div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
        <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{value}</div>
      </div>
    </div>
  );
};
