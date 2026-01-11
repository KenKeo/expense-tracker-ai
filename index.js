const fs = require('fs');
const readline = require('readline');

// File lưu trữ dữ liệu chi tiêu
const DATA_FILE = 'expenses.json';

// Đọc dữ liệu từ file
function loadExpenses() {
  if (fs.existsSync(DATA_FILE)) {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  }
  return [];
}

// Lưu dữ liệu vào file
function saveExpenses(expenses) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(expenses, null, 2));
}

// Thêm chi tiêu mới
function addExpense(expenses, description, amount, category) {
  const expense = {
    id: Date.now(),
    description: description,
    amount: amount,
    category: category,
    date: new Date().toLocaleDateString('vi-VN')
  };
  expenses.push(expense);
  saveExpenses(expenses);
  console.log('\n✓ Đã thêm chi tiêu thành công!\n');
}

// Hiển thị danh sách chi tiêu
function listExpenses(expenses) {
  if (expenses.length === 0) {
    console.log('\nChưa có chi tiêu nào.\n');
    return;
  }

  console.log('\n--- DANH SÁCH CHI TIÊU ---\n');
  expenses.forEach((expense, index) => {
    console.log(`${index + 1}. ${expense.description}`);
    console.log(`   Số tiền: ${expense.amount.toLocaleString('vi-VN')} VND`);
    console.log(`   Danh mục: ${expense.category}`);
    console.log(`   Ngày: ${expense.date}`);
    console.log('');
  });
}

// Tính tổng chi tiêu
function showTotal(expenses) {
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  console.log(`\n💰 Tổng chi tiêu: ${total.toLocaleString('vi-VN')} VND\n`);
}

// Xóa chi tiêu theo số thứ tự
function deleteExpense(expenses, index) {
  if (index < 1 || index > expenses.length) {
    console.log('\n❌ Số thứ tự không hợp lệ!\n');
    return expenses;
  }
  expenses.splice(index - 1, 1);
  saveExpenses(expenses);
  console.log('\n✓ Đã xóa chi tiêu thành công!\n');
  return expenses;
}

// Hiển thị menu
function showMenu() {
  console.log('=============================');
  console.log('   QUẢN LÝ CHI TIÊU CÁ NHÂN');
  console.log('=============================');
  console.log('1. Thêm chi tiêu mới');
  console.log('2. Xem danh sách chi tiêu');
  console.log('3. Xem tổng chi tiêu');
  console.log('4. Xóa chi tiêu');
  console.log('5. Thoát');
  console.log('-----------------------------');
}

// Hàm hỏi người dùng
function question(rl, query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

// Hàm chính
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  let expenses = loadExpenses();
  let running = true;

  console.log('\nChào mừng bạn đến với ứng dụng Quản lý Chi tiêu!\n');

  while (running) {
    showMenu();

    const choice = await question(rl, 'Chọn chức năng (1-5): ');

    switch (choice.trim()) {
      case '1':
        const desc = await question(rl, 'Mô tả chi tiêu: ');
        const amountStr = await question(rl, 'Số tiền (VND): ');
        const amount = parseInt(amountStr.replace(/[,.]/g, ''));

        if (isNaN(amount) || amount <= 0) {
          console.log('\n❌ Số tiền không hợp lệ!\n');
          break;
        }

        const category = await question(rl, 'Danh mục (ăn uống/di chuyển/mua sắm/khác): ');
        addExpense(expenses, desc, amount, category || 'khác');
        break;

      case '2':
        listExpenses(expenses);
        break;

      case '3':
        showTotal(expenses);
        break;

      case '4':
        listExpenses(expenses);
        if (expenses.length > 0) {
          const indexStr = await question(rl, 'Nhập số thứ tự cần xóa: ');
          const index = parseInt(indexStr);
          expenses = deleteExpense(expenses, index);
        }
        break;

      case '5':
        running = false;
        console.log('\nCảm ơn bạn đã sử dụng! Tạm biệt! 👋\n');
        break;

      default:
        console.log('\n❌ Lựa chọn không hợp lệ. Vui lòng chọn 1-5.\n');
    }
  }

  rl.close();
}

// Chạy ứng dụng
main();
