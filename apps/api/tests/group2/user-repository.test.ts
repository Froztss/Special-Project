import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { RowDataPacket } from 'mysql2/promise';
import { getDatabasePool } from '../../src/db/pool.js';
import { InMemoryUserRepository } from '../../src/users/userRepository.js';
import { MySqlUserRepository } from '../../src/users/mysqlUserRepository.js';
import { applySchema, resetDb } from '../helpers/db.js';

// TDD spec for task 2.1: the user data-access boundary. Only findByEmailWithHash
// exposes the hash (for credential checks); insert/findById never leak it.

const newUser = {
  name: 'Alice Caregiver',
  email: 'alice@example.com',
  passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
  role: 'caregiver',
} as const;

describe('2.1 user data access', () => {
  describe('InMemoryUserRepository', () => {
    it('insert returns a public user without the hash and assigns an id', async () => {
      const repo = new InMemoryUserRepository();
      const user = await repo.insert({ ...newUser });
      expect(user).toEqual({ id: 1, name: newUser.name, email: newUser.email, role: newUser.role });
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('insert returns null for a duplicate email', async () => {
      const repo = new InMemoryUserRepository();
      await repo.insert({ ...newUser });
      expect(await repo.insert({ ...newUser, name: 'Other' })).toBeNull();
    });

    it('findByEmailWithHash exposes the hash for credential checks', async () => {
      const repo = new InMemoryUserRepository();
      await repo.insert({ ...newUser });
      const row = await repo.findByEmailWithHash(newUser.email);
      expect(row?.passwordHash).toBe(newUser.passwordHash);
      expect(await repo.findByEmailWithHash('nobody@example.com')).toBeNull();
    });

    it('findById returns a public user without the hash', async () => {
      const repo = new InMemoryUserRepository();
      const user = await repo.insert({ ...newUser });
      const found = await repo.findById(user!.id);
      expect(found).toEqual({ id: user!.id, name: newUser.name, email: newUser.email, role: newUser.role });
      expect(found).not.toHaveProperty('passwordHash');
      expect(await repo.findById(999999)).toBeNull();
    });
  });

  describe('MySqlUserRepository', () => {
    beforeAll(() => {
      applySchema();
    });

    beforeEach(async () => {
      await resetDb();
    });

    it('insert persists the user and returns a public user', async () => {
      const repo = new MySqlUserRepository();
      const user = await repo.insert({ ...newUser });
      expect(user).toMatchObject({ name: newUser.name, email: newUser.email, role: newUser.role });
      expect(user!.id).toBeGreaterThan(0);
      expect(user).not.toHaveProperty('passwordHash');

      const [rows] = await getDatabasePool().query<RowDataPacket[]>(
        'SELECT password_hash FROM users WHERE id = ?',
        [user!.id],
      );
      expect(rows[0]?.password_hash).toBe(newUser.passwordHash);
    });

    it('insert returns null on duplicate email instead of throwing', async () => {
      const repo = new MySqlUserRepository();
      await repo.insert({ ...newUser });
      expect(await repo.insert({ ...newUser, name: 'Other' })).toBeNull();
    });

    it('findByEmailWithHash returns the hash, and null for a passwordless seed user', async () => {
      const repo = new MySqlUserRepository();
      await repo.insert({ ...newUser });
      const row = await repo.findByEmailWithHash(newUser.email);
      expect(row?.passwordHash).toBe(newUser.passwordHash);

      await getDatabasePool().query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ('Seed', 'seed@example.com', NULL, 'ot')",
      );
      expect(await repo.findByEmailWithHash('seed@example.com')).toBeNull();
      expect(await repo.findByEmailWithHash('ghost@example.com')).toBeNull();
    });

    it('findById returns a public user without the hash', async () => {
      const repo = new MySqlUserRepository();
      const user = await repo.insert({ ...newUser });
      const found = await repo.findById(user!.id);
      expect(found).toMatchObject({ id: user!.id, name: newUser.name, email: newUser.email, role: newUser.role });
      expect(found).not.toHaveProperty('passwordHash');
      expect(await repo.findById(999999)).toBeNull();
    });

    it('uses parameterized queries so SQL metacharacters are stored literally', async () => {
      const repo = new MySqlUserRepository();
      const tricky = { ...newUser, name: "O'Brien'); DROP TABLE users;--", email: 'tricky@example.com' };
      const user = await repo.insert(tricky);
      const found = await repo.findById(user!.id);
      expect(found?.name).toBe(tricky.name);
      const [rows] = await getDatabasePool().query<RowDataPacket[]>('SELECT COUNT(*) AS n FROM users');
      expect(Number(rows[0]?.n)).toBe(1);
    });
  });
});