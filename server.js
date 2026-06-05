import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import moment from 'moment-timezone';
import nutritionDB from './nutritionDB.js';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 使用相对于 server.js 的绝对路径加载 .env 文件
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
// 允许接收大体积的 base64 图片数据
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// 静态托管前端打包后的文件 (生产环境)
app.use(express.static(path.join(__dirname, 'dist')));

const PORT = process.env.PORT || 3000;

// 初始化 Gemini SDK
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("⚠️ 警告: 未在 .env 文件中检测到 GEMINI_API_KEY，接口调用将会失败。");
}
const genAI = new GoogleGenerativeAI(apiKey || 'DUMMY_KEY');

const JWT_SECRET = process.env.JWT_SECRET || 'weighthelper-super-secret-key-2024';

const isPostgres = !!process.env.DATABASE_URL;
let db;
let pgPool;

(async () => {
  try {
    if (isPostgres) {
      console.log("☁️  检测到 DATABASE_URL，正在连接 PostgreSQL 云数据库...");
      pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password TEXT NOT NULL,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          totalTokensUsed INTEGER DEFAULT 0
        )
      `);
      
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS meals (
          id SERIAL PRIMARY KEY,
          userId INTEGER,
          foodName VARCHAR(255),
          calories INTEGER,
          protein INTEGER,
          carbs INTEGER,
          fats INTEGER,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // 尝试添加新列 (容错处理)
      try { await pgPool.query(`ALTER TABLE users ADD COLUMN totalTokensUsed INTEGER DEFAULT 0`); } catch (e) {}
      try { await pgPool.query(`ALTER TABLE users ADD COLUMN goal INTEGER DEFAULT 2000`); } catch (e) {}
      try { await pgPool.query(`ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'Asia/Shanghai'`); } catch (e) {}
      try { await pgPool.query(`ALTER TABLE meals ADD COLUMN image TEXT`); } catch (e) {}
      try { await pgPool.query(`ALTER TABLE meals ADD COLUMN details TEXT`); } catch (e) {}
      
      console.log("✅ PostgreSQL 云数据库初始化成功");
    } else {
      console.log("💾 未配置 DATABASE_URL，正在连接本地 SQLite 数据库...");
      db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
      });
      
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await db.exec(`
        CREATE TABLE IF NOT EXISTS meals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          foodName TEXT,
          calories INTEGER,
          protein INTEGER,
          carbs INTEGER,
          fats INTEGER,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      try { await db.exec(`ALTER TABLE meals ADD COLUMN userId INTEGER`); } catch (e) {}
      try { await db.exec(`ALTER TABLE users ADD COLUMN totalTokensUsed INTEGER DEFAULT 0`); } catch (e) {}
      try { await db.exec(`ALTER TABLE users ADD COLUMN goal INTEGER DEFAULT 2000`); } catch (e) {}
      try { await db.exec(`ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'Asia/Shanghai'`); } catch (e) {}
      try { await db.exec(`ALTER TABLE meals ADD COLUMN image TEXT`); } catch (e) {}
      try { await db.exec(`ALTER TABLE meals ADD COLUMN details TEXT`); } catch (e) {}

      console.log("✅ SQLite 本地数据库初始化成功");
    }
  } catch (err) {
    console.error("❌ 数据库初始化失败:", err);
  }
})();

// --- 数据库适配器函数 ---
async function dbRun(query, params = []) {
  if (isPostgres) {
    let i = 1;
    return pgPool.query(query.replace(/\?/g, () => `$${i++}`), params);
  } else {
    return db.run(query, params);
  }
}

async function dbGet(query, params = []) {
  if (isPostgres) {
    let i = 1;
    const res = await pgPool.query(query.replace(/\?/g, () => `$${i++}`), params);
    return res.rows[0];
  } else {
    return db.get(query, params);
  }
}

async function dbInsertAndGetId(query, params = []) {
  if (isPostgres) {
    let i = 1;
    const pgQuery = query.replace(/\?/g, () => `$${i++}`) + ' RETURNING id';
    const res = await pgPool.query(pgQuery, params);
    return res.rows[0].id;
  } else {
    const result = await db.run(query, params);
    return result.lastID;
  }
}


