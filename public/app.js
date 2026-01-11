// Định dạng tiền VND
function formatMoney(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}

// Lấy icon theo danh mục
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

// Lấy class cho icon theo danh mục
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

// Tải danh sách chi tiêu
async function loadExpenses() {
  try {
    const response = await fetch('/api/expenses');
    const expenses = await response.json();
    renderExpenses(expenses);
    loadStats();
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu:', error);
  }
}

// Tải thống kê
async function loadStats() {
  try {
    const response = await fetch('/api/stats');
    const stats = await response.json();

    document.getElementById('totalAmount').textContent = formatMoney(stats.total);
    document.getElementById('totalCount').textContent = stats.count;

    renderCategoryStats(stats.byCategory, stats.total);
  } catch (error) {
    console.error('Lỗi khi tải thống kê:', error);
  }
}

// Render danh sách chi tiêu
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

  // Sắp xếp theo thời gian mới nhất
  expenses.sort((a, b) => b.id - a.id);

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
      <button class="expense-delete" onclick="deleteExpense(${expense.id})" title="Xóa">
        ✕
      </button>
    </div>
  `).join('');
}

// Render thống kê theo danh mục
function renderCategoryStats(byCategory, total) {
  const container = document.getElementById('categoryStats');

  if (Object.keys(byCategory).length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Chưa có dữ liệu thống kê</p>
      </div>
    `;
    return;
  }

  // Sắp xếp theo số tiền giảm dần
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const maxAmount = sorted[0][1];

  container.innerHTML = sorted.map(([category, amount]) => {
    const percentage = (amount / maxAmount) * 100;
    return `
      <div class="category-item">
        <div class="category-name">${getCategoryIcon(category)} ${category}</div>
        <div class="category-bar-container">
          <div class="category-bar" style="width: ${percentage}%"></div>
        </div>
        <div class="category-amount">${formatMoney(amount)}</div>
      </div>
    `;
  }).join('');
}

// Thêm chi tiêu mới
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

// Xóa chi tiêu
async function deleteExpense(id) {
  if (!confirm('Bạn có chắc muốn xóa chi tiêu này?')) return;

  try {
    const response = await fetch(`/api/expenses/${id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      loadExpenses();
    }
  } catch (error) {
    console.error('Lỗi khi xóa chi tiêu:', error);
  }
}

// Xử lý form submit
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
    // Reset form
    document.getElementById('description').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('category').selectedIndex = 0;

    // Focus vào ô mô tả
    document.getElementById('description').focus();
  }
});

// Tải dữ liệu khi trang load
document.addEventListener('DOMContentLoaded', loadExpenses);
