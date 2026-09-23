import { NextResponse } from 'next/server';

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U";

export async function POST(req: Request) {
  try {
    const { username, nome, emailDeComunicacao, password, tenantId } = await req.json();

    if (!username || !nome) {
      return NextResponse.json({ error: 'Campos obrigatórios: username, nome' }, { status: 400 });
    }

    const usernameLower = username.trim().toLowerCase().replace(/\s+/g, '');
    
    // Usa a senha fornecida (mínimo 6 dígitos no firebase) ou gera uma de 8 dígitos
    const initialPassword = password || Math.floor(10000000 + Math.random() * 90000000).toString();

    // O E-mail do Firebase Auth será um e-mail sintético baseado não username e não domínio.
    // Assim garantimos login por username sem expor o e-mail real e sem conflitos.
    const syntheticAuthEmail = `${usernameLower}@financeai.app`;

    // 1. Criar Usuário não Firebase Auth via REST API
    const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: syntheticAuthEmail,
        password: initialPassword,
        returnSecureToken: true
      })
    });

    const authData = await authRes.json();
    if (!authRes.ok) {
      // Tratar erro de username duplicado (email duplicado)
      if (authData.error?.message === 'EMAIL_EXISTS') {
         return NextResponse.json({ error: 'Username já está em uso.' }, { status: 400 });
      }
      throw new Error(authData.error?.message || 'Erro ao criar usuário');
    }

    const uid = authData.localId;

    // 2. Atualizar Profile do Firebase Auth com Nome
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: authData.idToken,
        displayName: nome,
        returnSecureToken: false
      })
    });

    // 3. Opcional: E-mail de notificação (Se EmailJS estiver configurado)
    // Aqui nós usamos o E-mail de Comunicação real do usuário.
    if (emailDeComunicacao) {
      const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
      const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
      const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;
      const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;
  
      if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
        try {
          await fetch("https://api.emailjs.com/api/v1.0/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              service_id: EMAILJS_SERVICE_ID,
              template_id: EMAILJS_TEMPLATE_ID,
              user_id: EMAILJS_PUBLIC_KEY,
              accessToken: EMAILJS_PRIVATE_KEY,
              template_params: {
                nome: nome,
                email: emailDeComunicacao,
                username: usernameLower,
                password: initialPassword,
                link: `https://sistemafinanceiropessoal.vercel.app/?tenant=${tenantId || usernameLower}`
              }
            })
          });
        } catch (e) {
          console.error("Erro não envio de e-mail:", e);
        }
      }
    }

    // Retorna Sucesso com o UID e a Senha Gerada (O frontend exibirá a senha para o Master copiar)
    return NextResponse.json({ 
      success: true, 
      uid, 
      password: initialPassword,
      authEmail: syntheticAuthEmail 
    });

  } catch (error: any) {
    console.error('Provisioning error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