// --- 鉴权中间件 ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (token == null) return res.status(401).json({ error: '请先登录' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: '登录态失效，请重新登录' });
    req.user = user;
    next();
  });
};

const FALLBACK_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.0-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
];
let currentModelIndex = 0;

async function generateWithFallback(config) {
  let attemptCount = 0;
  while (attemptCount < FALLBACK_MODELS.length) {
    const modelName = FALLBACK_MODELS[currentModelIndex];
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(config);
      return { result, modelName };
    } catch (error) {
      const errorStr = String(error).toLowerCase() + String(error.message || '').toLowerCase();
      // 判断是否是配额不足(429)或者模型不存在(404)
      if (
        error?.status === 429 || error?.status === 404 ||
        errorStr.includes('429') || errorStr.includes('quota') ||
        errorStr.includes('404') || errorStr.includes('not found')
      ) {
        console.warn(`⚠️ 模型 ${modelName} 失败 (429/404). 自动降级重试...`);
        currentModelIndex = (currentModelIndex + 1) % FALLBACK_MODELS.length;
        attemptCount++;
      } else {
        throw error; // 其他未知错误，直接抛出
      }
    }
  }
  throw new Error("所有备选 AI 模型均已耗尽配额或不可用。");
}

app.post('/api/recognize_basic', authenticateToken, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "图片数据缺失" });

    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return res.status(400).json({ error: "图片格式有误，必须为 Base64" });
    const mimeType = match[1];
    const base64Data = match[2];

    const prompt = `请识别图中的主体食物。返回JSON格式：{"name": "食物名(简短)", "quantity": 数量(必须是纯数字, 默认1), "unit": "单位(如: 碗/个/盘/克)"}`;

    const { result } = await generateWithFallback({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { data: base64Data, mimeType: mimeType } }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });

    const responseText = result.response.text();
    const basicInfo = JSON.parse(responseText);

    const tokens = result.response.usageMetadata?.totalTokenCount || 0;
    if (tokens > 0) {
      await dbRun('UPDATE users SET totalTokensUsed = totalTokensUsed + ? WHERE id = ?', [tokens, req.user.userId]);
    }

    res.json(basicInfo);
  } catch (error) {
    console.error("AI 粗粒度识别失败:", error);
    res.status(500).json({ error: "AI 粗粒度识别失败" });
  }
});

