import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import LocationPicker from '../../components/LocationPicker';

const BranchEditPage = () => {
    const { id: branchId } = useParams();
    const navigate = useNavigate();
    const { userInfo } = useContext(AuthContext);

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        lat: '',
        lng: '',
        phoneNumber: '',
        operatingHours: '8:00 - 22:00'
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

    useEffect(() => {
        if (branchId) {
            const fetchBranch = async () => {
                try {
                    setLoading(true);
                    const { data } = await axios.get(`${API_URL}/api/branches/${branchId}`);
                    setFormData({
                        name: data.name,
                        address: data.address,
                        lat: data.location?.coordinates[1] || '',
                        lng: data.location?.coordinates[0] || '',
                        phoneNumber: data.phoneNumber || '',
                        operatingHours: data.operatingHours || ''
                    });
                } catch (err) {
                    setError('Không tìm thấy thông tin chi nhánh.');
                } finally {
                    setLoading(false);
                }
            };
            fetchBranch();
        }
    }, [branchId]);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLocationSelect = (lat, lng) => {
        setFormData(prev => ({ ...prev, lat, lng }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };

            const payload = {
                ...formData,
                location: {
                    type: 'Point',
                    coordinates: [parseFloat(formData.lng), parseFloat(formData.lat)]
                }
            };

            if (branchId) {
                // Update
                await axios.put(`${API_URL}/api/branches/${branchId}`, payload, config);
                alert('Cập nhật chi nhánh thành công!');
                navigate('/admin/branchlist');
            } else {
                // Create
                await axios.post(`${API_URL}/api/branches`, payload, config);
                alert('Tạo chi nhánh thành công!');
                navigate('/admin/branchlist');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Có lỗi xảy ra.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <div className="flex items-center mb-6">
                <button onClick={() => navigate('/admin/branchlist')} className="mr-4 text-gray-500 hover:text-indigo-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                </button>
                <h1 className="text-3xl font-bold text-gray-800">{branchId ? 'Cập Nhật Chi Nhánh' : 'Thêm Chi Nhánh Mới'}</h1>
            </div>

            {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">{error}</div>}

            <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg overflow-hidden">
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Cột Trái: Thông tin cơ bản */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Thông Tin Cơ Bản</h3>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Tên Chi Nhánh</label>
                            <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Địa chỉ</label>
                            <input type="text" name="address" value={formData.address} onChange={handleInputChange} required className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Số điện thoại</label>
                            <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Giờ mở cửa</label>
                            <input type="text" name="operatingHours" value={formData.operatingHours} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                    </div>
                </div>


                <div className="p-6 bg-gray-50 border-t flex justify-end gap-4">
                    <button type="button" onClick={() => navigate('/admin/branchlist')} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold py-2 px-6 rounded shadow-sm transition">
                        Hủy
                    </button>
                    <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-8 rounded shadow-md transition disabled:opacity-50">
                        {loading ? 'Đang xử lý...' : (branchId ? 'Lưu Cập Nhật' : 'Tạo Chi Nhánh')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BranchEditPage;

