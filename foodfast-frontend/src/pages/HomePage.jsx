// src/pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Product from '../components/Product.jsx';       // Import thẻ Product
import ErrorDisplay from '../components/ErrorDisplay.jsx'; // Import component báo lỗi
import HeroSection from '../components/HeroSection.jsx';   // Import HeroSection

const HomePage = () => {
    // Khởi tạo state là mảng rỗng [] để tránh lỗi null
    const [products, setProducts] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/products`);
                
                // --- ĐÂY LÀ DÒNG QUAN TRỌNG ĐỂ DEBUG ---
                console.log("🔥 DỮ LIỆU API TRẢ VỀ:", response.data); 

                // Logic thông minh: Tự dò tìm mảng sản phẩm
                // Trường hợp 1: API trả về trực tiếp mảng [Product1, Product2...]
                // Trường hợp 2: API trả về object { products: [...], page: 1 }
                let productData = [];
                
                if (Array.isArray(response.data)) {
                    productData = response.data;
                } else if (response.data && Array.isArray(response.data.products)) {
                    productData = response.data.products;
                } else {
                    console.warn("⚠️ Cấu trúc dữ liệu lạ, không tìm thấy mảng sản phẩm:", response.data);
                }

                setProducts(productData);
                setError(null);
            } catch (err) {
                setError('Rất tiếc, không thể tải dữ liệu sản phẩm.');
                console.error("Fetch products error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    // Hiển thị loading (Tùy chọn: Có thể thêm spinner xoay xoay ở đây)
    if (loading) return <div className="text-center py-10">Đang tải món ngon... 🍔</div>;

    // Hiển thị component lỗi nếu có lỗi
    if (error) {
        return <ErrorDisplay message={error} />;
    }

    return (
        <div className="bg-white min-h-screen">

            {/* 1. Thêm HeroSection (banner) ở đầu trang */}
            <HeroSection />

            {/* 2. Container cho phần nội dung còn lại */}
            <div className="container mx-auto p-4 md:p-8">

                {/* Tiêu đề trang */}
                <div className="text-center mb-10 md:mb-12">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-orange-700 leading-tight mb-6">
                        Thực Đơn Của Chúng Tôi
                    </h1>
                    <p className="text-lg text-gray-600">
                        Khám phá các món ăn 🍔 và đồ uống 🥤 tuyệt vời nhất.
                    </p>
                </div>

                {/* 3. Lưới hiển thị sản phẩm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {/* --- ĐIỀU KIỆN AN TOÀN: Chỉ chạy map khi products CHẮC CHẮN là mảng --- */}
                    {Array.isArray(products) && products.length > 0 ? (
                        products.map((product) => (
                            <Product key={product._id} product={product} />
                        ))
                    ) : (
                        <p className="col-span-full text-center text-gray-500 text-lg py-10">
                            Hiện chưa có sản phẩm nào để hiển thị.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HomePage;