import mongoose from 'mongoose';

const droneSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    status: {
        type: String,
        required: true,
        // Sửa enum cho khớp với dữ liệu đã tạo trong Compass
        enum: ['IDLE', 'BUSY', 'MAINTENANCE', 'available', 'busy'], 
        default: 'IDLE',
    },
    battery: {
        type: Number,
        default: 100
    },
    currentOrderId: {
        type: String,
        default: null,
    },
    // Thêm vị trí để hiển thị trên bản đồ
    currentLocation: {
        lat: Number,
        lng: Number
    }
}, { timestamps: true });

const Drone = mongoose.model('Drone', droneSchema);
export default Drone;