import React, { useContext } from 'react';
import { CartContext } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';

const CartPage = () => {
    // Lấy thêm hàm updateQty từ Context
    const { cartItems, removeFromCart, updateQty } = useContext(CartContext);
    const navigate = useNavigate();

    // Tính tổng tiền
    const subtotal = cartItems.reduce((acc, item) => 
        acc + Number(item.price || 0) * Number(item.qty || item.quantity || 1), 
    0);

    const checkoutHandler = () => {
        const savedBranch = localStorage.getItem('selectedBranch');
        if (!savedBranch) {
            alert("Vui lòng chọn Chi nhánh trước khi thanh toán!");
            return;
        }
        navigate('/shipping');
    };

    return (
        <div className="container mx-auto p-4 md:p-8 bg-gray-50 min-h-[80vh]">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Giỏ hàng của bạn</h1>
            
            {cartItems.length === 0 ? (
                <div className="text-center py-16 px-6 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="text-6xl mb-4">🛒</div>
                    <p className="text-gray-500 text-lg mb-6">Giỏ hàng đang trống trơn.</p>
                    <Link to="/" className="inline-block bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors shadow-md">
                        Quay lại thực đơn
                    </Link>
                </div>
            ) : (
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Danh sách sản phẩm */}
                    <div className="lg:col-span-2 space-y-4">
                        {cartItems.map(item => {
                            const currentQty = item.qty || item.quantity || 1;
                            
                            return (
                                <div key={item._id} className="flex flex-col sm:flex-row items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                    <img 
                                        src={item.image || item.imageUrl || "https://via.placeholder.com/150"} 
                                        alt={item.name} 
                                        className="w-24 h-24 object-cover rounded-lg border border-gray-200" 
                                    />
                                    
                                    <div className="flex-grow ml-0 sm:ml-6 mt-4 sm:mt-0 text-center sm:text-left">
                                        <h2 className="font-bold text-lg text-gray-800">{item.name}</h2>
                                        <p className="text-indigo-600 font-medium mt-1">
                                            {Number(item.price).toLocaleString('vi-VN')} VNĐ
                                        </p>
                                    </div>

                                    {/* --- PHẦN CHỈNH SỐ LƯỢNG MỚI --- */}
                                    <div className="flex flex-col items-center sm:items-end gap-3 mt-4 sm:mt-0">
                                        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                                            <button 
                                                onClick={() => updateQty(item._id, currentQty - 1)}
                                                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold transition"
                                                disabled={currentQty <= 1}
                                            >
                                                -
                                            </button>
                                            <span className="px-4 py-1 font-semibold text-gray-800 bg-white border-l border-r border-gray-300 min-w-[40px] text-center">
                                                {currentQty}
                                            </span>
                                            <button 
                                                onClick={() => updateQty(item._id, currentQty + 1)}
                                                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-indigo-600 font-bold transition"
                                            >
                                                +
                                            </button>
                                        </div>
                                        
                                        <button 
                                            onClick={() => removeFromCart(item._id)} 
                                            className="text-red-500 hover:text-red-700 text-sm font-semibold underline hover:no-underline"
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                    {/* ------------------------------ */}
                                </div>
                            );
                        })}
                    </div>

                    {/* Tổng kết đơn hàng */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 sticky top-24">
                            <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-4">Tổng kết đơn hàng</h2>
                            
                            <div className="flex justify-between mb-2 text-gray-600">
                                <span>Tạm tính</span>
                                <span>{subtotal.toLocaleString('vi-VN')} VNĐ</span>
                            </div>
                            <div className="flex justify-between mb-6 text-sm text-gray-500">
                                <span>Phí giao hàng</span>
                                <span>(Tính ở bước sau)</span>
                            </div>

                            <div className="flex justify-between mb-6 pt-4 border-t border-gray-200">
                                <span className="text-gray-800 font-bold text-lg">Tổng cộng</span>
                                <span className="font-bold text-xl text-indigo-600">{subtotal.toLocaleString('vi-VN')} VNĐ</span>
                            </div>
                            
                            <button 
                                onClick={checkoutHandler} 
                                className="w-full py-4 px-6 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg transform active:scale-95"
                            >
                                Tiến hành Thanh toán
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CartPage;