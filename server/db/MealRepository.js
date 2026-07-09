import { dbClient } from './dbClient.js';

export const MealRepository = {
  async createMeal({ userId, foodName, calories, protein, carbs, fats, image, details }) {
    const detailsStr = details ? JSON.stringify(details) : '[]';
    return dbClient.insertAndGetId(
      'INSERT INTO meals (userId, foodName, calories, protein, carbs, fats, image, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, foodName, calories, protein, carbs, fats, image || '', detailsStr]
    );
  },

  async getMealsByDateRange(userId, startUtc, endUtc) {
    const meals = await dbClient.all(
      'SELECT * FROM meals WHERE userId = ? AND createdAt >= ? AND createdAt <= ? ORDER BY createdAt DESC',
      [userId, startUtc, endUtc]
    );
    
    // 解析 JSON details 字段
    return meals.map(m => {
      let parsedDetails = [];
      if (m.details) {
        try {
          parsedDetails = typeof m.details === 'string' ? JSON.parse(m.details) : m.details;
        } catch (e) {
          console.error('Failed to parse details JSON:', e);
        }
      }
      return { ...m, details: parsedDetails };
    });
  },

  async findById(id) {
    return dbClient.get('SELECT * FROM meals WHERE id = ?', [id]);
  },

  async deleteMeal(id, userId) {
    return dbClient.run('DELETE FROM meals WHERE id = ? AND userId = ?', [id, userId]);
  },

  async updateMeal(id, userId, { calories, protein, carbs, fats, details }) {
    const detailsStr = details ? JSON.stringify(details) : '[]';
    return dbClient.run(
      'UPDATE meals SET calories = ?, protein = ?, carbs = ?, fats = ?, details = ? WHERE id = ? AND userId = ?',
      [calories, protein, carbs, fats, detailsStr, id, userId]
    );
  },

  async getLoggedDates(userId, startUtc, endUtc) {
    return dbClient.all(
      'SELECT createdAt FROM meals WHERE userId = ? AND createdAt >= ? AND createdAt <= ?',
      [userId, startUtc, endUtc]
    );
  },

  async getAllMealsForUser(userId) {
    const meals = await dbClient.all(
      'SELECT * FROM meals WHERE userId = ? ORDER BY createdAt DESC',
      [userId]
    );
    return meals.map(m => {
      let parsedDetails = [];
      if (m.details) {
        try {
          parsedDetails = typeof m.details === 'string' ? JSON.parse(m.details) : m.details;
        } catch (e) {}
      }
      return { ...m, details: parsedDetails };
    });
  },

  // 后台管理相关方法
  async getAllMealsCount() {
    const res = await dbClient.get('SELECT COUNT(*) as count FROM meals');
    return res ? res.count : 0;
  },

  async getAllMeals(limit = 100) {
    const meals = await dbClient.all('SELECT * FROM meals ORDER BY createdAt DESC LIMIT ?', [limit]);
    return meals.map(m => {
      let parsedDetails = [];
      if (m.details) {
        try {
          parsedDetails = typeof m.details === 'string' ? JSON.parse(m.details) : m.details;
        } catch (e) {}
      }
      return { ...m, details: parsedDetails };
    });
  },

  async getMealsWithUsernames(limit, offset) {
    return dbClient.all(
      'SELECT m.id, m.userId, u.username, m.foodName, m.calories, m.image, m.createdAt FROM meals m LEFT JOIN users u ON m.userId = u.id ORDER BY m.createdAt DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
  },

  async deleteMealById(id) {
    return dbClient.run('DELETE FROM meals WHERE id = ?', [id]);
  }
};
