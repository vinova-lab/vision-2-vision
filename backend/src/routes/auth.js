import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../db/connection.js';

const router = Router();

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

router.post('/login', (req, res) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message } });
    }
    const { email, password } = parsed.data;
    const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email.toLowerCase().trim());

    if (!admin) {
      bcrypt.compareSync(password, '$2b$10$invalidhashfortiminprotection00000000000000');
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    const valid = bcrypt.compareSync(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
  } catch (err) {
    console.error('[Auth]', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Login failed' } });
  }
});

router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No token provided' } });
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    const admin = db.prepare('SELECT id, email, name, role FROM admins WHERE id = ?').get(decoded.id);
    if (!admin) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Admin not found' } });
    res.json({ admin });
  } catch {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token invalid or expired' } });
  }
});

export default router;
