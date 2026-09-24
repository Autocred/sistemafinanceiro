'use client';
import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsStandalone(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Show prompt after a short delay regardless of native event (for discoverability)
    const timer = setTimeout(() => setShowPrompt(true), 2500);

    // For Android / Chrome
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    } else if (isIOS) {
      alert("Para instalar no iPhone:\n1. Toque no ícone de Compartilhar (quadrado com setinha para cima) no rodapé do Safari.\n2. Role para baixo e selecione 'Adicionar à Tela de Início'.");
    } else {
      alert("Para instalar no seu celular:\n1. Toque nos 3 pontinhos do navegador (canto superior direito).\n2. Selecione 'Instalar Aplicativo' ou 'Adicionar à Tela Inicial'.");
    }
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px', // Acima do bottom-nav do celular que tem uns 65px
      left: '16px',
      right: '16px',
      zIndex: 2147483647, // Max z-index
      background: '#ffffff',
      borderRadius: '16px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)',
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      animation: 'slideUp 0.5s ease-out forwards'
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <strong style={{ fontSize: '14px', fontWeight: 900, color: '#1e293b' }}>Instalar Aplicativo</strong>
        <span style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Acesso rápido e sem navegador</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          onClick={handleInstallClick}
          style={{
            background: '#2563eb',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 'bold',
            padding: '8px 16px',
            borderRadius: '12px',
            border: 'none',
            boxShadow: '0 4px 10px rgba(37,99,235,0.4)',
            cursor: 'pointer'
          }}
        >
          {deferredPrompt ? 'Instalar' : 'Como Instalar'}
        </button>
        <button onClick={() => setShowPrompt(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: '4px', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