app.post('/api/analyze', authenticateToken, async (req, res) => {
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

    const prompt = `
      你需要像专业营养师和大厨一样，分析图中的食物。
      ${foodName ? `用户已经明确了其中包含【${quantity} ${unit}】的【${foodName}】。请以此为重要参考！` : ''}
      
      核心指令：
      1. 识别图中有几个餐具/容器，餐具的数量或块数决定了这堆食物一共有几份。🚨注意：如果图中有3块牛脊骨或一袋8片吐司，那么 portions 必须分别是 3 或 8，gramsPerPortion 必须是【单块/单片】的重量！坚决不能把多块/整袋算成 1 份总重量！
      2. 为每个独立的食物提供名称。🚨极其重要：名称的括号中不仅要暗示做法，**必须明确指出“1份”到底对应多少实物**！比如，如果你在第1步把一袋8片吐司拆成了8份，名称必须写 "全麦吐司 (烘焙，1片/份)"，绝对不能写 "8片/袋"，否则用户会误以为界面上显示的“1份”营养是整袋的！对于不可数的菜，可写 "西红柿炒鸡蛋(重油，1盘/份)"；如果“1份”确实包含多个小物件，可写 "油炸黄花鱼(少油，2条/份)"。
      3. 估算每个食物的"基础份数"(图里一共有几份) 和 "每份重量(克)"。
      4. 拆解每个食物包含的所有底层食材及绝对克数（含隐藏的油盐糖等），这些克数必须是严格基于"【1份】"的量！
      5. 严格按以下 JSON 格式返回。details 中的 amount 必须是纯数字（代表克数）。你不需要计算最终的总卡路里。
      6. details 中的 name 尽量使用常见食材名，并附带你预估的该食材的“每100g营养单价”(fallbackMacros)。
      7. 🚨非常重要：如果你识别出图中根本不是食物（比如只是一个人、风景、动物、电子产品等），请直接返回空数组: {"foods": []}
      
      返回格式：
      {
        "foods": [
          {
            "foodName": "食物A (做法)",
            "portions": 1,
            "gramsPerPortion": 200,
            "details": [
              { 
                "name": "食材名称", 
                "amount": 100,
                "fallbackMacros": { "calories": 100, "protein": 5, "carbs": 10, "fats": 5 }
              }
            ]
          }
        ]
      }
    `;

    const { result, modelName } = await generateWithFallback({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });

    const responseText = result.response.text();
    const aiData = JSON.parse(responseText);

    // 处理多个食物
    const processedFoods = (aiData.foods || []).map(food => {
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFats = 0;

      const processedDetails = (food.details || []).map(item => {
        // 在本地库查找
        const dbMacros = nutritionDB[item.name];
        const macrosPer100g = dbMacros || item.fallbackMacros || { calories: 0, protein: 0, carbs: 0, fats: 0 };
        
        const amountRatio = item.amount / 100;
        totalCalories += macrosPer100g.calories * amountRatio;
        totalProtein += macrosPer100g.protein * amountRatio;
        totalCarbs += macrosPer100g.carbs * amountRatio;
        totalFats += macrosPer100g.fats * amountRatio;

        return {
          name: item.name,
          amount: item.amount,
          macrosPer100g: macrosPer100g
        };
      });

      return {
        foodName: food.foodName || "未知食物",
        portions: food.portions || 1,
        gramsPerPortion: food.gramsPerPortion || 100,
        details: processedDetails,
        calories: Math.round(totalCalories),
        protein: Math.round(totalProtein),
        carbs: Math.round(totalCarbs),
        fats: Math.round(totalFats)
      };
    });

    const nutritionData = {
      foods: processedFoods
    };

    const tokens = result.response.usageMetadata?.totalTokenCount || 0;
    if (tokens > 0) {
      await dbRun('UPDATE users SET totalTokensUsed = totalTokensUsed + ? WHERE id = ?', [tokens, req.user.userId]);
    }

    res.json(nutritionData);
  } catch (error) {
    console.error("AI 分析失败:", error);
    res.status(500).json({ error: "AI 分析失败，可能是配额已耗尽或图片有误。" });
  }
});

