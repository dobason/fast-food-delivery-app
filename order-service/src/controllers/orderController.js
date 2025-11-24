import Order from '../models/orderModel.js';
import axios from 'axios';

// Lấy URL Product Service từ biến môi trường (chuẩn Docker)
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002/api/products';

// @desc    Tạo đơn hàng mới
// @route   POST /
export const createOrder = async (req, res) => {
    try {
        const { userId, orderItems, shippingAddress, branchId, paymentMethod } = req.body;

        if (!orderItems || orderItems.length === 0) {
            return res.status(400).json({ message: 'Không có sản phẩm nào' });
        }
        if (!branchId) {
            return res.status(400).json({ message: 'Thiếu thông tin chi nhánh (branchId)' });
        }

        let calculatedTotalPrice = 0;
        const itemsToSave = [];

        // Lặp qua từng sản phẩm để lấy giá gốc từ Product Service
        for (const item of orderItems) {
            const productId = item.product || item.productId; 
            try {
                const { data: productFromDB } = await axios.get(`${PRODUCT_SERVICE_URL}/${productId}`);
                if (!productFromDB) continue;

                let finalItemPrice = Number(productFromDB.price);
                const quantity = Number(item.qty || item.quantity || 1);

                calculatedTotalPrice += finalItemPrice * quantity;

                itemsToSave.push({
                    product: productId,
                    name: productFromDB.name,
                    image: productFromDB.image || productFromDB.imageUrl,
                    qty: quantity,
                    price: finalItemPrice,
                    selectedOptions: item.selectedOptions || [],
                    note: item.note
                });
            } catch (err) {
                console.error(`Lỗi kết nối Product Service (ID: ${productId}):`, err.message);
            }
        }

        const shippingPrice = calculatedTotalPrice >= 100000 ? 0 : 30000;
        const finalTotal = calculatedTotalPrice + shippingPrice;

        const order = new Order({
            userId: userId || "guest",
            branchId: branchId,
            orderItems: itemsToSave,
            shippingAddress: {
                fullName: shippingAddress?.fullName || "", // <--- THÊM
                email: shippingAddress?.email || "",       // <--- THÊM
                address: shippingAddress?.address || "",
                city: shippingAddress?.city || "",
                phone: shippingAddress?.phone || "",
                country: 'Vietnam'
            },
            paymentMethod: paymentMethod || 'COD',
            itemsPrice: calculatedTotalPrice,
            shippingPrice: shippingPrice,
            totalPrice: finalTotal,
            status: 'PENDING_PAYMENT' // Trạng thái khởi tạo chuẩn
        });

        const createdOrder = await order.save();

        if (req.io) {
            req.io.to(branchId).emit('new_order', createdOrder);
            req.io.emit('admin_data_update');
        }

        res.status(201).json(createdOrder);

    } catch (error) {
        console.error("Create Order Error:", error);
        res.status(500).json({ message: 'Lỗi server khi tạo đơn', error: error.message });
    }
};

// @desc    Lấy danh sách đơn hàng của User
// @route   GET /myorders/:userId
export const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// @desc    Lấy chi tiết 1 đơn hàng
// @route   GET /:id
export const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (order) {
            res.json(order);
        } else {
            res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// @desc    Lấy tất cả đơn hàng (Admin)
// @route   GET /all
export const getAllOrders = async (req, res) => {
    try {
        const { branchId } = req.query;
        let query = {};
        if (branchId) query.branchId = branchId;
        const orders = await Order.find(query).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// @desc    Cập nhật thanh toán (User trả tiền)
// @route   PUT /:id/pay
export const updateOrderToPaid = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (order) {
            order.isPaid = true;
            order.paidAt = Date.now();
            // Cập nhật trạng thái theo Pipeline: Đã thanh toán -> Chờ duyệt
            order.status = 'PAID_WAITING_PROCESS'; 
            
            const updatedOrder = await order.save();
            
            // Bắn socket thông báo
            if (req.io) {
                req.io.emit('admin_data_update');
                req.io.to(req.params.id).emit('status_update', { 
                    status: 'PAID_WAITING_PROCESS',
                    isPaid: true
                });
            }
            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
    } catch (error) {
        console.error("Payment Error:", error);
        res.status(500).json({ message: 'Lỗi server khi thanh toán' });
    }
};

// @desc    Cập nhật trạng thái đơn hàng
// @route   PUT /:id/status
export const updateOrderStatus = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (order) {
            order.status = req.body.status || order.status;
            
            // --- THÊM validateModifiedOnly: true ---
            const updatedOrder = await order.save({ validateModifiedOnly: true });
            // ---------------------------------------
            
            if (req.io) {
                try {
                    req.io.emit('admin_data_update');
                    req.io.to(req.params.id).emit('status_update', { 
                        status: updatedOrder.status,
                        droneId: updatedOrder.droneId
                    });
                } catch (socketError) { console.error("Socket Error:", socketError.message); }
            }
            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
    } catch (error) {
        console.error("Update Status Error:", error); 
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Gán Drone giao hàng (Admin dùng)
// @route   PUT /:id/assign-drone
export const assignDrone = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (order) {
            order.droneId = req.body.droneId;
            if (order.status === 'READY_TO_SHIP') {
                order.status = 'DRONE_ASSIGNED';
            }
            
            // --- THÊM validateModifiedOnly: true ĐỂ TRÁNH LỖI DỮ LIỆU CŨ ---
            const updatedOrder = await order.save({ validateModifiedOnly: true });
            // --------------------------------------------------------------

            if (req.io) {
                req.io.to(req.params.id).emit('status_update', { 
                    status: updatedOrder.status,
                    droneId: updatedOrder.droneId 
                });
            }
            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
    } catch (error) {
        console.error("Assign Drone Error:", error); // Log lỗi
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Xóa đơn hàng (Admin)
// @route   DELETE /:id
export const deleteOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (order) {
            await order.deleteOne();
            
            if (req.io) {
                 req.io.emit('admin_data_update'); // Báo Admin reload danh sách
            }
            
            res.json({ message: 'Đã xóa đơn hàng thành công' });
        } else {
            res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
};