import pg from 'pg';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isPostgres = !!process.env.DATABASE_URL;
let db;
let pgPool;

// 工具函数：将 Postgres 返回的列名映射为驼峰命名，与 SQLite 保持一致
function mapRowKeys(row) {
  if (!row) return row;
  const mapped = {};
  for (const key of Object.keys(row)) {
    if (key === 'userid') mapped.userId = row[key];
    else if (key === 'foodname') mapped.foodName = row[key];
    else if (key === 'createdat') mapped.createdAt = row[key];
    else if (key === 'totaltokensused') mapped.totalTokensUsed = row[key];
    else mapped[key] = row[key];
  }
  return mapped;
}

export async function initDb() {
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
        CREATE TABLE IF NOT EXISTS admins (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password TEXT NOT NULL,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS user_feedback (
          id SERIAL PRIMARY KEY,
          mealId INTEGER NOT NULL,
          userId INTEGER NOT NULL,
          rating INTEGER DEFAULT 0,
          comment TEXT,
          originalCalories INTEGER,
          correctedCalories INTEGER,
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
        filename: path.join(__dirname, '..', 'database.sqlite'), // 指向 /server/database.sqlite
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
        CREATE TABLE IF NOT EXISTS admins (
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

      await db.exec(`
        CREATE TABLE IF NOT EXISTS user_feedback (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mealId INTEGER NOT NULL,
          userId INTEGER NOT NULL,
          rating INTEGER DEFAULT 0,
          comment TEXT,
          originalCalories INTEGER,
          correctedCalories INTEGER,
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
    throw err;
  }
}

// 统一的数据库执行客户端包装
export const dbClient = {
  isPostgres,
  
  async run(query, params = []) {
    if (isPostgres) {
      let i = 1;
      const sql = query.replace(/\?/g, () => `$${i++}`);
      return pgPool.query(sql, params);
    } else {
      return db.run(query, params);
    }
  },

  async get(query, params = []) {
    if (isPostgres) {
      let i = 1;
      const sql = query.replace(/\?/g, () => `$${i++}`);
      const res = await pgPool.query(sql, params);
      return mapRowKeys(res.rows[0]);
    } else {
      return db.get(query, params);
    }
  },

  async all(query, params = []) {
    if (isPostgres) {
      let i = 1;
      const sql = query.replace(/\?/g, () => `$${i++}`);
      const res = await pgPool.query(sql, params);
      return res.rows.map(mapRowKeys);
    } else {
      return db.all(query, params);
    }
  },

  async insertAndGetId(query, params = []) {
    if (isPostgres) {
      let i = 1;
      const sql = query.replace(/\?/g, () => `$${i++}`) + ' RETURNING id';
      const res = await pgPool.query(sql, params);
      return res.rows[0].id;
    } else {
      const result = await db.run(query, params);
      return result.lastID;
    }
  }
};
