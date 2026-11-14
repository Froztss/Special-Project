import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getDatabasePool } from '../db/pool.js';
import type { NewUser, PublicUser, Role, UserRepository, UserWithHash } from './userRepository.js';

interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  role: Role;
  password_hash: string | null;
}

const toPublic = (r: UserRow): PublicUser => ({ id: Number(r.id), name: r.name, email: r.email, role: r.role });

/** MySQL-backed users; parameterized queries only (NFR-SEC-02). */
export class MySqlUserRepository implements UserRepository {
  async insert(user: NewUser): Promise<PublicUser | null> {
    try {
      const [result] = await getDatabasePool().execute<ResultSetHeader>(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [user.name, user.email, user.passwordHash, user.role],
      );
      return { id: result.insertId, name: user.name, email: user.email, role: user.role };
    } catch (error) {
      if ((error as { code?: string }).code === 'ER_DUP_ENTRY') return null;
      throw error;
    }
  }

  async findByEmailWithHash(email: string): Promise<UserWithHash | null> {
    const [rows] = await getDatabasePool().execute<UserRow[]>(
      'SELECT id, name, email, role, password_hash FROM users WHERE email = ? LIMIT 1',
      [email],
    );
    const row = rows[0];
    // Seed users may have no password; they cannot log in.
    if (!row?.password_hash) return null;
    return { ...toPublic(row), passwordHash: row.password_hash };
  }

  async findById(id: number): Promise<PublicUser | null> {
    const [rows] = await getDatabasePool().execute<UserRow[]>(
      'SELECT id, name, email, role, password_hash FROM users WHERE id = ? LIMIT 1',
      [id],
    );
    return rows[0] ? toPublic(rows[0]) : null;
  }
}