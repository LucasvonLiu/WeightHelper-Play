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
| 重启后数据丢失 | Render 免费实例文件系统临时，SQLite 随重启消失 | 双引擎架构已就绪，等用户配置 DATABASE_URL |

---

## 四、🔴 当前最紧迫：配置云端数据库（用户亲自操作）

代码已完全准备好，只差用户完成以下两步：

**第一步：在 Neon.tech 获取免费 PostgreSQL**
1. 打开 https://neon.tech，用 GitHub 登录
2. 新建项目（名字随意，如 `weight-helper-db`）
3. 复制仪表盘上的 Connection String（`postgresql://...` 格式）

**第二步：在 Render 后台添加环境变量**
1. 打开 https://dashboard.render.com，进入 WeightHelper 服务
2. 点击左侧 **Environment Variables**
3. 添加：Key = `DATABASE_URL`，Value = 上面的连接字符串
4. 保存，等 Render 自动重启

完成后日志会打印 `☁️ 检测到 DATABASE_URL，正在连接 PostgreSQL 云数据库...`

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
| POST | `/api/coach` | AI 营养师今日点评 |
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

## 八、已知局限与潜在改进点

1. **Render 冷启动**：免费实例 15 分钟无访问后休眠，重新访问等约 30 秒。可用 UptimeRobot 定时 Ping 保活。
2. **ProPaywall 未实现**：AI 营养师目前对所有用户开放。
3. **无密码重置**：忘记密码无法找回。
4. **食物图片不持久化**：每次识别的图片仅临时存在前端内存。
