import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function GET() {
  try {
    const pool = getDatabase();
    const res = await pool.query('SELECT * FROM patients ORDER BY created_at DESC');
    
    // Map to camelCase for the frontend
    const patients = res.rows.map(r => ({
      id: r.id,
      patientCode: r.patient_code,
      name: r.name,
      gender: r.gender,
      phone: r.phone,
      address: r.address,
      dob: r.dob,
      weight: r.weight,
      height: r.height,
      temperature: r.temperature,
      createdAt: r.created_at
    }));

    return NextResponse.json({ success: true, patients });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const pool = getDatabase();
    const body = await req.json();
    const { patient } = body;

    const res = await pool.query(
      `INSERT INTO patients (id, patient_code, name, gender, phone, address, dob, weight, height, temperature, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        patient.id,
        patient.id, // using id as patient_code if missing
        patient.name,
        patient.gender,
        patient.phone,
        patient.address,
        patient.dob,
        patient.weight || '',
        patient.height || '',
        patient.temperature || '',
        new Date().toISOString()
      ]
    );

    return NextResponse.json({ success: true, patient: res.rows[0] });
  } catch (error) {
    console.error('Error creating patient:', error);
    return NextResponse.json({ error: 'Failed to create patient' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const pool = getDatabase();
    const body = await req.json();
    const { id, updates } = body;

    const res = await pool.query(
      `UPDATE patients SET 
        name = $1, gender = $2, phone = $3, address = $4, dob = $5, weight = $6, height = $7, temperature = $8
       WHERE id = $9 RETURNING *`,
      [
        updates.name, updates.gender, updates.phone, updates.address, updates.dob,
        updates.weight, updates.height, updates.temperature, id
      ]
    );

    return NextResponse.json({ success: true, patient: res.rows[0] });
  } catch (error) {
    console.error('Error updating patient:', error);
    return NextResponse.json({ error: 'Failed to update patient' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const pool = getDatabase();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await pool.query('DELETE FROM patients WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting patient:', error);
    return NextResponse.json({ error: 'Failed to delete patient' }, { status: 500 });
  }
}
