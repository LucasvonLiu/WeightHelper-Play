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
      
      // 尝试添加 tokens 列 (容错处理)
      try { await pgPool.query(`ALTER TABLE users ADD COLUMN totalTokensUsed INTEGER DEFAULT 0`); } catch (e) {}
      try { await pgPool.query(`ALTER TABLE users ADD COLUMN goal INTEGER DEFAULT 2000`); } catch (e) {}
      try { await pgPool.query(`ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'Asia/Shanghai'`); } catch (e) {}
      
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

app.post('/api/analyze', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "图片数据缺失" });
    }

    // 提取 base64 数据和 MIME 类型
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: "图片格式有误，必须为 Base64" });
    }
    const mimeType = match[1];
    const base64Data = match[2];

    // 获取 2.5-flash 模型，性能更强且支持当前 API
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      你是一个专业的健康营养师和中华美食专家。请仔细分析用户上传的这张饮食照片：
      1. 识别食物并起一个好听的中文名字（例如：经典牛肉汉堡薯条套餐）。
      2. 【核心步骤】：首先，详细拆解这盘食物里的主要食材配料，并估算它们的重量（克）。
      3. 【计算步骤】：根据你在第 2 步中列出的配料及重量，严格累加计算出总热量（kcal）和三大营养素（克）。
      
      请严格按照以下 JSON 格式返回，不要包含任何 \`\`\`json 标记，确保是一个合法的 JSON 字符串。
      （注意 JSON 键的顺序：请务必先输出 details，再输出 calories 等总计字段。这非常重要，能帮你先思考再得出结论）：
      {
        "foodName": "食物名称",
        "details": [
          { "name": "配料或食材名称1", "amount": "估算克数，如100g" },
          { "name": "配料或食材名称2", "amount": "估算克数，如50g" }
        ],
        "calories": 450,
        "protein": 28,
        "carbs": 35,
        "fats": 19
      }
      【重要指令】：请务必保持客观、一致和确定性！对于同样的食物和分量，请基于标准的食物热量数据库给出精确且固定的估算值，不要随意波动。
    `;

    const result = await model.generateContent({
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
    const nutritionData = JSON.parse(responseText);

    const tokens = result.response.usageMetadata?.totalTokenCount || 0;
    if (tokens > 0 && req.headers['authorization']) {
        const token = req.headers['authorization'].split(' ')[1];
        jwt.verify(token, JWT_SECRET, async (err, decoded) => {
            if (!err) {
                await dbRun('UPDATE users SET totalTokensUsed = totalTokensUsed + ? WHERE id = ?', [tokens, decoded.userId]);
            }
        });
    }

    res.json(nutritionData);
  } catch (error) {
    console.error("AI 分析失败:", error);
    res.status(500).json({ error: "AI 分析失败，请检查 API Key 或图片格式。" });
  }
});

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
    const { foodName, calories, protein, carbs, fats } = req.body;
    const userId = req.user.userId;
    if (!foodName || calories === undefined) {
      return res.status(400).json({ error: "缺少必要字段" });
    }
    const id = await dbInsertAndGetId(
      'INSERT INTO meals (userId, foodName, calories, protein, carbs, fats) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, foodName, calories, protein, carbs, fats]
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
        SELECT * FROM meals 
        WHERE userId = $1 AND createdAt >= $2 AND createdAt <= $3
        ORDER BY createdAt DESC
      `, [userId, startUtc, endUtc]).then(res => res.rows);
    } else {
      meals = await db.all(`
        SELECT * FROM meals 
        WHERE userId = ? AND createdAt >= ? AND createdAt <= ?
        ORDER BY createdAt DESC
      `, [userId, startUtc, endUtc]);
    }
    
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
    const result = await dbGet('SELECT SUM(totalTokensUsed) as total FROM users');
    res.json({ 
      model: 'gemini-2.5-flash', 
      totalTokensUsed: result?.total || 0 
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

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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

    const result = await model.generateContent({
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
