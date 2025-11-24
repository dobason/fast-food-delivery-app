import mongoose from 'mongoose';

const orderSchema = mongoose.Schema(
    {
        userId: { type: String, required: true }, // Giữ String để linh hoạt giữa các service
        branchId: { type: String, required: true },
        
        orderItems: [
            {
                name: { type: String, required: true },
                qty: { type: Number, required: true },
                image: { type: String },
                price: { type: Number, required: true },
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    // Lưu ý: ref này chỉ có tác dụng nếu bạn sync dữ liệu, 
                    // trong microservices thường chỉ lưu ID thôi.
                    ref: 'Product', 
                    required: true,
                },
            },
        ],
        
        shippingAddress: {
            fullName: { type: String, required: true }, // <--- THÊM DÒNG NÀY
            email: { type: String, required: true },    // <--- THÊM DÒNG NÀY
            address: { type: String, required: true },
            city: { type: String, required: true },
            phone: { type: String, required: true },
            country: { type: String, default: 'Vietnam' },
        },
        
        paymentMethod: { type: String, required: true },
        
        paymentResult: {
            id: { type: String },
            status: { type: String },
            update_time: { type: String },
            email_address: { type: String },
        },

        // --- GIÁ TIỀN (Đã bổ sung đầy đủ) ---
        itemsPrice: { type: Number, required: true, default: 0.0 },
        shippingPrice: { type: Number, required: true, default: 0.0 },
        totalPrice: { type: Number, required: true, default: 0.0 },

        // --- TRẠNG THÁI THANH TOÁN ---
        isPaid: { type: Boolean, required: true, default: false },
        paidAt: { type: Date },

        // --- TRẠNG THÁI GIAO HÀNG ---
        isDelivered: { type: Boolean, required: true, default: false },
        deliveredAt: { type: Date },

        // --- [QUAN TRỌNG] CẬP NHẬT STATUS THEO PIPELINE ---
        status: {
            type: String,
            required: true,
            default: 'PENDING_PAYMENT',
            enum: [
                'PENDING_PAYMENT',      // 1. Mới đặt, chưa thanh toán
                'PAID_WAITING_PROCESS', // 2. Đã thanh toán, chờ Quán xác nhận
                'PREPARING',            // 3. Quán đang chuẩn bị món
                'READY_TO_SHIP',        // 4. Đã xong & Đóng gói -> Chờ Drone
                'DRONE_ASSIGNED',       // 5. Admin đã điều phối Drone
                'DELIVERING',           // 6. Drone đang bay
                'DELIVERED',            // 7. Giao thành công
                'CANCELLED'             // 8. Đã hủy
            ]
        },

        // ID của Drone (sẽ được update khi status là DRONE_ASSIGNED)
        droneId: { type: String }, 
    },
    {
        timestamps: true,
    }
);

const Order = mongoose.model('Order', orderSchema);

export default Order;