import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        password_hash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Chưa xác thực',
        role TEXT NOT NULL DEFAULT 'BỆNH NHÂN',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    
    // Add role column if it doesn't exist (handled gracefully)
    try {
      await client.query(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'BỆNH NHÂN';`);
    } catch (e) {
      // Ignore error if column already exists
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 1,
        last_attempt TEXT NOT NULL,
        blocked_until TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_appointments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        appointment_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        patient_code TEXT UNIQUE,
        name TEXT NOT NULL,
        gender TEXT,
        phone TEXT,
        address TEXT,
        dob TEXT,
        weight TEXT,
        height TEXT,
        temperature TEXT,
        parent_id TEXT REFERENCES users(id),
        created_at TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
        doctor_id TEXT,
        specialty TEXT,
        appointment_date TEXT NOT NULL,
        session TEXT,
        time_slot TEXT,
        reason TEXT,
        symptoms TEXT,
        notes TEXT,
        status TEXT DEFAULT 'Xác nhận',
        created_at TEXT NOT NULL
      );
    `);
  } finally {
    client.release();
  }
}

export interface UserRecord {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  password_hash: string;
  status: 'Chưa xác thực' | 'Đã xác thực' | 'Bị khóa';
  role: string;
  created_at: string;
  updated_at: string;
}

export interface TokenRecord {
  id: string;
  user_id: string;
  token: string;
  type: 'VERIFY_EMAIL' | 'RESET_PASSWORD';
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

// ----------------------------------------------------
// Database Operations
// ----------------------------------------------------

export async function getUserByEmail(email: string): Promise<UserRecord | undefined> {
  const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email.trim()]);
  return res.rows[0] as UserRecord | undefined;
}

export async function getUserByPhone(phone: string): Promise<UserRecord | undefined> {
  const res = await pool.query('SELECT * FROM users WHERE phone = $1 LIMIT 1', [phone.trim()]);
  return res.rows[0] as UserRecord | undefined;
}

export async function getUserById(id: string): Promise<UserRecord | undefined> {
  const res = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
  return res.rows[0] as UserRecord | undefined;
}

export async function createUser(user: {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  password_hash: string;
  status: string;
  role: string;
  created_at: string;
  updated_at: string;
}): Promise<UserRecord> {
  await pool.query(
    `INSERT INTO users (id, full_name, email, phone, password_hash, status, role, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      user.id,
      user.full_name,
      user.email.trim().toLowerCase(),
      user.phone,
      user.password_hash,
      user.status,
      user.role,
      user.created_at,
      user.updated_at
    ]
  );
  return (await getUserByEmail(user.email))!;
}

export async function updateUserStatus(userId: string, status: string): Promise<void> {
  await pool.query('UPDATE users SET status = $1, updated_at = $2 WHERE id = $3', [status, new Date().toISOString(), userId]);
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  await pool.query('UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3', [passwordHash, new Date().toISOString(), userId]);
}

export async function updateUserProfile(userId: string, fullName: string, phone: string): Promise<void> {
  await pool.query('UPDATE users SET full_name = $1, phone = $2, updated_at = $3 WHERE id = $4', [fullName, phone, new Date().toISOString(), userId]);
}

export async function createVerificationToken(data: {
  id: string;
  user_id: string;
  token: string;
  type: 'VERIFY_EMAIL' | 'RESET_PASSWORD';
  expires_at: string;
}): Promise<TokenRecord> {
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO verification_tokens (id, user_id, token, type, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [data.id, data.user_id, data.token, data.type, data.expires_at, now]
  );

  return {
    id: data.id,
    user_id: data.user_id,
    token: data.token,
    type: data.type,
    expires_at: data.expires_at,
    used_at: null,
    created_at: now,
  };
}

export async function getValidToken(token: string, type: 'VERIFY_EMAIL' | 'RESET_PASSWORD'): Promise<TokenRecord | undefined> {
  const res = await pool.query(
    `SELECT * FROM verification_tokens 
     WHERE token = $1 AND type = $2 AND used_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [token, type]
  );
  const record = res.rows[0] as TokenRecord | undefined;
  if (!record) return undefined;

  if (new Date(record.expires_at).getTime() < Date.now()) {
    return undefined;
  }
  return record;
}

export async function markTokenUsed(tokenId: string): Promise<void> {
  await pool.query('UPDATE verification_tokens SET used_at = $1 WHERE id = $2', [new Date().toISOString(), tokenId]);
}

export async function linkUserAppointment(userId: string, appointmentId: string): Promise<void> {
  await pool.query(
    `INSERT INTO user_appointments (id, user_id, appointment_id, created_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    [`${userId}_${appointmentId}`, userId, appointmentId, new Date().toISOString()]
  );
}

export async function getUserAppointmentIds(userId: string): Promise<string[]> {
  const res = await pool.query('SELECT appointment_id FROM user_appointments WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  return res.rows.map((r: any) => r.appointment_id);
}

// We expose the pool so admin route can use it directly
export function getDatabase() {
  return pool;
}
