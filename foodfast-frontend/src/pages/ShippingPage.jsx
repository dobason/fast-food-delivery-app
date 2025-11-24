import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';
import axios from 'axios';

const ShippingPage = () => {
    const { userInfo } = useContext(AuthContext);
    const { cartItems, clearCart } = useContext(CartContext);
    const navigate = useNavigate();

    // Lấy địa chỉ đã lưu lần trước (nếu có)
    const savedAddress = JSON.parse(localStorage.getItem('shippingAddress') || '{}');

    const [address, setAddress] = useState(savedAddress.address || '');
    const [city, setCity] = useState(savedAddress.city || '');
    const [phone, setPhone] = useState(userInfo?.phone || savedAddress.phone || '');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    // Tính tổng tiền (để hiển thị hoặc kiểm tra) - ÉP KIỂU SỐ CHO CHẮC
    const itemsPrice = cartItems.reduce((acc, item) => acc + Number(item.price || 0) * Number(item.qty || item.quantity || 1), 0);
    const shippingPrice = itemsPrice > 100000 ? 0 : 30000; // Logic ship ví dụ
    const totalPrice = itemsPrice + shippingPrice;

    const placeOrderHandler = async (e) => {
        e.preventDefault();
        setError(null);

        // 1. Kiểm tra đăng nhập (Nếu App bắt buộc đăng nhập để mua)
        if (!userInfo || !userInfo._id) {
             alert("Vui lòng đăng nhập để đặt hàng!");
             navigate('/login');
             return;
        }

        if (cartItems.length === 0) {
            setError('Giỏ hàng trống');
            return;
        }

        const savedBranchStr = localStorage.getItem('selectedBranch');
        if (!savedBranchStr) {
            alert('Vui lòng chọn chi nhánh trước khi đặt hàng!');
            return;
        }

        let branchId = null;
        try {
            const branchObj = JSON.parse(savedBranchStr);
            branchId = branchObj._id || branchObj; 
        } catch (e) {
            branchId = savedBranchStr; 
        }

        try {
            setLoading(true);

            // Tính toán tiền cẩn thận
            const itemsPriceVal = cartItems.reduce((acc, item) => acc + Number(item.price || 0) * Number(item.qty || item.quantity || 1), 0);
            const shippingPriceVal = itemsPriceVal > 100000 ? 0 : 30000;
            const totalPriceVal = itemsPriceVal + shippingPriceVal;

            const orderData = {
                // QUAN TRỌNG: Chỉ gửi userId nếu có ID thực sự
                userId: userInfo._id, 
                branchId: branchId, 
                paymentMethod: 'COD', 
                orderItems: cartItems.map(item => ({
                    product: item.product || item._id, 
                    name: item.name,
                    qty: Number(item.qty || item.quantity || 1),
                    price: Number(item.price || 0),              
                    image: item.image
                })),
                shippingAddress: { fullName: userInfo.name, email: userInfo.email, address, city, phone },
                itemsPrice: itemsPriceVal,
                shippingPrice: shippingPriceVal,
                totalPrice: totalPriceVal 
            };

            // Log ra kiểm tra trước khi gửi
            console.log("📦 Dữ liệu gửi đi:", orderData);

            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userInfo.token}`,
                },
            };

            const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

            const { data: createdOrder } = await axios.post(
                `${API_URL}/api/orders`,
                orderData,
                config
            );

            clearCart();
            alert("Đặt hàng thành công! 🎉");
            if (createdOrder && createdOrder._id) {
                navigate(`/order/${createdOrder._id}`); 
            } else {
                navigate('/myorders');
            }

        } catch (err) {
            console.error("Place order error:", err);
            setError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo đơn hàng.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8 bg-gray-50 min-h-screen flex justify-center">
            <div className="w-full max-w-lg">
                {/* Breadcrumb / Steps */}
                <div className="flex justify-center items-center mb-8 text-sm font-medium text-gray-500">
                    <span className="text-indigo-600">Giỏ hàng</span>
                    <svg className="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                    <span className="text-indigo-800 font-bold border-b-2 border-indigo-600 pb-1">Giao hàng</span>
                    <svg className="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                    <span>Thanh toán</span>
                </div>

                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                    <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Thông Tin Giao Hàng</h1>

                    {error && (
                        <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={placeOrderHandler} className="space-y-5">

                        {/* Số điện thoại */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Số điện thoại nhận hàng</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                                placeholder="VD: 0901234567"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>

                        {/* Địa chỉ */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Địa chỉ chi tiết</label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                required
                                placeholder="VD: 123 Đường Nguyễn Huệ, Phường Bến Nghé"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>

                        {/* Thành phố */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Quận / Thành phố</label>
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                required
                                placeholder="VD: Quận 1, TP.HCM"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>

                        {/* Hiển thị tổng tiền cho chắc */}
                        <div className="py-2 border-t border-gray-100 mt-4">
                            <div className="flex justify-between font-bold text-lg text-gray-800">
                                <span>Tổng thanh toán:</span>
                                <span className="text-indigo-600">{totalPrice.toLocaleString()} VNĐ</span>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 transition-all shadow-md hover:shadow-lg flex justify-center items-center"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                        </svg>
                                        Đang xử lý...
                                    </>
                                ) : (
                                    'Đặt Hàng Ngay'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ShippingPage;