import express from 'express';
import moment from 'moment-timezone';
import { MealRepository } from '../db/MealRepository.js';
import { UserRepository } from '../db/UserRepository.js';
import { FeedbackRepository } from '../db/FeedbackRepository.js';
import { authenticateToken } from '../middleware/auth.js';
import { AIService } from '../services/aiService.js';
import { R2Service } from '../services/r2Service.js';
import { SupabaseService } from '../services/supabaseService.js';

const router = express.Router();

// --- 历史记录接口 ---
router.post('/api/meals', authenticateToken, async (req, res) => {
  try {
    const { foodName, calories, protein, carbs, fats, image, details } = req.body;
    const userId = req.user.userId;
    if (!foodName || calories === undefined) {
      return res.status(400).json({ error: "缺少必要字段" });
    }

    // 条件式多源对象存储上传 (优先级：Supabase -> Cloudflare R2 -> 本地 Base64 降级)
    let finalImageUrl = image || '';
    if (image && image.startsWith('data:')) {
      if (SupabaseService.isEnabled()) {
        try {
          finalImageUrl = await SupabaseService.uploadBase64Image(image);
        } catch (uploadErr) {
          console.error("图片上传到 Supabase 失败，将降级尝试 R2 / 直存:", uploadErr);
        }
      }
      
      if (finalImageUrl.startsWith('data:') && R2Service.isEnabled()) {
        try {
          finalImageUrl = await R2Service.uploadBase64Image(image);
        } catch (uploadErr) {
          console.error("图片上传到 Cloudflare R2 失败，降级直存 Base64:", uploadErr);
        }
      }
    }

    const id = await MealRepository.createMeal({
      userId,
      foodName,
      calories,
      protein,
      carbs,
      fats,
      image: finalImageUrl,
      details
    });
    res.json({ id, success: true });
  } catch (error) {
    console.error("保存记录失败:", error);
    res.status(500).json({ error: "保存失败" });
  }
});

router.get('/api/meals', authenticateToken, async (req, res) => {
  try {
    const tz = req.query.tz || 'Asia/Shanghai';
    const targetDate = req.query.date || moment().tz(tz).format('YYYY-MM-DD');
    const userId = req.user.userId;

    const startUtc = moment.tz(targetDate, tz).startOf('day').utc().format('YYYY-MM-DD HH:mm:ss');
    const endUtc = moment.tz(targetDate, tz).endOf('day').utc().format('YYYY-MM-DD HH:mm:ss');

    const meals = await MealRepository.getMealsByDateRange(userId, startUtc, endUtc);
    
    const totals = meals.reduce((acc, meal) => {
      acc.calories += meal.calories || 0;
      acc.protein += meal.protein || 0;
      acc.carbs += meal.carbs || 0;
      acc.fats += meal.fats || 0;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

    res.json({ meals, totals });
  } catch (error) {
    console.error("获取记录失败:", error);
    res.status(500).json({ error: "获取记录失败" });
  }
});

// 获取某月有记录的日期列表
router.get('/api/meals/dates', authenticateToken, async (req, res) => {
  try {
    const tz = req.query.tz || 'Asia/Shanghai';
    const month = req.query.month || moment().tz(tz).format('YYYY-MM'); // e.g. "2025-06"
    const userId = req.user.userId;

    const startUtc = moment.tz(`${month}-01`, tz).startOf('month').utc().format('YYYY-MM-DD HH:mm:ss');
    const endUtc   = moment.tz(`${month}-01`, tz).endOf('month').utc().format('YYYY-MM-DD HH:mm:ss');

    const rows = await MealRepository.getLoggedDates(userId, startUtc, endUtc);
    const dates = [...new Set(rows.map(r => moment.utc(r.createdAt).tz(tz).format('YYYY-MM-DD')))];
    res.json({ dates });
  } catch (error) {
    console.error("获取日期列表失败:", error);
    res.status(500).json({ error: "获取日期列表失败" });
  }
});

// 导出全部记录为 CSV
router.get('/api/meals/export/csv', authenticateToken, async (req, res) => {
  try {
    const tz = req.query.tz || 'Asia/Shanghai';
    const userId = req.user.userId;

    const rows = await MealRepository.getAllMealsForUser(userId);

    const header = '日期,食物,热量(kcal),蛋白质(g),碳水(g),脂肪(g)';
    const lines = rows.map(r => {
      const dateStr = moment.utc(r.createdAt).tz(tz).format('YYYY-MM-DD HH:mm');
      return `${dateStr},${r.foodName},${r.calories},${r.protein},${r.carbs},${r.fats}`;
    });
    const csv = [header, ...lines].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="WeightHelper_${moment().tz(tz).format('YYYYMMDD')}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error("导出CSV失败:", error);
    res.status(500).json({ error: "导出失败" });
  }
});

// 修改记录接口
router.put('/api/meals/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { calories, protein, carbs, fats, details } = req.body;
    
    await MealRepository.updateMeal(id, userId, { calories, protein, carbs, fats, details });
    res.json({ success: true });
  } catch (error) {
    console.error("更新记录失败:", error);
    res.status(500).json({ error: "更新失败" });
  }
});

