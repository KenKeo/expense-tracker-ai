const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const EXPENSES_DIR = path.join(__dirname, 'data', 'expenses');

// Tạo thư mục data nếu chưa có
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(EXPENSES_DIR)) {
  fs.mkdirSync(EXPENSES_DIR);
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'expense-tracker-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ngày
  }
}));

// ============ USER FUNCTIONS ============

function loadUsers() {
  if (fs.existsSync(USERS_FILE)) {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  }
  return [];
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function getUserExpenseFile(userId) {
  return path.join(EXPENSES_DIR, `${userId}.json`);
}

function loadUserExpenses(userId) {
  const file = getUserExpenseFile(userId);
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  return [];
}

function saveUserExpenses(userId, expenses) {
  fs.writeFileSync(getUserExpenseFile(userId), JSON.stringify(expenses, null, 2));
}

// Middleware kiểm tra đăng nhập
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }
  next();
}

// ============ AUTH APIs ============

// Đăng ký
app.post('/api/register', async (req, res) => {
  const { username, password, name } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
  }

  if (username.length < 3) {
    return res.status(400).json({ error: 'Tên đăng nhập phải có ít nhất 3 ký tự' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 4 ký tự' });
  }

  const users = loadUsers();

  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: Date.now().toString(),
    username,
    password: hashedPassword,
    name,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  req.session.userId = newUser.id;
  req.session.userName = newUser.name;

  res.json({ success: true, name: newUser.name });
});

// Đăng nhập
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
  }

  const users = loadUsers();
  const user = users.find(u => u.username === username);

  if (!user) {
    return res.status(400).json({ error: 'Tên đăng nhập không tồn tại' });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(400).json({ error: 'Mật khẩu không đúng' });
  }

  req.session.userId = user.id;
  req.session.userName = user.name;

  res.json({ success: true, name: user.name });
});

// Đăng xuất
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Kiểm tra trạng thái đăng nhập
app.get('/api/me', (req, res) => {
  if (req.session.userId) {
    res.json({
      loggedIn: true,
      name: req.session.userName
    });
  } else {
    res.json({ loggedIn: false });
  }
});

// ============ EXPENSE APIs ============

// Lấy tất cả chi tiêu của user
app.get('/api/expenses', requireAuth, (req, res) => {
  const expenses = loadUserExpenses(req.session.userId);
  res.json(expenses);
});

// Thêm chi tiêu mới
app.post('/api/expenses', requireAuth, (req, res) => {
  const { description, amount, category } = req.body;

  if (!description || !amount) {
    return res.status(400).json({ error: 'Thiếu thông tin' });
  }

  const expenses = loadUserExpenses(req.session.userId);
  const newExpense = {
    id: Date.now(),
    description,
    amount: Number(amount),
    category: category || 'khác',
    date: new Date().toLocaleDateString('vi-VN'),
    timestamp: new Date().toISOString()
  };

  expenses.push(newExpense);
  saveUserExpenses(req.session.userId, expenses);
  res.json(newExpense);
});

// Xóa chi tiêu
app.delete('/api/expenses/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  let expenses = loadUserExpenses(req.session.userId);
  expenses = expenses.filter(e => e.id !== id);
  saveUserExpenses(req.session.userId, expenses);
  res.json({ success: true });
});

// Lấy thống kê
app.get('/api/stats', requireAuth, (req, res) => {
  const expenses = loadUserExpenses(req.session.userId);
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Thống kê theo danh mục
  const byCategory = {};
  expenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  });

  // Thống kê 7 ngày gần nhất
  const last7Days = {};
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('vi-VN');
    last7Days[dateStr] = 0;
  }

  expenses.forEach(e => {
    if (last7Days.hasOwnProperty(e.date)) {
      last7Days[e.date] += e.amount;
    }
  });

  // Thống kê theo tháng (12 tháng gần nhất)
  const byMonth = {};
  expenses.forEach(e => {
    const date = new Date(e.timestamp || Date.now());
    const monthKey = `${date.getMonth() + 1}/${date.getFullYear()}`;
    byMonth[monthKey] = (byMonth[monthKey] || 0) + e.amount;
  });

  res.json({
    total,
    byCategory,
    count: expenses.length,
    last7Days,
    byMonth
  });
});

// Khởi động server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ✨ Expense Tracker đang chạy!
  📱 http://localhost:${PORT}
  `);
});
