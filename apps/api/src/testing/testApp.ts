import request from 'supertest';
import { createApp } from '../app.js';
import { InMemoryUserRepository } from '../users/userRepository.js';

/**
 * App backed by an in-memory user store with two registered users, logged in
 * through the real auth endpoints. Ids match the mock data owners (alice = 1, bob = 2).
 */
export async function createTestApp() {
  const app = createApp(new InMemoryUserRepository());

  async function signUp(name: string, role: 'caregiver' | 'ot') {
    const email = `${name.toLowerCase()}@example.com`;
    const password = 'password123';
    await request(app).post('/api/auth/register').send({ name, email, password, role });
    const res = await request(app).post('/api/auth/login').send({ email, password });
    return { Authorization: `Bearer ${res.body.token as string}` };
  }

  const alice = await signUp('Alice', 'caregiver');
  const bob = await signUp('Bob', 'ot');
  return { app, alice, bob };
}