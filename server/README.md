# Frontend Client (ReactJS + Vite)

Đây là Giao diện Người dùng (UI) cho nền tảng Smart Collaborative Study Space. Ứng dụng được thiết kế theo hướng SPA (Single Page Application) sử dụng React, đảm bảo trải nghiệm học tập, vẽ bảng, và tương tác thời gian thực mượt mà mà không cần tải lại trang.

## Công nghệ Cốt lõi (Core Tech Stack)

- **Build Tool:** Vite (Cực nhanh, Hỗ trợ Hot Module Replacement).
- **Core Library:** React 18 (Sử dụng Functional Component & Hooks).
- **Routing:** React Router v6.
- **Styling:** Tailwind CSS (Tiện dụng, xây dựng UI nhất quán).
- **Trạng thái Toàn cục (State Management):** Context API + React Hooks (Quản lý User Session và Socket Instance).
- **Whiteboard:** Fabric.js (Thao tác Vector Objects trên Canvas, dễ dàng lấy/cập nhật tọa độ nét vẽ).
- **AI Mindmap Render:** React Flow (Hoặc Markmap) dùng để biến JSON (từ Backend trả về) thành biểu đồ tương tác, có thể Zoom/Pan.

---

## Biến Môi Trường (Environment Variables)

Vite yêu cầu tất cả các biến môi trường cấu hình tại Frontend phải bắt đầu bằng tiền tố `VITE_`.
Tạo file `.env` ở thư mục `client/` và thêm các nội dung sau:

```env
# URL trỏ tới các API endpoint của Backend
VITE_API_URL="http://localhost:3000/api"

# URL trỏ tới Socket.IO Server để thiết lập WebSocket
VITE_SOCKET_URL="http://localhost:3000"
```

---

## Hướng dẫn Khởi chạy (Running the Client)

Mở một cửa sổ Terminal mới, chuyển vào thư mục `client/` và chạy lệnh:

**1. Cài đặt các gói phụ thuộc (Dependencies):**

```bash
npm install
# hoặc yarn install
```

**2. Chạy ứng dụng (Môi trường Dev):**

```bash
npm run dev
```

Vite sẽ build tức thời và cung cấp địa chỉ truy cập cục bộ (Thường là `http://localhost:5173`).

**3. Build cho Production (Khi deploy lên VPS):**

```bash
npm run build
```

Vite sẽ tối ưu hóa code và xuất toàn bộ file tĩnh (HTML, CSS, JS) vào thư mục `dist/`.

---

## Cấu trúc Thư mục (Directory Structure)

Kiến trúc thư mục được thiết kế theo chức năng (Feature-based), giúp dễ dàng scale ứng dụng khi thêm tính năng mới.

```text
client/
├── public/                 # Chứa các tài nguyên tĩnh (favicon, images)
├── src/
│   ├── assets/             # Hình ảnh, file CSS dùng chung
│   ├── components/         # Các thành phần tái sử dụng (Buttons, Modals, Inputs)
│   ├── contexts/           # State Global (AuthContext.jsx, SocketContext.jsx)
│   ├── hooks/              # Custom Hooks (useSocket, useAuth, useFabricCanvas)
│   ├── pages/              # Các trang chính của ứng dụng
│   │   ├── Login/          # Giao diện Đăng nhập / Đăng ký
│   │   ├── Dashboard/      # Trang quản lý danh sách phòng học
│   │   └── StudyRoom/      # Giao diện chính của Phòng học (Layout tổng)
│   │       ├── Whiteboard/ # Component Bảng trắng Fabric.js
│   │       ├── Mindmap/    # Component React Flow render biểu đồ
│   │       ├── ChatBox/    # Cửa sổ tin nhắn Socket
│   │       └── MusicPlayer/# Cửa sổ đồng bộ nhạc
│   ├── services/           # Gọi API qua Axios (api.js, authService.js)
│   ├── utils/              # Các hàm tiện ích (formatDate, parseJSON)
│   ├── App.jsx             # Component Root, cấu hình Routes
│   └── main.jsx            # Entry point của React
├── .env
├── tailwind.config.js      # Cấu hình TailwindCSS
└── package.json
```

---

## Hướng dẫn Triển khai Tính năng Đặc thù

### 1. Đồng bộ Bảng trắng (Whiteboard Real-time)

- Component `Whiteboard.jsx` dùng `useEffect` khởi tạo 1 instance của `new fabric.Canvas()`.
- Bắt sự kiện `canvas.on('path:created')` -> Dùng `JSON.stringify` chuyển nét vẽ thành Object -> Bắn lên Backend bằng `socket.emit('draw', object)`.
- Lắng nghe `socket.on('onDraw')` -> Dùng `canvas.loadFromJSON()` để vẽ thêm nét đó vào màn hình của người khác.

### 2. Tạo AI Mindmap & Flashcard

- User bấm Upload PDF -> Component gọi tới `/api/document/upload`.
- Đợi màn hình Loading chờ AI xử lý xong.
- Backend trả về dữ liệu chuẩn JSON. Dữ liệu này được đưa thẳng vào `initialNodes` và `initialEdges` của thư viện `React Flow` để tự động render thành cây.
- (Phần Bonus) Mảng JSON câu hỏi được map vào component Flip Card (thẻ lật bằng CSS `transform: rotateY(180deg)`) để ôn tập Flashcard.
