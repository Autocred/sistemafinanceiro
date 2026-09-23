import type { Metadata, Viewport } from 'next';
import './globals.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Sistema Financeiro ERP Pro — Padrão Bancário Premium',
  description: 'Gerencie suas finanças com inteligência artificial, extrato bancário oficial, relatórios em PDF e padrão ERP Premium.',
  keywords: 'finanças pessoais, controle financeiro, inteligência artificial, gestão de despesas, erp financeiro',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Financeiro ERP',
  },
  icons: {
    icon: '/icon-192.png?v=10',
    shortcut: '/favicon.png?v=10',
    apple: '/apple-touch-icon.png?v=10',
  }
};

export const viewport: Viewport = {
  themeColor: '#cc092f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

import { TenantProvider } from '@/components/TenantProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var p = localStorage.getItem('saved_primary_color');
                var s = localStorage.getItem('saved_secondary_color');
                var a = localStorage.getItem('saved_accent_color');
                if (p) {
                  document.documentElement.style.setProperty('--primary', p);
                  document.documentElement.style.setProperty('--primary-hover', p);
                  document.documentElement.style.setProperty('--primary-dark', s || p);
                  let meta = document.querySelector('meta[name="theme-color"]');
                  if (meta) meta.setAttribute('content', p);
                  else {
                    meta = document.createElement('meta');
                    meta.setAttribute('name', 'theme-color');
                    meta.setAttribute('content', p);
                    document.head.appendChild(meta);
                  }
                }
                if (a) {
                  document.documentElement.style.setProperty('--blue', a);
                }
              } catch(e) {}
            `
          }}
        />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta httpEquiv="Cache-Control" content="não-cache, não-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="não-cache" />
        <meta httpEquiv="Expires" content="0" />
        <link rel="icon" href="/favicon.png?v=10" type="image/png" />
        <link rel="icon" href="/icon-192.png?v=10" sizes="192x192" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=10" />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var t = localStorage.getItem('theme_preference') || 'light';
              document.documentElement.setAttribute('data-theme', t);
            } catch(e){}
            
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(registration) {
                  console.log('ServiceWorker registration successful with scope: ', registration.scope);
                }, function(err) {
                  console.log('ServiceWorker registration failed: ', err);
                });
              });
            }
          })();
        ` }} />
      </head>
      <body suppressHydrationWarning>
        <TenantProvider>
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}
