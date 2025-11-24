import Drone from '../models/droneModel.js';

// Lấy danh sách Drone đang rảnh (IDLE hoặc available)
export const getIdleDrones = async (req, res) => {
    try {
        // Tìm các drone có trạng thái rảnh
        const drones = await Drone.find({ 
            status: { $in: ['IDLE', 'available'] } 
        });
        res.json(drones);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách Drone' });
    }
};

// Cập nhật trạng thái Drone (Khi bắt đầu giao hàng)
export const updateDroneStatus = async (req, res) => {
    const { droneId, status, orderId } = req.body;
    try {
        const drone = await Drone.findById(droneId);
        if (drone) {
            drone.status = status || drone.status;
            if (orderId) drone.currentOrderId = orderId;
            
            const updatedDrone = await drone.save();
            res.json(updatedDrone);
        } else {
            res.status(404).json({ message: 'Không tìm thấy Drone' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
};