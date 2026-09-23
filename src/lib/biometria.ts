// Funções para gerenciar Passkeys / WebAuthn locais (App Lock)

function bufferToBase64url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (const charCode of bytes) {
        str += String.fromCharCode(charCode);
    }
    const base64String = btoa(str);
    return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
    const padding = '='.repeat((4 - base64url.length % 4) % 4);
    const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer;
}

export async function registrarBiometriaLocal(userId: string, userEmail: string): Promise<boolean> {
    if (!window.PublicKeyCredential) {
        alert("Seu navegador ou dispositivo não suporta biometria (WebAuthn).");
        return false;
    }

    try {
        const userIdBuffer = new TextEncoder().encode(userId);
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
            challenge: challenge,
            rp: {
                name: "FinanceAI ERP",
            },
            user: {
                id: userIdBuffer,
                name: userEmail,
                displayName: userEmail,
            },
            pubKeyCredParams: [
                { alg: -7, type: "public-key" }, // ES256
                { alg: -257, type: "public-key" } // RS256
            ],
            authenticatorSelection: {
                authenticatorAttachment: "platform", // Exige FaceID, TouchID, Windows Hello, etc. (Dispositivo local)
                userVerification: "required",
                requireResidentKey: false
            },
            timeout: 60000,
            attestation: "none"
        };

        const credential = await navigator.credentials.create({
            publicKey: publicKeyCredentialCreationOptions
        }) as PublicKeyCredential;

        if (credential) {
            const rawIdBase64 = bufferToBase64url(credential.rawId);
            localStorage.setItem('biometria_habilitada', 'true');
            localStorage.setItem('biometria_credential_id', rawIdBase64);
            return true;
        }
    } catch (err: any) {
        console.error("Erro ao registrar biometria:", err);
    }
    return false;
}

export async function verificarBiometriaLocal(): Promise<boolean> {
    if (!window.PublicKeyCredential) return false;
    
    const credentialIdStr = localStorage.getItem('biometria_credential_id');
    if (!credentialIdStr) return false;

    try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        
        const credentialIdBuffer = base64urlToBuffer(credentialIdStr);

        const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
            challenge: challenge,
            allowCredentials: [{
                id: credentialIdBuffer,
                type: 'public-key',
            }],
            userVerification: "required",
            timeout: 60000
        };

        const assertion = await navigator.credentials.get({
            publicKey: publicKeyCredentialRequestOptions
        });

        if (assertion) {
            return true;
        }
    } catch (err: any) {
        console.error("Erro ao verificar biometria:", err);
    }
    return false;
}

export function isBiometriaHabilitada(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('biometria_habilitada') === 'true';
}

export function desabilitarBiometria() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('biometria_habilitada');
    localStorage.removeItem('biometria_credential_id');
}
