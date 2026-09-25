import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenant = searchParams.get('tenant');

  const defaultManifest = {
    name: "Sistema Financeiro ERP",
    short_name: "Financeiro",
    description: "Sistema Financeiro Pessoal ERP",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0a0a",
    theme_color: "#cc092f",
    orientation: "any",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      }
    ],
    lang: "pt-BR"
  };

  if (!tenant || !db) {
    return new NextResponse(JSON.stringify(defaultManifest), {
      headers: {
        'Content-Type': 'application/manifest+json; charset=utf-8'
      }
    });
  }

  try {
    // Buscar configurações do tenant para pegar nomeSistema e fotoPerfil
    const configSnap = await db.doc(`tenants/${tenant}/config/geral`).get();
    let nomeSistema = "Sistema Financeiro ERP";
    let fotoPerfil = null;

    if (configSnap.exists) {
      const data = configSnap.data();
      if (data?.nomeSistema) nomeSistema = data.nomeSistema;
      if (data?.fotoPerfil) fotoPerfil = data.fotoPerfil;
    } else {
      // Tentar pegar o nome fantasia do master
      const licencaSnap = await db.doc(`admin_master_licencas/${tenant}`).get();
      if (licencaSnap.exists) {
        const licData = licencaSnap.data();
        if (licData?.nomeFantasia) nomeSistema = licData.nomeFantasia;
      }
    }

    const manifest = {
      ...defaultManifest,
      name: nomeSistema,
      short_name: nomeSistema.split(' ')[0], // Primeiro nome
      start_url: `/?tenant=${tenant}`,
      id: `/?tenant=${tenant}`,
      icons: fotoPerfil ? [
        {
          src: fotoPerfil, // Base64 ou URL do Firebase Storage da foto
          sizes: "192x192",
          purpose: "any"
        },
        {
          src: fotoPerfil,
          sizes: "512x512",
          purpose: "any"
        },
        ...defaultManifest.icons
      ] : defaultManifest.icons
    };

    return new NextResponse(JSON.stringify(manifest), {
      headers: {
        'Content-Type': 'application/manifest+json; charset=utf-8'
      }
    });
  } catch (err) {
    console.error('Erro ao gerar manifest dinâmico:', err);
    return new NextResponse(JSON.stringify(defaultManifest), {
      headers: {
        'Content-Type': 'application/manifest+json; charset=utf-8'
      }
    });
  }
}
