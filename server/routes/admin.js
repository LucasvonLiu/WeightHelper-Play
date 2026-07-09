import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../db/UserRepository.js';
import { MealRepository } from '../db/MealRepository.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'weighthelper-super-secret-key-2024';

router.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await UserRepository.findAdminByUsername(username);
    if (!admin) return res.status(400).json({ error: '用户名或密码错误' });
    
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ error: '用户名或密码错误' });
    
    const token = jwt.sign({ adminId: admin.id, username: admin.username, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, username: admin.username });
  } catch (error) {
    res.status(500).json({ error: '登录失败' });
  }
});

router.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const usersCount = await UserRepository.getUsersCount();
    const mealsCount = await MealRepository.getAllMealsCount();
    const tokensTotal = await UserRepository.getUsersTotalTokens();
    res.json({
      totalUsers: usersCount,
      totalMeals: mealsCount,
      totalTokens: tokensTotal
    });
  } catch (err) { 
    res.status(500).json({ error: '获取大盘数据失败' }); 
  }
});

router.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const users = await UserRepository.getAllUsers();
    res.json(users);
  } catch(err) { 
    res.status(500).json({ error: '获取用户失败' }); 
  }
});

router.delete('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await UserRepository.deleteUser(id);
    res.json({ success: true });
  } catch(err) { 
    res.status(500).json({ error: '删除用户失败' }); 
  }
});

router.get('/api/admin/meals', authenticateAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const meals = await MealRepository.getMealsWithUsernames(limit, offset);
    const totalCount = await MealRepository.getAllMealsCount();
    
    res.json({ data: meals, total: totalCount, page, limit });
  } catch(err) { 
    res.status(500).json({ error: '获取记录失败' }); 
  }
});

router.delete('/api/admin/meals/:id', authenticateAdmin, async (req, res) => {
  try {
    await MealRepository.deleteMealById(req.params.id);
    res.json({ success: true });
  } catch(err) { 
    res.status(500).json({ error: '删除记录失败' }); 
  }
});

export default router;
