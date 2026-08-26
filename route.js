import { NextResponse } from 'next/server';
import { getScrapData } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getScrapData();
    return NextResponse.json({ data, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Error leyendo Google Sheets:', error);
    return NextResponse.json(
      { error: error.message || 'No se pudo leer la hoja de cálculo' },
      { status: 500 }
    );
  }
}
