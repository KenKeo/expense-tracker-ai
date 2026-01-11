# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ứng dụng theo dõi chi tiêu cá nhân đơn giản chạy trên terminal (CLI), được xây dựng với Node.js thuần (không dùng framework).

## Build/Test/Run Commands

```bash
npm start        # Chạy ứng dụng
node index.js    # Chạy trực tiếp
```

## Architecture

- `index.js` - File chính chứa toàn bộ logic ứng dụng
- `expenses.json` - File lưu trữ dữ liệu chi tiêu (tự động tạo khi thêm chi tiêu đầu tiên)

Ứng dụng sử dụng các module có sẵn của Node.js:
- `fs` - Đọc/ghi file
- `readline` - Nhận input từ người dùng qua terminal
