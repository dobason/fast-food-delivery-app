import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client'; // Import Socket
import { AuthContext } from '../context/AuthContext.jsx';

const OrderPage = () => {
    const { id: orderId } = useParams();
    const navigate = useNavigate();
    const { userInfo } = useContext(AuthContext);

    const [order, setOrder] = useState(null);
    const [branchInfo, setBranchInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    
    // --- State mới cho Admin ---
    const [drones, setDrones] = useState([]); 
    const [selectedDrone, setSelectedDrone] = useState('');
    const [processing, setProcessing] = useState(false); // Loading cho nút Admin

    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const DELIVERY_URL = 'http://localhost:3005';
    const ORDER_SOCKET_URL = 'http://10.0.0.77:3003';

    useEffect(() => {
        const fetchOrder = async () => {
            if (!userInfo) return;
            try {
                setLoading(true);
                const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };

                // 1. Lấy đơn hàng
                const { data: orderData } = await axios.get(`${API_URL}/api/orders/${orderId}`, config);
                setOrder(orderData);

                // 2. Lấy thông tin chi nhánh
                if (orderData.branchId) {
                    try {
                        const { data: branchData } = await axios.get(`${API_URL}/api/branches/${orderData.branchId}`);
                        setBranchInfo(branchData);
                    } catch (err) { console.error("Không lấy được thông tin chi nhánh"); }
                }

                // 3. (ADMIN) Lấy danh sách Drone rảnh nếu đơn đang chờ/sẵn sàng
                if (userInfo.isAdmin && (orderData.status === 'READY_TO_SHIP' || orderData.status === 'PREPARING')) {
                    try {
                        const { data: droneData } = await axios.get(`${DELIVERY_URL}/api/delivery/drones`);
                        setDrones(droneData);
                    } catch (err) { console.error("Lỗi kết nối Delivery Service"); }
                }
            } catch (err) {
                setError('Không thể tải thông tin đơn hàng.');
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();

        // --- TÍCH HỢP SOCKET REAL-TIME (Để tự cập nhật) ---
        const socket = io(ORDER_SOCKET_URL);
        socket.emit('join_order_room', orderId);

        socket.on('status_update', (data) => {
            console.log("🔔 Realtime Update:", data);
            setOrder(prev => ({ 
                ...prev, 
                status: data.status,
                droneId: data.droneId || prev.droneId,
                isPaid: data.status === 'PAID_WAITING_PROCESS' ? true : prev.isPaid
            }));
        });

        return () => { socket.disconnect(); };
        // ------------------------------------------------

    }, [orderId, userInfo, API_URL]);

    // --- HÀM CẬP NHẬT TRẠNG THÁI (ADMIN) ---
    const updateStatus = async (newStatus) => {
        try {
            setProcessing(true);
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
            await axios.put(`${API_URL}/api/orders/${order._id}/status`, { status: newStatus }, config);
            // Không cần setOrder ở đây nữa vì Socket sẽ tự làm việc đó
            
            // Nếu chuyển sang READY_TO_SHIP -> Load drone ngay
            if (newStatus === 'READY_TO_SHIP') {
                 const { data: droneData } = await axios.get(`${DELIVERY_URL}/api/delivery/drones`);
                 setDrones(droneData);
            }
        } catch (err) {
            alert("Lỗi khi cập nhật trạng thái.");
        } finally {
            setProcessing(false);
        }
    };

    // --- HÀM GIAO HÀNG (ADMIN - BƯỚC CUỐI) ---
    const handleDroneDelivery = async () => {
        try {
            setProcessing(true);
            // Cập nhật trạng thái trước
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
            await axios.put(`${API_URL}/api/orders/${order._id}/status`, { status: 'DRONE_ASSIGNED' }, config);
            
            // Gọi API bắt đầu giao hàng
            await axios.post(`${DELIVERY_URL}/start-delivery`, {
                orderId: order._id,
                droneId: selectedDrone 
            });
            
            alert("🚀 Đã kích hoạt Drone giao hàng!");
        } catch (error) {
            console.error("Lỗi giao hàng:", error);
            alert("Lỗi khi gọi Drone.");
        } finally {
            setProcessing(false);
        }
    };

    // --- THANH TOÁN (USER) ---
    const onlinePaymentHandler = async () => {
        if (!window.confirm('Bạn có chắc muốn thanh toán Online ngay bây giờ?')) return;
        setPaymentProcessing(true);
        try {
            await axios.put(`${API_URL}/api/orders/${orderId}/pay`, {}, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            alert('Thanh toán thành công! Đang chờ nhà hàng xác nhận.');
        } catch (error) {
            alert('Thanh toán thất bại.');
        } finally {
            setPaymentProcessing(false);
        }
    };

    if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
    if (error) return <div className="text-center mt-8 text-red-500 font-bold">{error}</div>;
    if (!order) return <p className="text-center mt-8">Không tìm thấy đơn hàng.</p>;

    // --- LOGIC TÍNH % TIẾN TRÌNH ---
    const getProgressWidth = () => {
        switch (order.status) {
            case 'PENDING_PAYMENT': return '10%';      // 1. Mới đặt
            case 'PAID_WAITING_PROCESS': return '25%'; // 2. Đã thanh toán
            case 'PREPARING': return '40%';           // 3. Đang nấu
            case 'READY_TO_SHIP': return '55%';       // 4. Đóng gói xong
            case 'DRONE_ASSIGNED': return '70%';      // 5. Đã gán Drone
            case 'DELIVERING': return '85%';          // 6. Đang bay
            case 'DELIVERED': return '100%';          // 7. Hoàn tất
            case 'CANCELLED': return '0%';
            default: return '5%';
        }
    };

    // Helper class cho text step
    const getStepClass = (step) => {
        const statusFlow = ['PENDING_PAYMENT', 'PAID_WAITING_PROCESS', 'PREPARING', 'READY_TO_SHIP', 'DELIVERING', 'DELIVERED'];
        let currentIndex = statusFlow.indexOf(order.status);
        if (order.status === 'DRONE_ASSIGNED') currentIndex = 4;
        if (currentIndex === -1) return 'text-red-500 font-bold'; // Cancelled
        
        if (step === 1) return 'text-indigo-600 font-bold';
        if (step === 2) return currentIndex >= 1 ? 'text-indigo-600 font-bold' : 'text-gray-400';
        if (step === 3) return currentIndex >= 4 ? 'text-indigo-600 font-bold' : 'text-gray-400';
        if (step === 4) return currentIndex >= 5 ? 'text-indigo-600 font-bold' : 'text-gray-400';
        return 'text-gray-400';
    };

    return (
        <div className="container mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
            {/* Header & Back Link */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <Link
                    to={userInfo.isAdmin ? "/admin/orderlist" : "/myorders"}
                    className="text-gray-500 hover:text-indigo-600 font-medium flex items-center mb-4 md:mb-0 transition-colors"
                >
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    Quay lại danh sách
                </Link>
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800">
                    Đơn hàng <span className="text-indigo-600">#{order._id.substring(0, 8)}</span>
                </h1>
            </div>

            {/* Progress Bar */}
            {order.status !== 'CANCELLED' && (
                <div className="bg-white p-6 rounded-xl shadow-sm mb-8 border border-gray-200">
                    <div className="flex justify-between text-sm md:text-base text-center mb-2">
                        <div className={getStepClass(1)}>1. Đã đặt</div>
                        <div className={getStepClass(2)}>2. Chuẩn bị</div>
                        <div className={getStepClass(3)}>3. Đang giao</div>
                        <div className={getStepClass(4)}>4. Hoàn tất</div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden relative">
                        <div className="h-full bg-indigo-500 transition-all duration-700 ease-in-out shadow-md" style={{ width: getProgressWidth() }}></div>
                    </div>
                    <p className="text-center text-xs text-gray-500 mt-2 font-medium uppercase tracking-wide">
                        Trạng thái: <span className="text-indigo-600">{order.status.replace(/_/g, ' ')}</span>
                    </p>
                </div>
            )}

            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">

                    {/* --- THÔNG TIN CỬA HÀNG --- */}
                    {branchInfo && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                            <div className="flex items-start">
                                <div className="bg-indigo-100 p-3 rounded-full mr-4">
                                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800">Thông tin cửa hàng</h2>
                                    <p className="text-indigo-600 font-bold text-lg mt-1">{branchInfo.name}</p>
                                    <div className="text-sm text-gray-600 mt-1 space-y-1">
                                        <p className="flex items-center"><span className="mr-2">📍</span> {branchInfo.address}</p>
                                        <p className="flex items-center"><span className="mr-2">📞</span> {branchInfo.phoneNumber || 'Đang cập nhật'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- KHU VỰC QUẢN LÝ CỦA ADMIN (PIPELINE) --- */}
                    {userInfo.isAdmin && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                        <div className="bg-blue-50 p-6 rounded-xl border-2 border-blue-200 shadow-md animate-fade-in">
                            <h2 className="text-xl font-bold text-blue-800 mb-4">⚙️ Xử lý đơn hàng</h2>
                            
                            {/* Bước 1: Duyệt đơn */}
                            {order.status === 'PAID_WAITING_PROCESS' && (
                                <div className="bg-yellow-100 p-4 rounded-lg text-yellow-800">
                                    <p className="font-bold mb-2">🔔 Khách đã thanh toán.</p>
                                    <button onClick={() => updateStatus('PREPARING')} disabled={processing} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700 w-full transition">
                                        👨‍🍳 Xác nhận & Bắt đầu nấu
                                    </button>
                                </div>
                            )}

                            {/* Bước 2: Đóng gói */}
                            {order.status === 'PREPARING' && (
                                <div className="bg-orange-100 p-4 rounded-lg text-orange-800">
                                    <p className="font-bold mb-2">🔥 Đang nấu món ăn...</p>
                                    <button onClick={() => updateStatus('READY_TO_SHIP')} disabled={processing} className="bg-orange-600 text-white px-4 py-2 rounded font-bold hover:bg-orange-700 w-full transition">
                                        📦 Đã nấu xong & Đóng gói
                                    </button>
                                </div>
                            )}

                            {/* Bước 3: Giao hàng */}
                            {order.status === 'READY_TO_SHIP' && (
                                <div>
                                    <p className="text-sm font-bold text-gray-700 mb-2">Chọn Drone để giao:</p>
                                    <div className="flex gap-2">
                                        <select 
                                            className="flex-1 p-2 border rounded bg-white"
                                            value={selectedDrone}
                                            onChange={(e) => setSelectedDrone(e.target.value)}
                                        >
                                            <option value="">-- Chọn Drone --</option>
                                            {drones.map(d => <option key={d._id} value={d._id}>{d.name} (Pin: {d.battery}%)</option>)}
                                        </select>
                                        <button onClick={handleDroneDelivery} disabled={processing} className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 transition">
                                            🚁 Giao ngay
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Đang giao */}
                            {(order.status === 'DRONE_ASSIGNED' || order.status === 'DELIVERING') && (
                                <p className="text-green-700 font-bold text-center animate-pulse">🚀 Drone đang trên đường giao!</p>
                            )}

                            {/* Nếu chưa thanh toán */}
                            {order.status === 'PENDING_PAYMENT' && (
                                <p className="text-red-500 italic text-center">Chờ khách hàng thanh toán...</p>
                            )}
                        </div>
                    )}

                    {/* Thông tin nhận hàng */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Thông tin nhận hàng</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                            <p><span className="font-semibold text-gray-800">Người nhận:</span> {order.shippingAddress.fullName}</p>
                            <p><span className="font-semibold text-gray-800">Email:</span> {order.shippingAddress.email}</p>
                            <p><span className="font-semibold text-gray-800">SĐT:</span> {order.shippingAddress.phone}</p>
                            <p className="md:col-span-2"><span className="font-semibold text-gray-800">Địa chỉ:</span> {order.shippingAddress.address}, {order.shippingAddress.city}</p>
                        </div>
                        {order.droneId && (
                            <div className="mt-6 pt-4 border-t text-center">
                                <Link to={`/order-tracking/${order._id}`} className="text-blue-600 font-bold hover:underline text-sm flex items-center justify-center gap-2">
                                    <span>🚁</span> Xem vị trí Drone
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Chi tiết món ăn */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Chi tiết món ăn</h2>
                        <div className="divide-y divide-gray-100">
                            {order.orderItems.map((item, index) => (
                                <div key={index} className="py-4 flex justify-between items-start">
                                    <div className="flex items-start">
                                        {item.image && <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg mr-4 border border-gray-200" />}
                                        <div>
                                            <p className="font-bold text-gray-800 text-lg">{item.name}</p>
                                            <p className="text-sm text-gray-500">Số lượng: <span className="font-bold text-gray-800">x{item.qty || item.quantity}</span></p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-indigo-600 text-lg">
                                        {(Number(item.price) * Number(item.qty || item.quantity)).toLocaleString('vi-VN')} ₫
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* CỘT PHẢI: THANH TOÁN */}
                <div className="md:col-span-1">
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-50 sticky top-24">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Tổng thanh toán</h2>
                        <div className="space-y-3 mb-6 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Tạm tính</span>
                                <span>{Number(order.itemsPrice || (Number(order.totalPrice) - 30000)).toLocaleString('vi-VN')} ₫</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Phí giao hàng</span>
                                <span>
                                    {order.shippingPrice > 0 ? Number(order.shippingPrice).toLocaleString('vi-VN') + ' ₫' : <span className="text-green-600 font-bold">Miễn phí</span>}
                                </span>
                            </div>
                            <div className="border-t pt-3 flex justify-between items-center">
                                <span className="font-bold text-gray-800 text-lg">Tổng cộng</span>
                                <span className="font-bold text-indigo-600 text-xl">{Number(order.totalPrice).toLocaleString('vi-VN')} ₫</span>
                            </div>
                        </div>

                        {/* Trạng thái thanh toán */}
                        {order.status !== 'PENDING_PAYMENT' && order.status !== 'CANCELLED' ? (
                            <div className="bg-green-100 text-green-800 p-4 rounded-lg text-center mb-4 border border-green-200">
                                <p className="font-bold">✅ Đã thanh toán</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-2">Chọn phương thức:</h3>
                                {/* Ẩn nút thanh toán nếu là Admin */}
                                {!userInfo.isAdmin ? (
                                    <button
                                        onClick={onlinePaymentHandler}
                                        disabled={paymentProcessing || order.status === 'Cancelled'}
                                        className="w-full py-3 px-4 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md flex justify-center items-center disabled:opacity-50"
                                    >
                                        {paymentProcessing ? 'Đang xử lý...' : '💳 Thanh toán Online'}
                                    </button>
                                ) : (
                                    <div className="bg-yellow-100 text-yellow-800 p-3 rounded text-center text-sm">
                                        Chờ khách hàng thanh toán...
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                            <Link to={`/order-tracking/${order._id}`} className="inline-flex items-center text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                                📍 Theo dõi lộ trình
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderPage;