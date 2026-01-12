const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ MIDDLEWARE (đặt trước để server start nhanh) ============

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'expense-tracker-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

// ============ START SERVER NGAY (không đợi MongoDB) ============

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✨ Server đang chạy tại port ${PORT}`);
});

// ============ MONGODB CONNECTION (kết nối sau) ============

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI chưa được cấu hình!');
} else {
  console.log('🔄 Đang kết nối MongoDB...');

  mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Đã kết nối MongoDB!'))
    .catch(err => console.error('❌ Lỗi MongoDB:', err.message));
}

// ============ MODELS ============

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const expenseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String, default: 'khác' },
  date: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Expense = mongoose.model('Expense', expenseSchema);

// ============ HELPER ============

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }
  next();
}

function checkDB(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database đang kết nối, vui lòng thử lại' });
  }
  next();
}

// ============ HEALTH CHECK ============

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'connecting',
    time: new Date().toISOString()
  });
});

// ============ AUTH APIs ============

app.post('/api/register', checkDB, async (req, res) => {
  try {
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

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, name });
    await newUser.save();

    req.session.userId = newUser._id;
    req.session.userName = newUser.name;

    res.json({ success: true, name: newUser.name });
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    res.status(500).json({ error: 'Có lỗi xảy ra' });
  }
});

app.post('/api/login', checkDB, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'Tên đăng nhập không tồn tại' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Mật khẩu không đúng' });
    }

    req.session.userId = user._id;
    req.session.userName = user.name;

    res.json({ success: true, name: user.name });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ error: 'Có lỗi xảy ra' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/me', (req, res) => {
  if (req.session.userId) {
    res.json({ loggedIn: true, name: req.session.userName });
  } else {
    res.json({ loggedIn: false });
  }
});

// ============ EXPENSE APIs ============

app.get('/api/expenses', requireAuth, checkDB, async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.session.userId }).sort({ createdAt: -1 });
    res.json(expenses);
  } catch (error) {
    console.error('Lỗi lấy chi tiêu:', error);
    res.status(500).json({ error: 'Có lỗi xảy ra' });
  }
});

app.post('/api/expenses', requireAuth, checkDB, async (req, res) => {
  try {
    const { description, amount, category } = req.body;

    if (!description || !amount) {
      return res.status(400).json({ error: 'Thiếu thông tin' });
    }

    const newExpense = new Expense({
      userId: req.session.userId,
      description,
      amount: Number(amount),
      category: category || 'khác',
      date: new Date().toLocaleDateString('vi-VN')
    });

    await newExpense.save();
    res.json(newExpense);
  } catch (error) {
    console.error('Lỗi thêm chi tiêu:', error);
    res.status(500).json({ error: 'Có lỗi xảy ra' });
  }
});

app.delete('/api/expenses/:id', requireAuth, checkDB, async (req, res) => {
  try {
    await Expense.findOneAndDelete({ _id: req.params.id, userId: req.session.userId });
    res.json({ success: true });
  } catch (error) {
    console.error('Lỗi xóa chi tiêu:', error);
    res.status(500).json({ error: 'Có lỗi xảy ra' });
  }
});

app.get('/api/stats', requireAuth, checkDB, async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.session.userId });
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    const byCategory = {};
    expenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });

    const last7Days = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      last7Days[date.toLocaleDateString('vi-VN')] = 0;
    }
    expenses.forEach(e => {
      if (last7Days.hasOwnProperty(e.date)) {
        last7Days[e.date] += e.amount;
      }
    });

    const byMonth = {};
    expenses.forEach(e => {
      const date = new Date(e.createdAt);
      const monthKey = `${date.getMonth() + 1}/${date.getFullYear()}`;
      byMonth[monthKey] = (byMonth[monthKey] || 0) + e.amount;
    });

    res.json({ total, byCategory, count: expenses.length, last7Days, byMonth });
  } catch (error) {
    console.error('Lỗi lấy thống kê:', error);
    res.status(500).json({ error: 'Có lỗi xảy ra' });
  }
});
