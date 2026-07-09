import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../db/UserRepository.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'weighthelper-super-secret-key-2024';

router.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
    
    const existing = await UserRepository.findByUsername(username);
    if (existing) return res.status(400).json({ error: '用户名已存在' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await UserRepository.createUser(username, hashedPassword);
    
    const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, username });
  } catch (error) {
    console.error("注册失败:", error);
    res.status(500).json({ error: '注册失败' });
  }
});

router.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await UserRepository.findByUsername(username);
    if (!user) return res.status(400).json({ error: '用户名或密码错误' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: '用户名或密码错误' });
    
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, username: user.username });
  } catch (error) {
    console.error("登录失败:", error);
    res.status(500).json({ error: '登录失败' });
  }
});

export default router;
