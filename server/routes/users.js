import express from 'express';
import { UserRepository } from '../db/UserRepository.js';
import { authenticateToken } from '../middleware/auth.js';
// 从独立的 AI 服务中引入模型状态
import { getCurrentModel } from '../services/aiService.js';

const router = express.Router();

router.get('/api/user/status', authenticateToken, async (req, res) => {
  try {
    const user = await UserRepository.findById(req.user.userId);
    res.json({ 
      model: getCurrentModel(), 
      totalTokensUsed: user?.totalTokensUsed || 0 
    });
  } catch (error) {
    res.status(500).json({ error: "获取状态失败" });
  }
});

router.get('/api/user/preferences', authenticateToken, async (req, res) => {
  try {
    const user = await UserRepository.findById(req.user.userId);
    res.json({ 
      goal: user?.goal || 2000, 
      timezone: user?.timezone || 'Asia/Shanghai' 
    });
  } catch (error) {
    console.error('获取设置失败:', error);
    res.status(500).json({ error: "获取设置失败" });
  }
});

router.put('/api/user/preferences', authenticateToken, async (req, res) => {
  try {
    const { goal, timezone } = req.body;
    await UserRepository.updatePreferences(req.user.userId, goal, timezone);
    res.json({ success: true });
  } catch (error) {
    console.error('保存设置失败:', error);
    res.status(500).json({ error: "保存设置失败" });
  }
});

// 用户自注销账号接口 (合规性功能)
router.delete('/api/user/account', authenticateToken, async (req, res) => {
  try {
    await UserRepository.deleteUser(req.user.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('注销账户失败:', error);
    res.status(500).json({ error: "注销账户失败" });
  }
});

export default router;
