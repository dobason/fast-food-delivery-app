import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';
import Drone from './src/models/droneModel.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://order-service:3003/api/orders';

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Delivery DB Connected'))
    .catch(err => console.log('❌ DB Error:', err));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// API 1: Lấy danh sách Drone
app.get('/api/delivery/drones', async (req, res) => {
    try {
        const drones = await Drone.find({});
        if (drones.length === 0) {
            // Tạo dữ liệu mẫu nếu chưa có
            await Drone.create([
                { name: "Drone Alpha 01", status: "IDLE", location: { lat: 10.7769, lng: 106.7009 } },
                { name: "Drone Beta 02", status: "IDLE", location: { lat: 10.7769, lng: 106.7009 } }
            ]);
            return res.json(await Drone.find({}));
        }
        res.json(drones);
    } catch (error) {
        res.json([{ _id: "temp1", name: "Drone Ảo", status: "IDLE" }]);
    }
});

// --- HÀM HỖ TRỢ TÍNH TOÁN TỌA ĐỘ (QUAN TRỌNG) ---
// Công thức: Điểm hiện tại = Điểm đầu + (Khoảng cách * % đã đi được)
const calculatePosition = (start, end, percent) => {
    return {
        lat: start.lat + (end.lat - start.lat) * (percent / 100),
        lng: start.lng + (end.lng - start.lng) * (percent / 100)
    };
};

// API 2: Bắt đầu giao hàng
app.post('/start-delivery', async (req, res) => {
    // Nhận thêm startLocation và endLocation từ Frontend gửi lên
    const { orderId, droneId, startLocation, endLocation } = req.body;

    // 1. Validate tọa độ: Nếu frontend không gửi, dùng tọa độ mặc định (Sài Gòn) để không crash app
    const pointA = startLocation || { lat: 10.7769, lng: 106.7009 }; // Mặc định: Chợ Bến Thành
    const pointB = endLocation || { lat: 10.8231, lng: 106.6297 };   // Mặc định: Sân bay TSN (Ví dụ)

    let assignedDroneName = "Drone Tự Động";
    if (droneId) {
        try {
            const drone = await Drone.findById(droneId);
            if (drone) assignedDroneName = drone.name;
        } catch (e) {
            assignedDroneName = "Drone " + droneId.slice(-4);
        }
    }

    console.log(`🚀 Bắt đầu giao đơn ${orderId}`);
    console.log(`📍 Lộ trình: Từ [${pointA.lat}, ${pointA.lng}] đến [${pointB.lat}, ${pointB.lng}]`);

    // 2. Gọi sang Order Service để gán Drone (Assign)
    try {
        await axios.put(`${ORDER_SERVICE_URL}/${orderId}/assign-drone`, {
            droneId: assignedDroneName
        });
        console.log("✅ Đã assign drone cho đơn hàng.");
    } catch (err) {
        console.error("⚠️ Không gọi được Order Service:", err.message);
    }

    res.status(200).json({ message: "Đã kích hoạt Drone bay theo lộ trình!" });

    // 3. LOGIC GIẢ LẬP BAY (Đã sửa thuật toán Vector)
    let progress = 0;
    
    // Tốc độ bay: Cứ mỗi 1.5s thì tăng 5% quãng đường (Bạn có thể chỉnh số này)
    const speedStep = 5; 
    const intervalTime = 1500; 

    const interval = setInterval(async () => {
        progress += speedStep;

        // --- THUẬT TOÁN MỚI: NỘI SUY TUYẾN TÍNH ---
        const currentLocation = calculatePosition(pointA, pointB, progress);
        // -------------------------------------------

        const statusToSend = progress < 100 ? 'DELIVERING' : 'DELIVERED';

        // Gửi Socket realtime về cho Client
        io.to(orderId).emit('status_update', {
            status: statusToSend,
            location: currentLocation, // Tọa độ chuẩn xác trên đường thẳng
            droneId: assignedDroneName,
            progress: progress
        });

        // Log nhẹ để debug
        // console.log(`🚁 Bay ${progress}% - Lat: ${currentLocation.lat.toFixed(4)}, Lng: ${currentLocation.lng.toFixed(4)}`);

        if (progress >= 100) {
            clearInterval(interval);
            try {
                // Cập nhật trạng thái cuối cùng là DELIVERED
                await axios.put(`${ORDER_SERVICE_URL}/${orderId}/status`, {
                    status: 'DELIVERED'
                });
                console.log(`🏁 Đơn ${orderId} đã giao thành công tới đích.`);
            } catch (err) {
                console.error("❌ Lỗi update status cuối cùng:", err.message);
            }
        }
    }, intervalTime);
});

io.on('connection', (socket) => {
    console.log('Client connected to socket:', socket.id);
    socket.on('join_order_room', (id) => {
        socket.join(id);
        console.log(`Client joined room: ${id}`);
    });
});

const PORT = process.env.PORT || 3005;
server.listen(PORT, () => console.log(`🚀 Delivery Service running on ${PORT}`));