import express from 'express';
import { getIdleDrones, updateDroneStatus } from '../controllers/deliveryController.js';

const router = express.Router();

// Route lấy danh sách drone rảnh
router.get('/drones', getIdleDrones);

// Route cập nhật trạng thái drone
router.put('/drones/:id', updateDroneStatus);

export default router;