import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import nutritionDB from '../nutritionDB.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 确保在 service 内部能读取到环境变量 (双保险)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("⚠️ 警告: aiService 内未检测到 GEMINI_API_KEY，接口可能调用失败。");
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

// 获取当前模型的名字
export function getCurrentModel() {
  return FALLBACK_MODELS[currentModelIndex];
}

// 自动降级模型调用底层逻辑
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
      if (
        error?.status === 429 || error?.status === 404 ||
        errorStr.includes('429') || errorStr.includes('quota') ||
        errorStr.includes('404') || errorStr.includes('not found')
      ) {
        console.warn(`⚠️ 模型 ${modelName} 失败 (429/404). 自动降级重试...`);
        currentModelIndex = (currentModelIndex + 1) % FALLBACK_MODELS.length;
        attemptCount++;
      } else {
        throw error;
      }
    }
  }
  throw new Error("所有备选 AI 模型均已耗尽配额或不可用。");
}

// --- Zod 防御性校验 Schema ---
const BasicFoodSchema = z.object({
  name: z.string().default("未知食物"),
  quantity: z.coerce.number().default(1),
  unit: z.string().default("份")
});

const NutritionDetailSchema = z.object({
  name: z.string(),
  amount: z.coerce.number(),
  fallbackMacros: z.object({
    calories: z.coerce.number().default(0),
    protein: z.coerce.number().default(0),
    carbs: z.coerce.number().default(0),
    fats: z.coerce.number().default(0)
  }).default({ calories: 0, protein: 0, carbs: 0, fats: 0 })
});

const FoodAnalysisSchema = z.object({
  foodName: z.string().default("未知食物"),
  portions: z.coerce.number().default(1),
  gramsPerPortion: z.coerce.number().default(100),
  details: z.array(NutritionDetailSchema).default([])
});

const AnalyzeResultSchema = z.object({
  foods: z.array(FoodAnalysisSchema).default([])
});

// --- AI 业务服务层 ---
export const AIService = {
  // 1. 食物基础信息识别
  async recognizeBasicFood(base64Data, mimeType) {
    const prompt = `请识别图中的主体食物。返回JSON格式：{"name": "食物名(简短)", "quantity": 数量(必须是纯数字, 默认1), "unit": "单位(如: 碗/个/盘/克)"}`;

    const { result } = await generateWithFallback({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { data: base64Data, mimeType } }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });

    const responseText = result.response.text();
    const tokens = result.response.usageMetadata?.totalTokenCount || 0;
    
    // Zod 防御性解析校验
    const rawData = JSON.parse(responseText);
    const parsedData = BasicFoodSchema.parse(rawData);

    return { data: parsedData, tokens };
  },

  // 2. 营养素详细分析
  async analyzeNutrition(base64Data, mimeType, { foodName, quantity, unit }) {
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

    const { result } = await generateWithFallback({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { data: base64Data, mimeType } }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });

    const responseText = result.response.text();
    const tokens = result.response.usageMetadata?.totalTokenCount || 0;

    // Zod 防御性解析校验
    const rawData = JSON.parse(responseText);
    const parsedData = AnalyzeResultSchema.parse(rawData);

    // 计算与融合本地营养数据库 macros
    const processedFoods = parsedData.foods.map(food => {
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFats = 0;

      const processedDetails = food.details.map(item => {
        const dbMacros = nutritionDB[item.name];
        const macrosPer100g = dbMacros || item.fallbackMacros;
        
        const amountRatio = item.amount / 100;
        totalCalories += macrosPer100g.calories * amountRatio;
        totalProtein += macrosPer100g.protein * amountRatio;
        totalCarbs += macrosPer100g.carbs * amountRatio;
        totalFats += macrosPer100g.fats * amountRatio;

        return {
          name: item.name,
          amount: item.amount,
          macrosPer100g
        };
      });

      return {
        foodName: food.foodName,
        portions: food.portions,
        gramsPerPortion: food.gramsPerPortion,
        details: processedDetails,
        calories: Math.round(totalCalories),
        protein: Math.round(totalProtein),
        carbs: Math.round(totalCarbs),
        fats: Math.round(totalFats)
      };
    });

    return { foods: processedFoods, tokens };
  },

  // 3. AI 营养点评
  async getNutritionAdvice(username, meals, totals, goal) {
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

    const { result } = await generateWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
      }
    });

    const tokens = result.response.usageMetadata?.totalTokenCount || 0;
    const advice = result.response.text();

    return { advice, tokens };
  }
};
