'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ModuloLicencas() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/master');
  }, [router]);

  return (
    <div className="flex h-full items-center justify-center bg-[var(--bg-primary)] p-12">
      <div className="text-center space-y-6">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Redirecionando...</h2>
          <p className="text-[var(--text-secondary)] mt-2">
            O Painel de Licenças foi atualizado e migrado para uma área Master exclusiva. 
            <br />Aguarde enquanto redirecionamos você.
          </p>
        </div>
      </div>
    </div>
  );
}
