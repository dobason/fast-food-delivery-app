import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';

dotenv.config();

const app = express();

// Cho phép CORS cho mọi miền
app.use(cors());

// Log request để dễ debug
app.use((req, res, next) => {
    console.log(`[Gateway] Received request: ${req.method} ${req.originalUrl}`);
    next();
});

// --- CẤU HÌNH PROXY ---
// Lưu ý: KHÔNG ĐƯỢC DÙNG app.use(express.json()) Ở ĐÂY
// Gateway chỉ chuyển tiếp stream, không parse body.

const services = [
    {
        route: '/api/users',
        target: 'http://user-service:3001',
    },
    {
        route: '/api/products',
        target: 'http://product-service:3002',
    },
    {
        route: '/api/orders',
        target: 'http://order-service:3003',
    },
    {
        route: '/api/payments',
        target: 'http://payment-service:3004',
    },
    {
        route: '/api/delivery',
        target: 'http://delivery-service:3005',
    },
    {
        route: '/api/branches',
        // Dùng biến môi trường hoặc fallback về container name
        target: process.env.BRANCH_SERVICE_URL || 'http://branch-service:3006',
    },
];

// Tạo Proxy cho từng service
services.forEach(({ route, target }) => {
    const proxyOptions = {
        target,
        changeOrigin: true,
        pathRewrite: {
            [`^${route}`]: '', // Cắt bỏ tiền tố /api/xyz khi gửi đến service con
        },
        // Tăng timeout để tránh lỗi khi upload ảnh nặng
        proxyTimeout: 300000, // 5 phút
        timeout: 300000,
    };
    app.use(route, createProxyMiddleware(proxyOptions));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 API Gateway is running on http://localhost:${PORT}`);
});