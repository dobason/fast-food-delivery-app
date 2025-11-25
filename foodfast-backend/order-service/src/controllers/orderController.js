import Order from '../models/orderModel.js';
import axios from 'axios';

// Lấy URL Product Service từ biến môi trường (chuẩn Docker)
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002/api/products';

// @desc    Tạo đơn hàng mới
// @route   POST /
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
                fullName: shippingAddress?.fullName || "",
                email: shippingAddress?.email || "",
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

        // Gửi socket thông báo đơn mới (nếu cần, có thể dùng cơ chế gọi sang Gateway tương tự updateOrderStatus)
        // Hiện tại giữ nguyên logic cũ nếu req.io có sẵn (tuy nhiên trong kiến trúc microservice qua Gateway, req.io thường không có ở đây)
        // Tốt nhất là nên gọi sang Gateway như bên dưới updateOrderStatus nếu muốn đồng bộ hoàn toàn.
        
        res.status(201).json(createdOrder);

    } catch (error) {
        console.error("Create Order Error:", error);
        res.status(500).json({ message: 'Lỗi server khi tạo đơn', error: error.message });
    }
};

// @desc    Lấy danh sách đơn hàng của User
// @route   GET /myorders/:userId
export const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// @desc    Lấy chi tiết 1 đơn hàng
// @route   GET /:id
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

// @desc    Lấy tất cả đơn hàng (Admin)
// @route   GET /all
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

// @desc    Cập nhật thanh toán (User trả tiền)
// @route   PUT /:id/pay
export const updateOrderToPaid = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (order) {
            order.isPaid = true;
            order.paidAt = Date.now();
            // Cập nhật trạng thái theo Pipeline: Đã thanh toán -> Chờ duyệt
            order.status = 'PAID_WAITING_PROCESS'; 
            
            const updatedOrder = await order.save();
            
            // --- GỌI SANG GATEWAY ĐỂ BẮN SOCKET ---
            try {
                await axios.post('http://api-gateway:3000/socket/emit', {
                    event: 'status_update',
                    room: req.params.id, 
                    data: { 
                        status: 'PAID_WAITING_PROCESS',
                        isPaid: true,
                        _id: req.params.id
                    }
                });
                // Cũng báo cho Admin biết có thay đổi
                await axios.post('http://api-gateway:3000/socket/emit', {
                    event: 'admin_data_update',
                    data: { message: 'Order paid' }
                });
            } catch (socketError) {
                console.error("Socket Emit Error (Payment):", socketError.message);
            }
            // --------------------------------------

            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
    } catch (error) {
        console.error("Payment Error:", error);
        res.status(500).json({ message: 'Lỗi server khi thanh toán' });
    }
};

// @desc    Cập nhật trạng thái đơn hàng
// @route   PUT /:id/status
export const updateOrderStatus = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (order) {
            order.status = req.body.status || order.status;
            
            // --- THÊM validateModifiedOnly: true ---
            const updatedOrder = await order.save({ validateModifiedOnly: true });
            // ---------------------------------------
            
            // --- GỌI SANG GATEWAY ĐỂ BẮN SOCKET (CODE MỚI) ---
            try {
                console.log(`📡 Sending socket event for order ${order._id} to Gateway...`);
                
                // 1. Gửi cập nhật vào phòng riêng của đơn hàng (cho User & Admin đang xem chi tiết)
                await axios.post('http://api-gateway:3000/socket/emit', {
                    event: 'status_update',
                    room: req.params.id, // Room ID chính là Order ID
                    data: { 
                        status: updatedOrder.status,
                        droneId: updatedOrder.droneId,
                        _id: updatedOrder._id
                    }
                });

                // 2. Gửi cập nhật chung cho danh sách Admin (để list tự reload)
                await axios.post('http://api-gateway:3000/socket/emit', {
                    event: 'status_update', // Hoặc 'admin_data_update' tùy frontend hứng
                    // Không truyền room => Gửi broadcast tất cả
                    data: { 
                        _id: updatedOrder._id,
                        status: updatedOrder.status,
                        droneId: updatedOrder.droneId
                        // Có thể truyền thêm thông tin để list update nhanh
                    }
                });
                
                console.log("✅ Socket sent successfully");
            } catch (socketError) { 
                console.error("⚠️ Socket Error (Gateway unreachable?):", socketError.message); 
            }
            // -----------------------------------------------------

            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
    } catch (error) {
        console.error("Update Status Error:", error); 
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Gán Drone giao hàng (Admin dùng)
// @route   PUT /:id/assign-drone
export const assignDrone = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (order) {
            order.droneId = req.body.droneId;
            if (order.status === 'READY_TO_SHIP') {
                order.status = 'DRONE_ASSIGNED';
            }
            
            const updatedOrder = await order.save({ validateModifiedOnly: true });

            // --- GỌI SANG GATEWAY ĐỂ BẮN SOCKET ---
            try {
                await axios.post('http://api-gateway:3000/socket/emit', {
                    event: 'status_update',
                    room: req.params.id,
                    data: { 
                        status: updatedOrder.status,
                        droneId: updatedOrder.droneId,
                        _id: updatedOrder._id
                    }
                });
            } catch (socketError) {
                console.error("Socket Emit Error (Assign Drone):", socketError.message);
            }
            // --------------------------------------

            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
    } catch (error) {
        console.error("Assign Drone Error:", error); // Log lỗi
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Xóa đơn hàng (Admin)
// @route   DELETE /:id
export const deleteOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (order) {
            await order.deleteOne();
            
            // --- GỌI SANG GATEWAY ĐỂ BÁO ADMIN RELOAD ---
            try {
                await axios.post('http://api-gateway:3000/socket/emit', {
                    event: 'admin_data_update',
                    data: { message: 'Order deleted', id: req.params.id }
                });
            } catch (socketError) {
                console.error("Socket Emit Error (Delete):", socketError.message);
            }
            // --------------------------------------------
            
            res.json({ message: 'Đã xóa đơn hàng thành công' });
        } else {
            res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
};