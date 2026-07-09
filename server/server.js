import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

// 导入数据库客户端与 Repository
import { initDb } from './db/dbClient.js';
import { UserRepository } from './db/UserRepository.js';

// 导入业务路由
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import mealsRouter from './routes/meals.js';
import adminRouter from './routes/admin.js';

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

const FALLBACK_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.0-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
];
let currentModelIndex = 0;

// 获取当前模型的辅助函数 (供路由使用)
export function getCurrentModel() {
  return FALLBACK_MODELS[currentModelIndex];
}

// 自动降级模型调用包装 (供路由使用)
export async function generateWithFallback(config) {
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

// 健康检查与保活接口 (UptimeRobot 唤醒专用)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 挂载路由
app.use(authRouter);
app.use(usersRouter);
app.use(mealsRouter);
app.use(adminRouter);

// 静态托管 Admin 前端 (生产环境)
app.use('/admin', express.static(path.join(__dirname, 'admin-dashboard', 'dist')));

app.use('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-dashboard', 'dist', 'index.html'));
});

// 所有其他未匹配的 GET 请求，都返回前端的 index.html (SPA 路由支持)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 异步初始化数据库后，再对外开启监听，防止自动化测试因启动竞争出现 500
initDb().then(async () => {
  // 创建默认管理员账号
  try {
    const adminExists = await UserRepository.findAdminByUsername('admin');
    if (!adminExists) {
      const hashedAdminPwd = await bcrypt.hash('admin123', 10);
      await UserRepository.createAdmin('admin', hashedAdminPwd);
      console.log("🌟 默认管理员已创建，账号: admin，密码: admin123");
    }
  } catch (e) {
    console.error("初始化默认管理员失败", e);
  }

  app.listen(PORT, () => {
    console.log(`🚀 后端服务已启动：http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("❌ 数据库初始化失败或服务启动失败:", err);
  process.exit(1);
});
