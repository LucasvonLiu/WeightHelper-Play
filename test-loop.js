import jwt from 'jsonwebtoken';

const token = jwt.sign({ userId: 1, username: 'test' }, 'weighthelper-super-secret-key-2024', { expiresIn: '30d' });

async function poll() {
  while (true) {
    try {
      const res = await fetch('https://weighthelper.onrender.com/api/coach', {
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
      const text = await res.text();
      console.log(new Date().toISOString(), text);
      if (text.includes("details") || text.includes("stack")) {
        break;
      }
    } catch(e) {
      console.error(e);
    }
    await new Promise(r => setTimeout(r, 5000));
  }
}
poll();
