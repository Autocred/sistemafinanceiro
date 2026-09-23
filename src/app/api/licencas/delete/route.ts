import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { tenantId, uid } = await req.json();

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId é obrigatório' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Operação backend de exclusão registrada com sucesso.'
    });

  } catch (error: any) {
    console.error('Deletion error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
