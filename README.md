# Nền tảng Không gian Học tập Trực tuyến Tích hợp AI và Cộng tác Thời gian thực

Chào mừng đến với dự án **Smart Collaborative Study Space**. Đây là một nền tảng học tập nhóm trực tuyến thời gian thực, cho phép người dùng tương tác sâu thông qua bảng trắng ảo (Whiteboard), chia sẻ tài liệu, và sử dụng Trợ lý AI để tự động tóm tắt bài giảng thành Sơ đồ tư duy (Mindmap).

Repository này được tổ chức theo kiến trúc **Monorepo**, chứa toàn bộ mã nguồn của cả hai phía: Client (Frontend) và Server (Backend).

## Kiến trúc Tổng thể (Architecture)

Dự án sử dụng mô hình Client-Server kết nối qua HTTP/RESTful cho các tác vụ thông thường (CRUD, Authentication, AI Processing) và sử dụng WebSocket (Socket.IO) cho các tác vụ yêu cầu độ trễ thấp (Real-time).

### 1. Công nghệ phía Client (Frontend)

- **Core Framework:** ReactJS (Khởi tạo siêu tốc với Vite).
- **Ngôn ngữ:** JavaScript / TypeScript.
- **Tương tác Đồ họa:** Fabric.js (Canvas API) để xử lý việc vẽ, tẩy, xóa trên bảng trắng.
- **Trực quan hóa Dữ liệu:** React Flow hoặc Markmap để tự động vẽ cây sơ đồ tư duy từ dữ liệu JSON của AI.
- **Real-time:** `socket.io-client` để đồng bộ chuột và nét vẽ.

### 2. Công nghệ phía Server (Backend)

- **Core Framework:** NestJS (Node.js framework với kiến trúc OOP, Dependency Injection).
- **Cơ sở dữ liệu:** PostgreSQL (Relational Database) - Lưu trữ User, Room, Message.
- **ORM:** Prisma - Tương tác với Database type-safe và an toàn.
- **Real-time Gateway:** Cấu hình Socket.IO Gateway tích hợp sẵn trong NestJS.
- **Xử lý AI:**
  - `pdf-parse`: Đọc và trích xuất chuỗi văn bản từ file PDF upload.
  - `@google/generative-ai`: Giao tiếp với Google Gemini 1.5 API.

---

## Vai trò và Phân công (Team Structure)

Dự án được phát triển bởi nhóm 3 thành viên trong vòng 3 tuần (125 giờ làm việc/người):

- **Vũ Nhật Minh (Backend Core & Canvas Sync):**
  Thiết kế ERD, cấu hình Postgres/Prisma. Chịu trách nhiệm viết Core API Auth, thao tác luồng dữ liệu của Bảng trắng bằng Fabric.js và tối ưu hóa hiệu năng đồng bộ realtime để nét vẽ không bị giật lag.
- **Nguyễn Thái Dũng (AI Integration & Socket Logic):**
  Xây dựng luồng giao tiếp với Gemini API, viết prompt tối ưu hóa kết quả trả về dạng JSON chuẩn xác. Cấu hình Socket Gateway, quản lý các Event (Join/Leave/Play/Pause Music).
- **Nguyễn Tùng Sơn (UI/UX & Data Visualization):**
  Thiết kế Layout tổng thể (Bảng trắng, Chat, Mindmap, Flashcard). Tiếp nhận luồng dữ liệu từ Backend, sử dụng React Flow để chuyển đổi JSON tĩnh thành cây Mindmap tương tác được trên màn hình.

---

## Quy chuẩn Code & Quản lý Git (Git Workflow & Standards)

Để hạn chế conflict code và lỗi hiển thị khi làm việc nhóm chéo thiết bị, nhóm tuân thủ BẮT BUỘC các quy tắc sau:

### 1. Quy tắc Git Branching

- **`main`**: Nhánh chỉ chứa code hoàn chỉnh, sẵn sàng deploy (Không ai được commit trực tiếp).
- **`develop`**: Nhánh gộp code chính của cả nhóm. Luôn pull nhánh này về máy trước khi làm việc.
- **`feature/ten-chuc-nang`**: Nhánh tạo ra khi làm task mới (VD: `feature/ai-mindmap`, `feature/auth-api`). Làm xong phải tạo Pull Request (PR) về nhánh `develop`.

### 2. Quy tắc Commit Message (Conventional Commits) & Đồng bộ LMS

100% bằng TIẾNG ANH. Bắt buộc phải chèn mã task của LMS vào câu commit theo định dạng Conventional Commits.
_(Lưu ý: Mỗi task trên LMS Rikkei đều có 1 mã riêng, ví dụ `T3F9A2C`. Phải lấy mã này từ web ném vào lịch sử code để hệ thống tự quét)._

- **Cấu trúc chèn mã Task:**
  - **`feat:`** Thêm một tính năng mới (VD: `feat(T3F9A2C): add live cursor sync on canvas`).
  - **`fix:`** Sửa một lỗi (VD: `fix(T3F9A2C): jwt token expiration bug`).
  - **`chore:`** Thay đổi cấu hình, cài đặt thư viện (VD: `chore(T3F9A2C): setup prisma and postgres`).
  - **`refactor:`** Viết lại code cho sạch đẹp, logic hơn mà không đổi tính năng.

_Đồng thời, khuyến khích nhóm chèn thêm mã task này vào tên nhánh (VD: `feature/T3F9A2C-auth`) hoặc tiêu đề Pull Request trên GitHub (VD: `[T3F9A2C] Hoan thanh tinh nang AI`) để hệ thống chấm điểm bắt sóng chính xác nhất._

### 3. Quy tắc Comment (Ghi chú trong Code)

**TUYỆT ĐỐI KHÔNG DÙNG TIẾNG VIỆT CÓ DẤU** để tránh lỗi encoding UTF-8 (ký tự bị biến dạng thành dấu ? hoặc ô vuông) khi mở trên Windows/Mac khác nhau.

- ĐÚNG: `// ham xu ly upload file va goi AI`
- SAI: `// hàm xử lý upload file và gọi AI`

---

## Hướng dẫn Cài đặt Môi trường (Getting Started)

Dự án yêu cầu bạn phải chạy song song cả Server và Client (Mở 2 Terminal khác nhau).

1. Clone dự án về máy:
   ```bash
   git clone https://github.com/nhatminhptit/Study-space.git
   cd Study-space
   ```
2. Hãy đọc hướng dẫn chi tiết trong từng thư mục để cài đặt và chạy ứng dụng:
   - Xem **[Tài liệu Backend (Server)](./server/README.md)**
   - Xem **[Tài liệu Frontend (Client)](./client/README.md)**
