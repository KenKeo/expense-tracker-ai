// ============ UTILITIES ============

function formatMoney(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}

function getCategoryIcon(category) {
  const icons = {
    'ăn uống': '🍜',
    'di chuyển': '🚗',
    'mua sắm': '🛒',
    'giải trí': '🎮',
    'hóa đơn': '📄',
    'khác': '📦'
  };
  return icons[category] || '📦';
}

function getCategoryClass(category) {
  const classes = {
    'ăn uống': 'food',
    'di chuyển': 'transport',
    'mua sắm': 'shopping',
    'giải trí': 'entertainment',
    'hóa đơn': 'bill',
    'khác': 'other'
  };
  return classes[category] || 'other';
}

// ============ AUTH ============

async function checkAuth() {
  try {
    const response = await fetch('/api/me');
    const data = await response.json();

    if (data.loggedIn) {
      showApp(data.name);
    } else {
      showAuth();
    }
  } catch (error) {
    showAuth();
  }
}

function showAuth() {
  document.getElementById('authSection').style.display = 'flex';
  document.getElementById('appSection').style.display = 'none';
}

function showApp(name) {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('appSection').style.display = 'block';
  document.getElementById('userName').textContent = name;
  loadExpenses();
}

function showError(message) {
  const errorDiv = document.getElementById('authError');
  errorDiv.textContent = message;
  setTimeout(() => errorDiv.textContent = '', 3000);
}

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (response.ok) {
      showApp(data.name);
    } else {
      showError(data.error);
    }
  } catch (error) {
    showError('Có lỗi xảy ra, vui lòng thử lại');
  }
});

// Register
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('registerName').value;
  const username = document.getElementById('registerUsername').value;
  const password = document.getElementById('registerPassword').value;

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, password })
    });

    const data = await response.json();
    if (response.ok) {
      showApp(data.name);
    } else {
      showError(data.error);
    }
  } catch (error) {
    showError('Có lỗi xảy ra, vui lòng thử lại');
  }
});

// Toggle forms
document.getElementById('showRegister').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';
});

document.getElementById('showLogin').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  showAuth();
});

// ============ TABS ============

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');

    if (tab.dataset.tab === 'chart') {
      loadStats();
    }
  });
});

// ============ EXPENSES ============

async function loadExpenses() {
  try {
    const response = await fetch('/api/expenses');
    if (response.status === 401) {
      showAuth();
      return;
    }
    const expenses = await response.json();
    renderExpenses(expenses);
    loadStats();
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu:', error);
  }
}

function renderExpenses(expenses) {
  const container = document.getElementById('expenseList');

  if (expenses.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <p>Chưa có chi tiêu nào</p>
      </div>
    `;
    return;
  }

  container.innerHTML = expenses.map(expense => `
    <div class="expense-item">
      <div class="expense-icon ${getCategoryClass(expense.category)}">
        ${getCategoryIcon(expense.category)}
      </div>
      <div class="expense-info">
        <div class="expense-desc">${expense.description}</div>
        <div class="expense-meta">${expense.category} • ${expense.date}</div>
      </div>
      <div class="expense-amount">-${formatMoney(expense.amount)}</div>
      <button class="expense-delete" onclick="deleteExpense('${expense._id}')" title="Xóa">
        ✕
      </button>
    </div>
  `).join('');
}

async function addExpense(description, amount, category) {
  try {
    const response = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, amount, category })
    });

    if (response.ok) {
      loadExpenses();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Lỗi khi thêm chi tiêu:', error);
    return false;
  }
}

async function deleteExpense(id) {
  if (!confirm('Bạn có chắc muốn xóa chi tiêu này?')) return;

  try {
    const response = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    if (response.ok) {
      loadExpenses();
    }
  } catch (error) {
    console.error('Lỗi khi xóa chi tiêu:', error);
  }
}

document.getElementById('expenseForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const description = document.getElementById('description').value.trim();
  const amount = document.getElementById('amount').value;
  const category = document.getElementById('category').value;

  if (!description || !amount) {
    alert('Vui lòng nhập đầy đủ thông tin!');
    return;
  }

  const success = await addExpense(description, amount, category);

  if (success) {
    document.getElementById('description').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('category').selectedIndex = 0;
    document.getElementById('description').focus();
  }
});

// ============ CHARTS ============

let categoryChart = null;
let weeklyChart = null;

async function loadStats() {
  try {
    const response = await fetch('/api/stats');
    if (!response.ok) return;

    const stats = await response.json();

    document.getElementById('totalAmount').textContent = formatMoney(stats.total);
    document.getElementById('totalCount').textContent = stats.count;

    renderCategoryChart(stats.byCategory);
    renderWeeklyChart(stats.last7Days);
  } catch (error) {
    console.error('Lỗi khi tải thống kê:', error);
  }
}

function renderCategoryChart(byCategory) {
  const ctx = document.getElementById('categoryChart').getContext('2d');

  if (categoryChart) {
    categoryChart.destroy();
  }

  const labels = Object.keys(byCategory);
  const data = Object.values(byCategory);

  if (labels.length === 0) {
    return;
  }

  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
  ];

  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.map(l => getCategoryIcon(l) + ' ' + l),
      datasets: [{
        data: data,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return formatMoney(context.raw);
            }
          }
        }
      }
    }
  });
}

function renderWeeklyChart(last7Days) {
  const ctx = document.getElementById('weeklyChart').getContext('2d');

  if (weeklyChart) {
    weeklyChart.destroy();
  }

  const labels = Object.keys(last7Days);
  const data = Object.values(last7Days);

  weeklyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.map(l => l.split('/').slice(0, 2).join('/')),
      datasets: [{
        label: 'Chi tiêu',
        data: data,
        backgroundColor: 'rgba(102, 126, 234, 0.8)',
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return formatMoney(context.raw);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              if (value >= 1000000) {
                return (value / 1000000) + 'M';
              } else if (value >= 1000) {
                return (value / 1000) + 'K';
              }
              return value;
            }
          }
        }
      }
    }
  });
}

// ============ INIT ============

document.addEventListener('DOMContentLoaded', checkAuth);
