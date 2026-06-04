# WeightHelper 项目知识库

> 最后更新：2026-06-04  
> 项目仓库：https://github.com/LucasvonLiu/WeightHelper  
> 线上地址：https://weighthelper.onrender.com/  
> 本地路径：/Users/liuzhongze/Desktop/WeightHelper

---

## 一、项目技术栈

| 层级 | 技术 |
|---|---|
| 前端 | React (Vite) |
| 后端 | Node.js + Express |
| AI | Google Gemini 2.5 Flash |
| 本地数据库 | SQLite（开发环境） |
| 云端数据库 | PostgreSQL（生产，通过 `DATABASE_URL` 环境变量激活） |
| 部署平台 | Render（免费实例） |
| 时区处理 | `moment-timezone` 库 |

---

## 二、核心架构决策

### 2.1 双引擎数据库（最重要！）

`server.js` 中实现了一个"智能双引擎"架构：

- **判断逻辑**：`const isPostgres = !!process.env.DATABASE_URL;`
- **本地开发**：自动使用 SQLite，无需任何配置
- **线上生产**：检测到 `DATABASE_URL` 环境变量后，自动切换到 PostgreSQL
- **统一适配器**：所有 DB 操作统一通过 `dbRun`、`dbGet`、`dbInsertAndGetId` 三个函数。SQL 统一用 `?` 占位符，适配器内部自动替换为 PostgreSQL 的 `$1/$2/$3`。

> ⚠️ **禁止**：绝对不能在 SQL 里手动写 `$1`/`$2` 后再交给这三个适配器，会造成双重替换导致查询失败。

### 2.2 users 表结构

```
id, username, password, createdAt, totalTokensUsed, goal, timezone
```

- `totalTokensUsed`：用户 AI Token 累计消耗量
- `goal`：每日卡路里目标（默认 2000），已云端化
- `timezone`：时区设置（默认 Asia/Shanghai），已云端化

### 2.3 时区系统

- 用户在"设置"页选择时区（北京/柏林/纽约/休斯敦），保存到云端数据库
- 前端查询历史时携带 `tz` 参数：`GET /api/meals?date=xxx&tz=Asia/Shanghai`
- 后端用 `moment-timezone` 将该时区当天的起止转换为 UTC 绝对时间戳查询，与服务器时区无关

---

## 三、已修复的关键 Bug 清单

| Bug | 原因 | 修复 |
|---|---|---|
| AI 识图后 Token 不变、功能失效 | `authenticateToken` 定义在 `/api/analyze` 路由之后，`const` 不提升，路由直接 ReferenceError | 将中间件定义移到所有路由之前 |
| Token 显示全体用户之和 | status 接口用了 `SUM(...)` 查所有人 | 改为 `WHERE id = ?` 只查当前用户 |
| 历史页白屏 | 用了 moment 对象但调了原生 Date 的 `.getDate()` | 改为 moment 的 `.date()` |
| 设置跨设备不同步 | goal/timezone 存在 localStorage | 迁移到云端，新增 GET/PUT /api/user/preferences |
| 偏好接口读写无效 | SQL 里手动拼 `$1/$2` 后又交给适配器 | 改为统一 `?` 占位符 |
| 重启后数据丢失 | Render 免费实例文件系统临时，SQLite 随重启消失 | 双引擎架构已就绪，已成功连接 PostgreSQL |
| API 配额耗尽报错 | Gemini 2.5 Flash 免费配额用完导致 429 或模型不存在(404)报错 | 实现 `generateWithFallback` 模型自动降级，按序调用 `gemini-3.1-flash-lite`, `gemini-3.5-flash`, `gemini-3.0-flash`, `gemini-2.5-flash`, `gemini-2.5-flash-lite` |
| 饮食记录缺少菜名且时间显示异常 | PostgreSQL 自动将无引号列名转为小写 (`foodname`, `createdat`)，前端无法获取导致出错，moment 错误解析产生当前时间 | 在 `server.js` `GET /api/meals` 查询中添加别名映射 `foodname as "foodName"`，恢复驼峰命名 |

