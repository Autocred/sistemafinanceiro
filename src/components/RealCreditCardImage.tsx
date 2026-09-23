'use client';

import React from 'react';
import { CreditCard as CardIcon, Wifi } from 'lucide-react';

interface Props {
  nome: string;
  bandeira?: string;
  cor?: string;
  height?: number;
}

export function RealCreditCardImage({ nome, bandeira = 'mastercard', cor = '#00bcff', height = 170 }: Props) {
  const nãorm = (nome || '').toLowerCase().trim();

  let imageSrc: string | null = null;
  if (nãorm.includes('nu') || nãorm.includes('roxinho')) {
    imageSrc = '/cards/nubank.jpg';
  } else if (nãorm.includes('itau') || nãorm.includes('itaú')) {
    imageSrc = '/cards/itau.jpg';
  }

  if (imageSrc) {
    return (
      <div style={{
        width: '100%',
        height: height,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 12px 28px rgba(0,0,0,0.4)',
        position: 'relative',
        border: '1px solid rgba(255,255,255,0.15)',
        marginBottom: 16
      }}>
        <img
          src={imageSrc}
          alt={`Cartão ${nome}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{
          position: 'absolute',
          bottom: 12,
          left: 16,
          color: '#ffffff',
          fontWeight: 800,
          fontSize: 13,
          textShadow: '0 2px 4px rgba(0,0,0,0.8)',
          letterSpacing: '1px'
        }}>
          {(nome || '').toUpperCase()}
        </div>
      </div>
    );
  }

  // Fallback 3D Visual Card
  const getGradient = () => {
    if (nãorm.includes('c6')) return 'linear-gradient(135deg, #1f2421 0%, #000000 100%)';
    if (nãorm.includes('inter')) return 'linear-gradient(135deg, #ff7a00 0%, #ff5000 100%)';
    if (nãorm.includes('bradesco')) return 'linear-gradient(135deg, #cc092f 0%, #90001d 100%)';
    if (nãorm.includes('santander')) return 'linear-gradient(135deg, #ec0000 0%, #b30000 100%)';
    if (nãorm.includes('caixa')) return 'linear-gradient(135deg, #005ca9 0%, #f26522 100%)';
    if (nãorm.includes('mercado') || nãorm.includes('mp')) return 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)';
    return `linear-gradient(135deg, ${cor} 0%, #111111 100%)`;
  };

  return (
    <div style={{
      width: '100%',
      height: height,
      borderRadius: 16,
      background: getGradient(),
      padding: 16,
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 12px 28px rgba(0,0,0,0.4)',
      border: '1px solid rgba(255,255,255,0.2)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      color: '#ffffff',
      marginBottom: 16
    }}>
      {/* Background pattern */}
      <div style={{ position: 'absolute', right: -30, bottom: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
      <div style={{ position: 'absolute', right: 40, top: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

      {/* Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
        <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          {nome || ''}
        </span>
        <Wifi size={20} style={{ transform: 'rotate(90deg)', opacity: 0.8 }} />
      </div>

      {/* Chip EMV */}
      <div style={{ zIndex: 1, margin: '8px 0' }}>
        <div style={{
          width: 36,
          height: 26,
          borderRadius: 6,
          background: 'linear-gradient(135deg, #ffe066 0%, #d4af37 100%)',
          border: '1px solid #b8860b',
          boxShadow: 'inset 0 0 4px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ width: '80%', height: '60%', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 2 }} />
        </div>
      </div>

      {/* Card Footer */}
      <div style={{ zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '2px', fontFamily: 'monãospace', opacity: 0.9 }}>
            •••• •••• •••• 8492
          </p>
          <p style={{ fontSize: 9, opacity: 0.8, textTransform: 'uppercase', marginTop: 2 }}>
            TITULAR DA CONTA
          </p>
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 4 }}>
          {bandeira || 'VISA'}
        </div>
      </div>
    </div>
  );
}
