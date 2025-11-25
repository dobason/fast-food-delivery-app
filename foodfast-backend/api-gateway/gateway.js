import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// 1. Cấu hình CORS chặt chẽ hơn nhưng vẫn mở cho development
// Cho phép Credentials để gửi cookie/token đăng nhập
app.use(cors({
    origin: true, // Cho phép mọi origin (hoặc thay bằng "*" nếu gặp lỗi strict)
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// 2. Body Parser cho endpoint nội bộ của Gateway
// QUAN TRỌNG: Chỉ áp dụng cho các route không phải là proxy để tránh lỗi body bị consume mất
app.use('/socket/emit', express.json());

// Log request để debug dễ dàng hơn
app.use((req, res, next) => {
    console.log(`[Gateway] ${req.method} ${req.originalUrl}`);
    next();
});

// --- CẤU HÌNH SOCKET.IO ---
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Socket.io thường cần "*" để dễ kết nối từ mobile/web khác port
        methods: ["GET", "POST"],
        credentials: true
    }
});

io.on("connection", (socket) => {
    console.log(`⚡ Client connected: ${socket.id}`);

    socket.on('join_order_room', (orderId) => {
        socket.join(orderId);
        // console.log(`Socket ${socket.id} joined room: ${orderId}`);
    });

    socket.onAny((eventName, ...args) => {
        io.emit(eventName, ...args);
    });

    socket.on("disconnect", () => {
        // console.log(`Client disconnected: ${socket.id}`);
    });
});

app.set('socketio', io);

// --- ENDPOINT NỘI BỘ ĐỂ SERVICE KHÁC GỌI SANG ---
app.post('/socket/emit', (req, res) => {
    try {
        const { event, room, data } = req.body;
        // console.log(`📣 Broadcasting: '${event}' to '${room || 'all'}'`);

        if (room) {
            io.to(room).emit(event, data);
        } else {
            io.emit(event, data);
        }
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Socket Emit Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- CẤU HÌNH PROXY ---
const services = [
    { route: '/api/users', target: 'http://user-service:3001' },
    { route: '/api/products', target: 'http://product-service:3002' },
    { route: '/api/orders', target: 'http://order-service:3003' },
    { route: '/api/payments', target: 'http://payment-service:3004' },
    { route: '/api/delivery', target: 'http://delivery-service:3005' },
    { route: '/api/branches', target: process.env.BRANCH_SERVICE_URL || 'http://branch-service:3006' },
];

services.forEach(({ route, target }) => {
    app.use(route, createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: { [`^${route}`]: '' },
        onProxyReq: (proxyReq, req, res) => {
            // Chỉ ghi lại body nếu có body và method là POST/PUT/PATCH
           if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method) && Object.keys(req.body).length > 0) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
           }
        },
        onError: (err, req, res) => {
            console.error(`Proxy Error (${route}):`, err.message);
            res.status(502).json({ message: "Bad Gateway", error: err.message });
        }
    }));
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`🚀 Gateway running on http://localhost:${PORT}`);
});