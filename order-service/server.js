import express from 'express';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';

// --- SỬA ĐƯỜNG DẪN IMPORT (Nếu file của bạn nằm ở src/config/db.js thì dùng dòng này) ---
// Nếu bạn không có file db.js riêng, có thể kết nối trực tiếp trong này như bên dưới
// import connectDB from './src/config/db.js'; 
import orderRoutes from './src/routes/orderRoutes.js'; 

dotenv.config();

const app = express();

// Kết nối MongoDB trực tiếp tại đây để đảm bảo ổn định
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Order Service connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

app.use(cors());

// --- CẤU HÌNH QUAN TRỌNG: TĂNG GIỚI HẠN NHẬN DỮ LIỆU LÊN 50MB (Để nhận ảnh) ---
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// ---------------------------------------------------------------

// --- KHỞI TẠO SOCKET.IO ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        // Dấu * nghĩa là chấp nhận kết nối từ MỌI NƠI (mọi IP)
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});

// Gắn Socket.io vào request để Controller dùng được (req.io)
app.use((req, res, next) => {
    req.io = io;
    next();
});

// --- LẮNG NGHE SỰ KIỆN SOCKET ---
io.on('connection', (socket) => {
    console.log('🔌 New client connected to Order Socket:', socket.id);

    // 1. Room cho Admin (Theo dõi toàn bộ chi nhánh)
    socket.on('join_branch', (branchId) => {
        if (branchId) {
            socket.join(branchId);
            console.log(`User ${socket.id} joined branch room: ${branchId}`);
        }
    });

    // 2. Room cho Khách hàng (Theo dõi đơn hàng cụ thể) <--- QUAN TRỌNG CHO TRACKING
    socket.on('join_order_room', (orderId) => {
        if (orderId) {
            socket.join(orderId);
            console.log(`User ${socket.id} joined order room: ${orderId}`);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// --- ROUTES ---
// Lưu ý: Gateway đã cắt '/api/orders' rồi, nên ở đây dùng '/' là đúng
app.use('/', orderRoutes);

app.get('/', (req, res) => {
    res.send('API Order Service is running...');
});

const PORT = process.env.PORT || 3003;

server.listen(PORT, () => {
    console.log(`🚀 Order Service running on port ${PORT}`);
});