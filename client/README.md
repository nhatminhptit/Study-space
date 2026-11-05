# Backend Server (NestJS & Prisma)

Phần Backend của ứng dụng cung cấp tập hợp các RESTful API phục vụ xác thực người dùng, tải file, giao tiếp với AI, cùng với một WebSockets Gateway chịu trách nhiệm đồng bộ trạng thái trực tuyến cho các luồng học tập nhóm.

## Yêu cầu Hệ thống (Prerequisites)

- **Node.js**: Phiên bản LTS (v18.x hoặc v20.x). Kiểm tra bằng lệnh `node -v`.
- **NPM/Yarn**: Quản lý gói thư viện.
- **PostgreSQL**: Cài đặt DB nội bộ (localhost) hoặc sử dụng DB Cloud (như Supabase, Neon).
- **Gemini API Key**: Đăng ký từ Google AI Studio.

---

## Biến Môi Trường (Environment Variables)

Tạo một file `.env` tại thư mục gốc `server/` và cung cấp các giá trị sau. Tuyệt đối không commit file này lên GitHub:

```env
# Cổng chạy ứng dụng (Mặc định 3000)
PORT=3000

# Chuỗi kết nối Database Postgres
# Cú pháp: postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE_NAME]?schema=public
DATABASE_URL="postgresql://postgres:123456@localhost:5432/fjs_study_space?schema=public"

# Bảo mật JWT
JWT_SECRET="mot_chuoi_bi_mat_rat_dai_va_kho_doan_cua_nhom_1"
JWT_EXPIRES_IN="7d"

# Google Gemini AI
GEMINI_API_KEY="AIzaSy..._your_api_key_here_..."
```

---

## Hướng dẫn Cài đặt và Khởi chạy (Installation & Run)

Mở Terminal, di chuyển vào thư mục `server/` và thực hiện tuần tự các bước:

**1. Cài đặt các gói phụ thuộc (Dependencies):**

```bash
npm install
```

**2. Khởi tạo Cơ sở dữ liệu với Prisma:**
Lệnh dưới đây sẽ đọc file `prisma/schema.prisma` và tự động tạo các bảng trong PostgreSQL của bạn.

```bash
npx prisma db push
npx prisma generate
```

**3. Chạy Server (Môi trường Dev):**

```bash
npm run start:dev
```

Nếu thành công, console sẽ báo Nest Application được khởi chạy tại `http://localhost:3000`.

---

## Cấu trúc Thư mục (Directory Structure)

Dự án áp dụng kiến trúc Modular của NestJS, mỗi chức năng được cô lập trong 1 thư mục riêng (`module`, `controller`, `service`).

```text
server/
├── prisma/
│   └── schema.prisma         # Định nghĩa các Model Database
├── src/
│   ├── auth/                 # Module xử lý Đăng nhập, Đăng ký, JWT
│   ├── users/                # Module thao tác dữ liệu người dùng
│   ├── rooms/                # Module quản lý Phòng học nhóm
│   ├── chat/                 # Module xử lý tin nhắn
│   ├── document/             # Module xử lý Upload PDF (Multer) & Parse PDF
│   ├── ai-gemini/            # Module gọi Google Gemini tạo Mindmap, Flashcard
│   ├── gateways/             # Chứa cấu hình Socket.IO chung cho toàn app
│   ├── app.module.ts         # Module gốc
│   └── main.ts               # File khởi chạy ứng dụng (Bootstrap)
├── .env                      # File biến môi trường (Git ignored)
└── package.json
```

---

## Từ điển Sự kiện Socket (Socket Event Dictionary)

Đây là tài liệu Contract quan trọng để Dev Frontend và Backend kết nối đúng với nhau. Gateway lắng nghe tại Namespace `/room`.

### Client Emit (Gửi lên Server)

- `joinRoom`: Gửi kèm `{ roomId, userId }` -> Server thêm client vào Socket Room.
- `leaveRoom`: Rời khỏi phòng học.
- `draw`: Gửi tọa độ `{ x, y, type, color }` từ bảng trắng Fabric.js.
- `cursorMove`: Gửi tọa độ chuột `{ x, y, userId }` để làm tính năng Live Cursor.
- `musicAction`: Gửi trạng thái `{ action: 'play' | 'pause', currentTime }`.
- `sendMessage`: Gửi nội dung tin nhắn phòng chat.

### Server Broadcast (Phát về các Client khác trong phòng)

- `userJoined`: Cập nhật danh sách user online.
- `userLeft`: Xóa user khỏi danh sách online.
- `onDraw`: Nhận nét vẽ từ người khác để render lại trên Canvas cục bộ.
- `onCursorMove`: Cập nhật vị trí chuột ảo của người khác.
- `onMusicAction`: Đồng bộ hành động Play/Pause nhạc.
- `newMessage`: Nhận tin nhắn mới.

Mọi chi tiết xử lý lỗi (Exception Filter) vui lòng tham khảo mã nguồn trực tiếp.
