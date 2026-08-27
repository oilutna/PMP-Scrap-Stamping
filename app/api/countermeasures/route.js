import { NextResponse } from 'next/server';
import { addCountermeasure, getCountermeasures, updateCountermeasure } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ data: await getCountermeasures() });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.week || !body.department || !body.cause || !body.problem || !body.action || !body.owner) {
      return NextResponse.json({ error: 'Semana, departamento, causa, problema, contramedida y responsable son obligatorios.' }, { status: 400 });
    }
    return NextResponse.json({ data: await addCountermeasure(body) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'Falta el ID del registro.' }, { status: 400 });
    return NextResponse.json({ data: await updateCountermeasure(body.id, body) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

