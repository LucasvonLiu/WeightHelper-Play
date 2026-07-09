import { spawn } from 'child_process';
import assert from 'assert';

const PORT = 3001; // 使用 3001 端口进行测试，避免冲突
const BASE_URL = `http://127.0.0.1:${PORT}`;
const TEST_USER = `regtest_${Date.now()}`;
const TEST_PASSWORD = 'password123';
let token = '';

function startServer() {
  return new Promise((resolve, reject) => {
    console.log(`🚀 正在启动测试服务器于端口 ${PORT}...`);
    // 清空 DATABASE_URL 确保使用本地 SQLite 数据库，并设置端口
    const server = spawn('node', ['server/server.js'], {
      env: {
        ...process.env,
        PORT: PORT.toString(),
        DATABASE_URL: '' 
      },
      stdio: ['ignore', 'pipe', 'inherit']
    });

    let resolved = false;

    server.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Server Log] ${output.trim()}`);
      if (output.includes('后端服务已启动') || output.includes('Server running on port') || output.includes(`localhost:${PORT}`)) {
        if (!resolved) {
          resolved = true;
          resolve(server);
        }
      }
    });

    server.on('error', (err) => {
      if (!resolved) {
        reject(err);
      }
    });

    // 10秒超时保护
    setTimeout(() => {
      if (!resolved) {
        server.kill();
        reject(new Error('服务器启动超时(10s)'));
      }
    }, 10000);
  });
}

async function runTests() {
  console.log('\n🧪 开始执行 API 接口回归测试...');

  // --- Test 1: 注册账户 ---
  console.log('1. 测试用户注册...');
  const regRes = await fetch(`${BASE_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: TEST_USER, password: TEST_PASSWORD })
  });
  assert.strictEqual(regRes.status, 200, `注册接口状态码应为 200，实际为 ${regRes.status}`);
  const regData = await regRes.json();
  assert.strictEqual(regData.success, true, '注册返回值 success 应为 true');
  assert.ok(regData.token, '注册返回值应包含 JWT token');
  token = regData.token;
  console.log('   ✅ 注册成功');

  // --- Test 2: 重复注册校验 ---
  console.log('2. 测试重复注册冲突...');
  const regDupRes = await fetch(`${BASE_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: TEST_USER, password: TEST_PASSWORD })
  });
  assert.strictEqual(regDupRes.status, 400, `重复注册应返回 400，实际为 ${regDupRes.status}`);
  console.log('   ✅ 校验冲突成功');

  // --- Test 3: 用户登录 ---
  console.log('3. 测试用户登录...');
  const loginRes = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: TEST_USER, password: TEST_PASSWORD })
  });
  assert.strictEqual(loginRes.status, 200, `登录接口状态码应为 200，实际为 ${loginRes.status}`);
  const loginData = await loginRes.json();
  assert.strictEqual(loginData.success, true, '登录返回值 success 应为 true');
  assert.ok(loginData.token, '登录返回值应包含 token');
  console.log('   ✅ 登录成功');

  // --- Test 4: 获取偏好设置 ---
  console.log('4. 测试获取用户偏好 (goal/timezone)...');
  const prefGetRes = await fetch(`${BASE_URL}/api/user/preferences`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(prefGetRes.status, 200, `获取偏好状态码应为 200，实际为 ${prefGetRes.status}`);
  const prefGetData = await prefGetRes.json();
  assert.ok('goal' in prefGetData, '偏好应包含 goal 字段');
  assert.ok('timezone' in prefGetData, '偏好应包含 timezone 字段');
  console.log(`   ✅ 获取偏好成功 (当前 goal: ${prefGetData.goal}, timezone: ${prefGetData.timezone})`);

  // --- Test 5: 更新偏好设置 ---
  console.log('5. 测试更新用户偏好...');
  const newGoal = 1800;
  const newTz = 'Europe/Berlin';
  const prefPutRes = await fetch(`${BASE_URL}/api/user/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ goal: newGoal, timezone: newTz })
  });
  assert.strictEqual(prefPutRes.status, 200, `更新偏好状态码应为 200`);
  
  // 重新获取验证
  const prefGetVerify = await fetch(`${BASE_URL}/api/user/preferences`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const verifiedPref = await prefGetVerify.json();
  assert.strictEqual(verifiedPref.goal, newGoal, '更新后的 goal 应与设置值一致');
  assert.strictEqual(verifiedPref.timezone, newTz, '更新后的 timezone 应与设置值一致');
  console.log('   ✅ 更新及校验成功');

  // --- Test 6: 记录饮食 ---
  console.log('6. 测试保存饮食记录...');
  const mealData = {
    foodName: '烤鸡胸肉沙拉',
    calories: 350,
    protein: 35,
    carbs: 10,
    fats: 15,
    portions: 1.5,
    date: '2026-07-09'
  };
  const mealPostRes = await fetch(`${BASE_URL}/api/meals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(mealData)
  });
  assert.strictEqual(mealPostRes.status, 200, `保存饮食状态码应为 200`);
  const mealPostData = await mealPostRes.json();
  assert.ok(mealPostData.success, '保存饮食返回值 success 应为 true');
  console.log('   ✅ 保存饮食成功');

  // --- Test 7: 查询今日饮食列表 ---
  console.log('7. 测试查询特定日期饮食列表...');
  const mealsGetRes = await fetch(`${BASE_URL}/api/meals?date=2026-07-09&tz=Europe/Berlin`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(mealsGetRes.status, 200, `获取饮食列表状态码应为 200`);
  const mealsGetResData = await mealsGetRes.json();
  const mealsList = mealsGetResData.meals;
  assert.ok(Array.isArray(mealsList), '饮食列表应为数组');
  assert.strictEqual(mealsList.length, 1, '饮食列表长度应为 1');
  const loggedMeal = mealsList[0];
  assert.strictEqual(loggedMeal.foodName, '烤鸡胸肉沙拉', '保存的菜名校验应一致');
  assert.strictEqual(loggedMeal.calories, 350, '卡路里校验应一致');
  console.log('   ✅ 查询及数据校验成功');

  // --- Test 8: 提交与获取反馈 ---
  console.log('8. 测试提交与获取饮食记录的反馈 (Reward)...');
  const mealId = loggedMeal.id;
  assert.ok(mealId, '记录应包含有效 ID');
  
  const feedbackData = {
    rating: 1,
    comment: '卡路里低估了，我自己更正为 300 kcal',
    originalCalories: 350,
    correctedCalories: 300
  };
  
  const feedbackPostRes = await fetch(`${BASE_URL}/api/meals/${mealId}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(feedbackData)
  });
  
  assert.strictEqual(feedbackPostRes.status, 200, '提交反馈状态码应为 200');
  const feedbackPostResData = await feedbackPostRes.json();
  assert.ok(feedbackPostResData.success, '提交反馈应返回 success: true');

  // 获取反馈进行验证
  const feedbackGetRes = await fetch(`${BASE_URL}/api/meals/${mealId}/feedback`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(feedbackGetRes.status, 200, '获取反馈状态码应为 200');
  const feedbackGetResData = await feedbackGetRes.json();
  assert.strictEqual(feedbackGetResData.rating, 1, '获取的 rating 应为 1');
  assert.strictEqual(feedbackGetResData.comment, '卡路里低估了，我自己更正为 300 kcal', '获取的 comment 应匹配');
  assert.strictEqual(feedbackGetResData.correctedCalories, 300, '获取的 correctedCalories 应为 300');
  console.log('   ✅ 提交及获取反馈成功');

  // --- Test 9: 删除饮食记录 ---
  console.log('9. 测试删除饮食记录...');
  const deleteRes = await fetch(`${BASE_URL}/api/meals/${mealId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(deleteRes.status, 200, `删除接口状态码应为 200`);
  
  // 重新获取验证列表应为空
  const mealsVerifyRes = await fetch(`${BASE_URL}/api/meals?date=2026-07-09&tz=Europe/Berlin`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const mealsVerifyData = await mealsVerifyRes.json();
  const verifiedList = mealsVerifyData.meals;
  assert.strictEqual(verifiedList.length, 0, '删除后饮食列表应为空');
  console.log('   ✅ 删除及校验成功');

  // --- Test 10: 注销账号 ---
  console.log('10. 测试用户自注销账号 (合规)...');
  const deleteAccRes = await fetch(`${BASE_URL}/api/user/account`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(deleteAccRes.status, 200, `注销账户状态码应为 200`);
  const deleteAccData = await deleteAccRes.json();
  assert.ok(deleteAccData.success, '注销账户 success 应为 true');
  
  // 验证登录会失败
  const loginAfterDeleteRes = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: TEST_USER, password: TEST_PASSWORD })
  });
  assert.strictEqual(loginAfterDeleteRes.status, 400, '注销账户后登录应返回 400 失败');
  console.log('   ✅ 自注销及失效校验成功');
}

async function main() {
  let serverProcess;
  try {
    serverProcess = await startServer();
    await runTests();
    console.log('\n🎉 所有 API 接口回归测试顺利通过！防线建立成功！✅\n');
  } catch (error) {
    console.error('\n❌ 回归测试失败：', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exitCode = 1;
  } finally {
    if (serverProcess) {
      console.log('🛑 正在关闭测试服务器...');
      serverProcess.kill('SIGTERM');
    }
  }
}

main();
