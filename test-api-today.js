import jwt from 'jsonwebtoken';

const token = jwt.sign({ userId: 1, username: 'test' }, 'weighthelper-super-secret-key-2024', { expiresIn: '30d' });

async function test() {
  try {
    const res1 = await fetch('https://weighthelper.onrender.com/api/user/status', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log("Status:", await res1.text());

    const res2 = await fetch('https://weighthelper.onrender.com/api/coach', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        meals: [{ foodName: '苹果' }],
        totals: { calories: 100, protein: 1, carbs: 20, fats: 0 },
        goal: 2000
      })
    });
    console.log("Coach:", await res2.text());
  } catch(e) {
    console.error(e);
  }
}
test();
