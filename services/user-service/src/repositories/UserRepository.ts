import { Pool } from 'pg';
import { User } from '../models/types';
import bcrypt from 'bcrypt';

export class UserRepository {
  constructor(private db: Pool) {}

  async create(userData: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    address?: string;
  }): Promise<User> {
    const passwordHash = await bcrypt.hash(userData.password, 10);
    
    const result = await this.db.query(
      `INSERT INTO users (email, password_hash, name, phone, address)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, phone, address, created_at, updated_at`,
      [userData.email, passwordHash, userData.name, userData.phone, userData.address]
    );

    return {
      ...result.rows[0],
      passwordHash,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.password_hash,
      name: user.name,
      phone: user.phone,
      address: user.address,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.password_hash,
      name: user.name,
      phone: user.phone,
      address: user.address,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async update(id: string, userData: {
    name?: string;
    phone?: string;
    address?: string;
  }): Promise<User | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (userData.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(userData.name);
    }
    if (userData.phone !== undefined) {
      fields.push(`phone = $${paramCount++}`);
      values.push(userData.phone);
    }
    if (userData.address !== undefined) {
      fields.push(`address = $${paramCount++}`);
      values.push(userData.address);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await this.db.query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING id, email, name, phone, address, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      passwordHash: '', // Don't return password hash
      name: user.name,
      phone: user.phone,
      address: user.address,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    return user;
  }
}
