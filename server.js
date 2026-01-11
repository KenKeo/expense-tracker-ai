const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'expenses.json');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Đọc dữ liệu chi tiêu
function loadExpenses() {
  if (fs.existsSync(DATA_FILE)) {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  }
  return [];
}

// Lưu dữ liệu chi tiêu
function saveExpenses(expenses) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(expenses, null, 2));
}

// API: Lấy tất cả chi tiêu
app.get('/api/expenses', (req, res) => {
  const expenses = loadExpenses();
  res.json(expenses);
});

// API: Thêm chi tiêu mới
app.post('/api/expenses', (req, res) => {
  const { description, amount, category } = req.body;

  if (!description || !amount) {
    return res.status(400).json({ error: 'Thiếu thông tin' });
  }

  const expenses = loadExpenses();
  const newExpense = {
    id: Date.now(),
    description,
    amount: Number(amount),
    category: category || 'khác',
    date: new Date().toLocaleDateString('vi-VN')
  };

  expenses.push(newExpense);
  saveExpenses(expenses);
  res.json(newExpense);
});

// API: Xóa chi tiêu
app.delete('/api/expenses/:id', (req, res) => {
  const id = Number(req.params.id);
  let expenses = loadExpenses();
  expenses = expenses.filter(e => e.id !== id);
  saveExpenses(expenses);
  res.json({ success: true });
});

// API: Lấy thống kê
app.get('/api/stats', (req, res) => {
  const expenses = loadExpenses();
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Thống kê theo danh mục
  const byCategory = {};
  expenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  });

  res.json({ total, byCategory, count: expenses.length });
});

// Khởi động server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ✨ Expense Tracker đang chạy!

  📱 Truy cập trên máy tính: http://localhost:${PORT}
  📱 Truy cập trên điện thoại: http://<IP-máy-tính>:${PORT}

  💡 Để tìm IP máy tính, chạy lệnh: ipconfig (Windows) hoặc ifconfig (Mac/Linux)
  `);
});
