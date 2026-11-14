export type Role = 'caregiver' | 'ot' | 'sped_teacher';

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface UserWithHash extends PublicUser {
  passwordHash: string;
}

export interface NewUser {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
}

/**
 * Data-access boundary for users (§7.3). Only `findByEmailWithHash` exposes the
 * hash, and only for credential checks. A MySQL implementation (parameterized
 * queries, NFR-SEC-02) will replace the in-memory one without touching callers.
 */
export interface UserRepository {
  /** Returns null if the email is already registered. */
  insert(user: NewUser): Promise<PublicUser | null>;
  findByEmailWithHash(email: string): Promise<UserWithHash | null>;
  findById(id: number): Promise<PublicUser | null>;
  updateName(id: number, name: string): Promise<PublicUser | null>;
}

export class InMemoryUserRepository implements UserRepository {
  private users: UserWithHash[] = [];
  private nextId = 1;

  async insert(user: NewUser): Promise<PublicUser | null> {
    if (this.users.some((u) => u.email === user.email)) return null;
    const row: UserWithHash = { id: this.nextId++, ...user };
    this.users.push(row);
    return toPublic(row);
  }

  async findByEmailWithHash(email: string): Promise<UserWithHash | null> {
    return this.users.find((u) => u.email === email) ?? null;
  }

  async findById(id: number): Promise<PublicUser | null> {
    const row = this.users.find((u) => u.id === id);
    return row ? toPublic(row) : null;
  }

  async updateName(id: number, name: string): Promise<PublicUser | null> {
    const user = this.users.find((row) => row.id === id);
    if (!user) return null;
    user.name = name;
    return toPublic(user);
  }
}

function toPublic({ id, name, email, role }: UserWithHash): PublicUser {
  return { id, name, email, role };
}