// --- 用户认证接口 ---
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
    
    const existing = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    if (existing) return res.status(400).json({ error: '用户名已存在' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await dbInsertAndGetId(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );
    
    const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, username });
  } catch (error) {
    console.error("注册失败:", error);
    res.status(500).json({ error: '注册失败' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
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

// --- 历史记录接口 ---
app.post('/api/meals', authenticateToken, async (req, res) => {
  try {
    const { foodName, calories, protein, carbs, fats, image, details } = req.body;
    const userId = req.user.userId;
    if (!foodName || calories === undefined) {
      return res.status(400).json({ error: "缺少必要字段" });
    }
    const detailsStr = details ? JSON.stringify(details) : '[]';
    const id = await dbInsertAndGetId(
      'INSERT INTO meals (userId, foodName, calories, protein, carbs, fats, image, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, foodName, calories, protein, carbs, fats, image || '', detailsStr]
    );
    res.json({ id, success: true });
  } catch (error) {
    console.error("保存记录失败:", error);
    res.status(500).json({ error: "保存失败" });
  }
});

app.get('/api/meals', authenticateToken, async (req, res) => {
  try {
    const tz = req.query.tz || 'Asia/Shanghai';
    const targetDate = req.query.date || moment().tz(tz).format('YYYY-MM-DD');
    const userId = req.user.userId;
    let meals;

    const startUtc = moment.tz(targetDate, tz).startOf('day').utc().format('YYYY-MM-DD HH:mm:ss');
    const endUtc = moment.tz(targetDate, tz).endOf('day').utc().format('YYYY-MM-DD HH:mm:ss');

    if (isPostgres) {
      meals = await pgPool.query(`
        SELECT id, userid as "userId", foodname as "foodName", calories, protein, carbs, fats, image, details, createdat as "createdAt" FROM meals 
        WHERE userid = $1 AND createdat >= $2 AND createdat <= $3
        ORDER BY createdat DESC
      `, [userId, startUtc, endUtc]).then(res => res.rows);
    } else {
      meals = await db.all(`
        SELECT * FROM meals 
        WHERE userId = ? AND createdAt >= ? AND createdAt <= ?
        ORDER BY createdAt DESC
      `, [userId, startUtc, endUtc]);
    }

    // 解析 JSON details
    meals = meals.map(m => {
      let parsedDetails = [];
      try { parsedDetails = JSON.parse(m.details); } catch(e) {}
      return { ...m, details: parsedDetails };
    });
    
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

// --- 获取某月有记录的日期列表（用于日历红点）---
app.get('/api/meals/dates', authenticateToken, async (req, res) => {
  try {
    const tz = req.query.tz || 'Asia/Shanghai';
    const month = req.query.month || moment().tz(tz).format('YYYY-MM'); // e.g. "2025-06"
    const userId = req.user.userId;

    const startUtc = moment.tz(`${month}-01`, tz).startOf('month').utc().format('YYYY-MM-DD HH:mm:ss');
    const endUtc   = moment.tz(`${month}-01`, tz).endOf('month').utc().format('YYYY-MM-DD HH:mm:ss');

    let rows;
    if (isPostgres) {
      rows = await pgPool.query(
        `SELECT createdat as "createdAt" FROM meals WHERE userid = $1 AND createdat >= $2 AND createdat <= $3`,
        [userId, startUtc, endUtc]
      ).then(r => r.rows);
    } else {
      rows = await db.all(
        `SELECT createdAt FROM meals WHERE userId = ? AND createdAt >= ? AND createdAt <= ?`,
        [userId, startUtc, endUtc]
      );
    }

    // 转换为用户时区的日期字符串集合（去重）
    const dates = [...new Set(rows.map(r => moment.utc(r.createdAt).tz(tz).format('YYYY-MM-DD')))];
    res.json({ dates });
  } catch (error) {
    console.error("获取日期列表失败:", error);
    res.status(500).json({ error: "获取日期列表失败" });
  }
});

// --- 导出全部记录为 CSV ---
app.get('/api/meals/export/csv', authenticateToken, async (req, res) => {
  try {
    const tz = req.query.tz || 'Asia/Shanghai';
    const userId = req.user.userId;

    let rows;
    if (isPostgres) {
      rows = await pgPool.query(
        `SELECT foodname as "foodName", calories, protein, carbs, fats, createdat as "createdAt" FROM meals WHERE userid = $1 ORDER BY createdat DESC`,
        [userId]
      ).then(r => r.rows);
    } else {
      rows = await db.all(
        `SELECT foodName, calories, protein, carbs, fats, createdAt FROM meals WHERE userId = ? ORDER BY createdAt DESC`,
        [userId]
      );
    }

    const header = '日期,食物,热量(kcal),蛋白质(g),碳水(g),脂肪(g)';
    const lines = rows.map(r => {
      const dateStr = moment.utc(r.createdAt).tz(tz).format('YYYY-MM-DD HH:mm');
      return `${dateStr},${r.foodName},${r.calories},${r.protein},${r.carbs},${r.fats}`;
    });
    const csv = [header, ...lines].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="WeightHelper_${moment().tz(tz).format('YYYYMMDD')}.csv"`);
    res.send('\uFEFF' + csv); // BOM for Excel compatibility
  } catch (error) {
    console.error("导出CSV失败:", error);
    res.status(500).json({ error: "导出失败" });
  }
});


// --- 修改记录接口 ---
app.put('/api/meals/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { calories, protein, carbs, fats, details } = req.body;
    
    const detailsStr = details ? JSON.stringify(details) : '[]';
    
    await dbRun(
      'UPDATE meals SET calories = ?, protein = ?, carbs = ?, fats = ?, details = ? WHERE id = ? AND userId = ?',
      [calories, protein, carbs, fats, detailsStr, id, userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("更新记录失败:", error);
    res.status(500).json({ error: "更新失败" });
  }
});

// --- 删除记录接口 ---
app.delete('/api/meals/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    // 只能删除自己的记录
    await dbRun('DELETE FROM meals WHERE id = ? AND userId = ?', [id, userId]);
    res.json({ success: true });
  } catch (error) {
    console.error("删除记录失败:", error);
    res.status(500).json({ error: "删除失败" });
  }
});

// 获取用户 Token 消耗状态
app.get('/api/user/status', authenticateToken, async (req, res) => {
  try {
    const result = await dbGet('SELECT totalTokensUsed FROM users WHERE id = ?', [req.user.userId]);
    res.json({ 
      model: FALLBACK_MODELS[currentModelIndex], 
      totalTokensUsed: result?.totalTokensUsed || 0 
    });
  } catch (error) {
    res.status(500).json({ error: "获取状态失败" });
  }
});

// --- 个人偏好设置接口 ---
app.get('/api/user/preferences', authenticateToken, async (req, res) => {
  try {
    const result = await dbGet('SELECT goal, timezone FROM users WHERE id = ?', [req.user.userId]);
    res.json({ goal: result?.goal || 2000, timezone: result?.timezone || 'Asia/Shanghai' });
  } catch (error) {
    console.error('获取设置失败:', error);
    res.status(500).json({ error: "获取设置失败" });
  }
});

app.put('/api/user/preferences', authenticateToken, async (req, res) => {
  try {
    const { goal, timezone } = req.body;
    await dbRun(
      'UPDATE users SET goal = ?, timezone = ? WHERE id = ?',
      [goal, timezone, req.user.userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('保存设置失败:', error);
    res.status(500).json({ error: "保存设置失败" });
  }
});

// --- AI 营养师点评接口 ---
app.post('/api/coach', authenticateToken, async (req, res) => {
  try {
    const { meals, totals, goal } = req.body;
    const username = req.user.username;
    if (!meals || !totals || !goal) {
      return res.status(400).json({ error: "缺少必要数据" });
    }

    const prompt = `
      你是一个专业、严谨且语气友好的私人 AI 营养师。
      这是用户（${username}）今天的饮食数据：
      - 目标卡路里: ${goal} kcal
      - 目前已摄入卡路里: ${totals.calories} kcal
      - 已摄入蛋白质: ${totals.protein} g
      - 已摄入碳水化合物: ${totals.carbs} g
      - 已摄入脂肪: ${totals.fats} g
      - 今天吃的食物有: ${meals.map(m => m.foodName).join('、')}

      请结合以上数据，给用户写一段 50-100 字的简短饮食点评和建议。
      如果超标了，请温柔地提醒并给出下一顿或明天的建议；如果没超标，请给予鼓励并指出营养搭配是否均衡（比如蛋白质够不够）。
      请直接返回建议文本，不要包含任何格式化标签（如 Markdown），语气要像真人在发微信。
    `;

    const { result, modelName } = await generateWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7, // 点评需要多一点创造力和情感
      }
    });
    
    const tokens = result.response.usageMetadata?.totalTokenCount || 0;
    if (tokens > 0 && req.user) {
      await dbRun('UPDATE users SET totalTokensUsed = totalTokensUsed + ? WHERE id = ?', [tokens, req.user.userId]);
    }

    res.json({ advice: result.response.text(), tokensUsedThisRequest: tokens });
  } catch (error) {
    console.error("获取点评失败:", error);
    res.status(500).json({ error: "获取点评失败" });
  }
});

// 所有其他未匹配的 GET 请求，都返回前端的 index.html (SPA 路由支持)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 后端服务已启动：http://localhost:${PORT}`);
});
