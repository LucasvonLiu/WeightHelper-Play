import { dbClient } from './dbClient.js';

export const UserRepository = {
  async findByUsername(username) {
    return dbClient.get('SELECT * FROM users WHERE username = ?', [username]);
  },

  async findById(id) {
    return dbClient.get('SELECT * FROM users WHERE id = ?', [id]);
  },

  async createUser(username, password) {
    return dbClient.insertAndGetId(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, password]
    );
  },

  async createAdmin(username, password) {
    return dbClient.insertAndGetId(
      'INSERT INTO admins (username, password) VALUES (?, ?)',
      [username, password]
    );
  },

  async updatePreferences(userId, goal, timezone) {
    return dbClient.run(
      'UPDATE users SET goal = ?, timezone = ? WHERE id = ?',
      [goal, timezone, userId]
    );
  },

  async updateTokenUsage(userId, tokens) {
    return dbClient.run(
      'UPDATE users SET totalTokensUsed = totalTokensUsed + ? WHERE id = ?',
      [tokens, userId]
    );
  },

  // 管理员相关方法
  async findAdminByUsername(username) {
    return dbClient.get('SELECT * FROM admins WHERE username = ?', [username]);
  },

  async getAllUsers() {
    return dbClient.all('SELECT id, username, createdAt, totalTokensUsed, goal, timezone FROM users ORDER BY id DESC');
  },

  async getUsersCount() {
    const res = await dbClient.get('SELECT COUNT(*) as count FROM users');
    return res ? res.count : 0;
  },

  async getUsersTotalTokens() {
    const res = await dbClient.get('SELECT SUM(totalTokensUsed) as total FROM users');
    return res ? res.total : 0;
  },

  async deleteUser(id) {
    await dbClient.run('DELETE FROM meals WHERE userId = ?', [id]);
    await dbClient.run('DELETE FROM users WHERE id = ?', [id]);
  }
};
