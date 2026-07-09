import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AIService, getCurrentModel } from '../server/services/aiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EVAL_DIR = path.join(__dirname, '..', 'server', 'eval');
const GOLDEN_JSON_PATH = path.join(EVAL_DIR, 'golden_dataset.json');
const IMAGES_DIR = path.join(EVAL_DIR, 'golden_dataset');

// 1x1 像素透明 PNG 的 Base64，用作评测的占位符图
const MOCK_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// 确保目录和模拟图片就绪
function prepareMockImages() {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  const dataset = JSON.parse(fs.readFileSync(GOLDEN_JSON_PATH, 'utf-8'));
  for (const item of dataset) {
    const imgPath = path.join(IMAGES_DIR, item.imagePath);
    if (!fs.existsSync(imgPath)) {
      fs.writeFileSync(imgPath, Buffer.from(MOCK_PNG_BASE64, 'base64'));
    }
  }
}

async function main() {
  console.log('🧪 开始拉起离线大模型评估系统 (Eval Harness)...');
  
  if (!fs.existsSync(GOLDEN_JSON_PATH)) {
    console.error(`❌ 错误：未找到黄金测试集文件 ${GOLDEN_JSON_PATH}`);
    process.exit(1);
  }

  prepareMockImages();
  
  const dataset = JSON.parse(fs.readFileSync(GOLDEN_JSON_PATH, 'utf-8'));
  console.log(`📊 成功加载黄金测试集，共 ${dataset.length} 条样本。`);
  console.log(`🤖 当前评测模型: ${getCurrentModel()}\n`);

  let totalAbsoluteError = 0;
  let totalAbsolutePercentageError = 0;
  let successCount = 0;
  let totalTokensUsed = 0;

  console.log('--------------------------------------------------------------------------------');
  console.log(String('食物名称').padEnd(10) + ' | ' + 
              String('标准热量(GT)').padEnd(12) + ' | ' + 
              String('估计热量(Est)').padEnd(13) + ' | ' + 
              String('绝对误差').padEnd(10) + ' | ' + 
              '相对误差率');
  console.log('--------------------------------------------------------------------------------');

  for (const item of dataset) {
    const imgPath = path.join(IMAGES_DIR, item.imagePath);
    const imgBuffer = fs.readFileSync(imgPath);
    const base64Data = imgBuffer.toString('base64');

    try {
      // 调用解耦的 AIService.analyzeNutrition 方法进行评测
      const { foods, tokens } = await AIService.analyzeNutrition(
        base64Data,
        'image/png',
        { foodName: item.foodName, quantity: item.quantity, unit: item.unit }
      );

      totalTokensUsed += tokens;
      
      // 累加 AI 估算的总卡路里
      const estimatedCalories = foods.reduce((sum, f) => sum + (f.calories || 0), 0);
      const gtCalories = item.groundTruth.calories;
      const absError = Math.abs(gtCalories - estimatedCalories);
      
      let ape = 0; // Absolute Percentage Error
      if (gtCalories > 0) {
        ape = (absError / gtCalories) * 100;
      }

      totalAbsoluteError += absError;
      totalAbsolutePercentageError += ape;
      successCount++;

      console.log(
        item.foodName.padEnd(12) + ' | ' + 
        `${gtCalories} kcal`.padEnd(14) + ' | ' + 
        `${estimatedCalories} kcal`.padEnd(15) + ' | ' + 
        `${absError} kcal`.padEnd(12) + ' | ' + 
        `${ape.toFixed(1)}%`
      );
    } catch (err) {
      console.error(`❌ 评估样本【${item.foodName}】失败:`, err.message || err);
    }

    // 稍微延迟 500ms，避免并发过多触发 API 限流 (429)
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('--------------------------------------------------------------------------------');

  if (successCount === 0) {
    console.error('❌ 没有样本评估成功。');
    process.exit(1);
  }

  const MAE = totalAbsoluteError / successCount; // Mean Absolute Error
  const MAPE = totalAbsolutePercentageError / successCount; // Mean Absolute Percentage Error

  console.log(`\n🎉 评测完成！`);
  console.log(`📈 评估样本数 (Sample Size): ${successCount}/${dataset.length}`);
  console.log(`🎯 平均绝对误差 (MAE): ${MAE.toFixed(1)} kcal`);
  console.log(`📉 平均绝对百分比误差 (MAPE): ${MAPE.toFixed(1)}%`);
  console.log(`🪙 本次评测总消耗 Token (Total Tokens): ${totalTokensUsed}`);
  console.log(`🏆 评测结论: 误差控制在 15% 以内即达到上线健康水准。`);
  console.log('--------------------------------------------------------------------------------');
}

main().catch(err => {
  console.error('❌ 评估运行出现异常:', err);
  process.exit(1);
});