// 删除记录接口
router.delete('/api/meals/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // 获取现有饮食记录以核对图片
    const meal = await MealRepository.findById(id);
    if (meal && meal.image) {
      // 级联物理删除云端文件 (根据 URL 特征匹配对应的适配器)
      if (SupabaseService.isEnabled()) {
        await SupabaseService.deleteImage(meal.image);
      }
      if (R2Service.isEnabled()) {
        await R2Service.deleteImage(meal.image);
      }
    }

    await MealRepository.deleteMeal(id, userId);
    res.json({ success: true });
  } catch (error) {
    console.error("删除记录失败:", error);
    res.status(500).json({ error: "删除失败" });
  }
});

// AI 食物识别基础名称
router.post('/api/recognize_basic', authenticateToken, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "图片数据缺失" });

    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return res.status(400).json({ error: "图片格式有误，必须为 Base64" });
    const mimeType = match[1];
    const base64Data = match[2];

    const { data, tokens } = await AIService.recognizeBasicFood(base64Data, mimeType);

    if (tokens > 0) {
      await UserRepository.updateTokenUsage(req.user.userId, tokens);
    }

    res.json(data);
  } catch (error) {
    console.error("识别基础信息失败:", error);
    res.status(500).json({ error: "识别失败" });
  }
});

// AI 营养素详细分析
router.post('/api/analyze', authenticateToken, async (req, res) => {
  try {
    const { image, foodName, quantity, unit } = req.body;
    if (!image) {
      return res.status(400).json({ error: "图片数据缺失" });
    }

    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: "图片格式有误，必须为 Base64" });
    }
    const mimeType = match[1];
    const base64Data = match[2];

    const { foods, tokens } = await AIService.analyzeNutrition(base64Data, mimeType, { foodName, quantity, unit });

    if (tokens > 0) {
      await UserRepository.updateTokenUsage(req.user.userId, tokens);
    }

    res.json({ foods });
  } catch (error) {
    console.error("AI 分析失败:", error);
    res.status(500).json({ error: "AI 分析失败，可能是配额已耗尽或图片有误。" });
  }
});

// AI 营养点评
router.post('/api/coach', authenticateToken, async (req, res) => {
  try {
    const { meals, totals, goal } = req.body;
    const username = req.user.username;
    if (!meals || !totals || !goal) {
      return res.status(400).json({ error: "缺少必要数据" });
    }

    const { advice, tokens } = await AIService.getNutritionAdvice(username, meals, totals, goal);
    
    if (tokens > 0) {
      await UserRepository.updateTokenUsage(req.user.userId, tokens);
    }

    res.json({ advice, tokensUsedThisRequest: tokens });
  } catch (error) {
    console.error("获取点评失败:", error);
    res.status(500).json({ error: "获取点评失败" });
  }
});

// 提交对单条卡路里记录的反馈 (评价或纠偏)
router.post('/api/meals/:id/feedback', authenticateToken, async (req, res) => {
  try {
    const mealId = req.params.id;
    const userId = req.user.userId;
    const { rating, comment, originalCalories, correctedCalories } = req.body;

    // 校验该记录确实属于当前用户
    const meal = await MealRepository.findById(mealId);
    if (!meal || meal.userId !== userId) {
      return res.status(403).json({ error: "权限不足" });
    }

    await FeedbackRepository.saveFeedback({
      mealId,
      userId,
      rating,
      comment,
      originalCalories,
      correctedCalories
    });

    res.json({ success: true });
  } catch (error) {
    console.error("提交反馈失败:", error);
    res.status(500).json({ error: "提交反馈失败" });
  }
});

// 获取某条记录的已有反馈
router.get('/api/meals/:id/feedback', authenticateToken, async (req, res) => {
  try {
    const mealId = req.params.id;
    const userId = req.user.userId;

    const feedback = await FeedbackRepository.getFeedbackForMeal(mealId, userId);
    res.json(feedback || { rating: 0, comment: '', originalCalories: null, correctedCalories: null });
  } catch (error) {
    console.error("获取反馈失败:", error);
    res.status(500).json({ error: "获取反馈失败" });
  }
});

export default router;
