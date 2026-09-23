import React from 'react';
import * as LucideIcons from 'lucide-react';

interface DynamicIconProps {
  name: string;
  size?: number;
  color?: string;
  fallback?: string;
}

// Verifica se a string contém algum emoji
function hasEmoji(str: string) {
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u;
  return emojiRegex.test(str);
}

export function DynamicIcon({ name, size = 16, color, fallback = '💰' }: DynamicIconProps) {
  if (!name) return <span>{fallback}</span>;

  // Compatibilidade com dados legados que possuem Emojis
  if (hasEmoji(name)) {
    return <span style={{ fontSize: size }}>{name}</span>;
  }

  // Se não tem emoji, assume que é um ícone do Lucide
  const IconComponent = (LucideIcons as any)[name];

  if (!IconComponent) {
    // Caso não encontre o ícone, renderiza o fallback (mas mantendo compatibilidade com emoji se o próprio fallback for)
    if (hasEmoji(fallback)) {
      return <span style={{ fontSize: size }}>{fallback}</span>;
    }
    const FallbackIcon = (LucideIcons as any)[fallback];
    if (FallbackIcon) return <FallbackIcon size={size} color={color} />;
    return <span>{fallback}</span>;
  }

  return <IconComponent size={size} color={color} />;
}
