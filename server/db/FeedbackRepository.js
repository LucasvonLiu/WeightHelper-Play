import { dbClient } from './dbClient.js';

export const FeedbackRepository = {
  async saveFeedback({ mealId, userId, rating, comment, originalCalories, correctedCalories }) {
    // 检查是否已经存在该记录的反馈，存在则更新，不存在则插入
    const existing = await dbClient.get(
      'SELECT id FROM user_feedback WHERE mealId = ? AND userId = ?',
      [mealId, userId]
    );

    if (existing) {
      return dbClient.run(
        'UPDATE user_feedback SET rating = ?, comment = ?, originalCalories = ?, correctedCalories = ? WHERE id = ?',
        [rating || 0, comment || '', originalCalories || null, correctedCalories || null, existing.id]
      );
    } else {
      return dbClient.insertAndGetId(
        'INSERT INTO user_feedback (mealId, userId, rating, comment, originalCalories, correctedCalories) VALUES (?, ?, ?, ?, ?, ?)',
        [mealId, userId, rating || 0, comment || '', originalCalories || null, correctedCalories || null]
      );
    }
  },

  async getFeedbackForMeal(mealId, userId) {
    return dbClient.get(
      'SELECT * FROM user_feedback WHERE mealId = ? AND userId = ?',
      [mealId, userId]
    );
  },

  // 后台管理大盘获取所有用户反馈
  async getAllFeedback(limit = 100) {
    return dbClient.all(
      'SELECT f.*, u.username, m.foodName FROM user_feedback f LEFT JOIN users u ON f.userId = u.id LEFT JOIN meals m ON f.mealId = m.id ORDER BY f.createdAt DESC LIMIT ?',
      [limit]
    );
  }
};
