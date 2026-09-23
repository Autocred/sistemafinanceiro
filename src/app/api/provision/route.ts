import { NextResponse } from 'next/server';

const API_KEY = "AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U";

export async function POST(req: Request) {
  try {
    const { tenantId, nome, email, password } = await req.json();

    let finalPassword = password;
    if (!finalPassword) {
      finalPassword = Math.random().toString(36).slice(-8); // Gerar senha aleatória de 8 caracteres
    }

    if (!tenantId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Criar Usuário não Firebase Auth via REST API
    const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: finalPassword,
        returnSecureToken: true
      })
    });

    const authData = await authRes.json();
    if (!authRes.ok) {
      throw new Error(authData.error?.message || 'Erro ao criar usuário');
    }

    const uid = authData.localId;

    // 2. Opcional: Atualizar Profile do Firebase Auth com Nome
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: authData.idToken,
        displayName: nome,
        returnSecureToken: false
      })
    });

    return NextResponse.json({ success: true, uid, password: finalPassword });

    // 4. Disparar o e-mail via EmailJS REST API
    const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || "service_id_placeholder";
    const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || "template_id_placeholder";
    const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || "public_key_placeholder";
    const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY || "";

    const templateParams = {
      nome: nome,
      email: email,
      password: password,
      link: "https://sistemafinanceiropessoal.vercel.app/"
    };

    try {
      const emailRes = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          accessToken: EMAILJS_PRIVATE_KEY,
          template_params: templateParams
        })
      });

      if (!emailRes.ok) {
        console.error("Erro ao enviar e-mail pelo EmailJS:", await emailRes.text());
      }
    } catch (e) {
      console.error("Exceção ao disparar e-mail:", e);
    }

    return NextResponse.json({ success: true, uid });
  } catch (error: any) {
    console.error('Provisioning error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
