// src/pages/admin/ProductEditPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const ProductEditPage = () => {
    const { id: productId } = useParams(); // Lấy id từ URL, đổi tên thành productId để tránh trùng lặp
    const navigate = useNavigate();
    const { userInfo } = useContext(AuthContext);

    const [name, setName] = useState('');
    const [price, setPrice] = useState(0);
    const [imageUrl, setImageUrl] = useState('');
    const [category, setCategory] = useState('Món chính');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Nếu có productId (chế độ edit), fetch dữ liệu sản phẩm đó
        if (productId) {
            const fetchProduct = async () => {
                try {
                    const { data } = await axios.get(`http://localhost:3000/api/products/${productId}`);
                    setName(data.name);
                    setPrice(data.price);
                    setImageUrl(data.imageUrl);
                    setCategory(data.category);
                    setDescription(data.description);
                } catch (err) {
                    setError('Không tìm thấy sản phẩm.');
                }
            };
            fetchProduct();
        }
    }, [productId]);

    const submitHandler = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const productData = { name, price, imageUrl, category, description };

        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userInfo.token}`,
                },
            };

            if (productId) {
                // GỬI CONFIG ĐI KÈM REQUEST UPDATE
                await axios.put(`http://localhost:3000/api/products/${productId}`, productData, config);
                alert('Cập nhật sản phẩm thành công!');
            } else {
                // GỬI CONFIG ĐI KÈM REQUEST CREATE
                await axios.post('http://localhost:3000/api/products', productData, config);
                alert('Tạo sản phẩm thành công!');
            }
            setLoading(false);
            navigate('/admin/productlist');
        } catch (err) {
            setError(err.response?.data?.message || 'Có lỗi xảy ra.');
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6">{productId ? 'Chỉnh sửa Sản phẩm' : 'Tạo Sản phẩm Mới'}</h1>
            {loading && <p>Đang xử lý...</p>}
            {error && <p className="text-red-500">{error}</p>}
            <form onSubmit={submitHandler} className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-md space-y-4">
                {/* Tên sản phẩm */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tên sản phẩm</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full mt-1 border border-gray-300 rounded-md p-2" />
                </div>
                {/* Giá */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Giá</label>
                    <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required className="w-full mt-1 border border-gray-300 rounded-md p-2" />
                </div>
                {/* Link ảnh */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">URL hình ảnh</label>
                    <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} required className="w-full mt-1 border border-gray-300 rounded-md p-2" />
                </div>
                {/* Phân loại */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Phân loại</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full mt-1 border border-gray-300 rounded-md p-2">
                        <option value="Món chính">Món chính</option>
                        <option value="Món phụ">Món phụ</option>
                        <option value="Tráng miệng">Tráng miệng</option>
                        <option value="Đồ uống">Đồ uống</option>
                    </select>
                </div>
                {/* Mô tả */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} required className="w-full mt-1 border border-gray-300 rounded-md p-2" />
                </div>
                <button type="submit" className="w-full py-2 px-4 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                    {productId ? 'Cập nhật' : 'Tạo mới'}
                </button>
            </form>
        </div>
    );
};

export default ProductEditPage;