---

## 四、最近完成的核心优化（2026-06-04）

1. **数据库迁移确认**：已成功在 Render 环境上打通 PostgreSQL 云端数据库，彻底解决应用重启数据丢失问题。
2. **AI 模型灾备机制**：针对免费 API 配额容易耗尽的问题，实现了在后端遇到 429 (配额用尽) 或 404 (模型未找到) 时的自动降级重试逻辑（优先高版本 Lite 模型，其次 Flash 模型）。
3. **UI 极简风改造**：
   - 去掉了全局悬浮的 AI 模型/Token 徽章，只在“记录”页面下方低调显示当前正在调用的模型。
   - 移除了历史页的“AI 营养师点评”功能和冗余标题，专注饮食记录本身。
   - 饮食记录条目的时间显示替换为世界时钟偏移格式（例如 `UTC+8 09:00`），方便跨时区家人交流。
   - 调整了全站顶部留白（Padding），让整体空间更加松弛。
   - 网站图标替换为绿叶子 `icon.png`，不再使用框架默认图标。
4. **新人引导**：在登录/注册前增加了一个弹出式卡片，一句话向新用户介绍产品功能（拍照秒算卡路里）。

---

## 五、用户信息

- **开发者**：刘钟泽（LucasvonLiu）
- **使用场景**：家庭健康记录，家人分布在北京、柏林、纽约、休斯敦
- **Gemini API Key**：存储在 Render 环境变量 `GEMINI_API_KEY` 和本地 `.env`

---

## 六、关键 API 接口速查

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/analyze` | 图片识别营养成分（需登录 Token）|
| POST | `/api/meals` | 保存饮食记录 |
| GET | `/api/meals?date=&tz=` | 获取指定日期记录（支持时区） |
| DELETE | `/api/meals/:id` | 删除记录 |
| GET | `/api/user/status` | 获取当前用户 Token 消耗量 |
| GET | `/api/user/preferences` | 获取 goal 和 timezone |
| PUT | `/api/user/preferences` | 保存 goal 和 timezone |
| POST | `/api/register` | 注册 |
| POST | `/api/login` | 登录 |

---

## 七、前端组件地图

```
App.jsx                    # 主入口，管理 token/goal/timezone 状态
├── Auth.jsx               # 登录/注册页
├── BottomNav.jsx          # 底部导航（三个标签）
├── CameraCapture.jsx      # 拍照/上传
├── AIAnalyzer.jsx         # 分析中动画
├── NutritionCard.jsx      # 营养成分结果卡片
├── HistoryList.jsx        # 历史/今日追踪（使用 moment-timezone）
├── Settings.jsx           # 设置（卡路里目标 + 时区选择）
└── ProPaywall.jsx         # Pro 付费墙（目前为占位）
```

---

## 八、已知局限与接下来的计划

1. **Render 休眠与冷启动问题**：由于使用的 Render 免费实例，在 15 分钟无请求后会休眠。休眠后的首次访问需要等待约 30-50 秒。**下一步计划**：配置 UptimeRobot 定时 Ping 服务以保持实例常驻。
2. **长效图片存储**：目前由于后端没有集成 OSS（对象存储），前端识别上传的图片只是转换为 base64 后发给 AI，并没有永久存储在服务器上，用户也无法回顾曾经拍过的照片。**下一步计划**：接入云存储（如 AWS S3, Supabase Storage 等）持久化食物照片。
3. **付费与权限体系**：目前的 `ProPaywall` 仅为前端组件占位，未来可考虑实现真正的付费墙及会员专属功能（如营养建议报告等）。
4. **找回密码功能**：目前只有基础的注册/登录，缺少找回或重置密码的邮件系统流程。
