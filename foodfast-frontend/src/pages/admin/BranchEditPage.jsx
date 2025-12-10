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
    operatingHours: '8:00 - 22:00',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // Lấy dữ liệu chi nhánh nếu đang ở chế độ chỉnh sửa (Edit Mode)
  useEffect(() => {
    if (branchId) {
      const fetchBranch = async () => {
        try {
          setLoading(true);
          const { data } = await axios.get(`${API_URL}/api/branches/${branchId}`);
          setFormData({
            name: data.name,
            address: data.address,
            // MongoDB GeoJSON lưu: [lng, lat]
            lat: data.location?.coordinates[1] || '',
            lng: data.location?.coordinates[0] || '',
            phoneNumber: data.phoneNumber || '',
            operatingHours: data.operatingHours || '',
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

  // Hàm nhận tọa độ từ component LocationPicker
  const handleLocationSelect = (lat, lng) => {
    setFormData((prev) => ({ ...prev, lat, lng }));
    // Xóa lỗi nếu người dùng đã chọn vị trí
    if (error && lat && lng) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 1. Validate: Kiểm tra xem đã chọn vị trí chưa
    if (!formData.lat || !formData.lng) {
      setLoading(false);
      setError('Vui lòng chọn vị trí trên bản đồ trước khi lưu!');
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };

      const payload = {
        ...formData,
        location: {
          type: 'Point',
          // Đảm bảo convert sang số thực (Float) để tránh lỗi NaN
          coordinates: [parseFloat(formData.lng), parseFloat(formData.lat)],
        },
      };

      console.log('Dữ liệu gửi đi (Payload):', payload); // Debug xem log

      if (branchId) {
        // Update
        await axios.put(`${API_URL}/api/branches/${branchId}`, payload, config);
        alert('Cập nhật chi nhánh thành công!');
      } else {
        // Create
        await axios.post(`${API_URL}/api/branches`, payload, config);
        alert('Tạo chi nhánh thành công!');
      }

      navigate('/admin/branchlist');
    } catch (err) {
      console.error('Lỗi API:', err);
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header & Back Button */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/admin/branchlist')}
          className="mr-4 text-gray-500 hover:text-indigo-600 transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
        </button>
        <h1 className="text-3xl font-bold text-gray-800">
          {branchId ? 'Cập Nhật Chi Nhánh' : 'Thêm Chi Nhánh Mới'}
        </h1>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm">
          <p className="font-bold">Lỗi:</p>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-100">

        {/* Main Grid Layout: Chia 2 cột trên màn hình lớn */}
        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* CỘT TRÁI: Thông tin text */}
          <div className="space-y-5">
            <h3 className="text-xl font-semibold text-indigo-700 border-b pb-2 mb-4">Thông Tin Cơ Bản</h3>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Tên Chi Nhánh <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Ví dụ: Chi nhánh Quận 1"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Địa chỉ <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
                placeholder="Số nhà, tên đường..."
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Số điện thoại</label>
                <input
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Giờ mở cửa</label>
                <input
                  type="text"
                  name="operatingHours"
                  value={formData.operatingHours}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: Bản đồ / LocationPicker */}
          <div className="space-y-5">
            <h3 className="text-xl font-semibold text-indigo-700 border-b pb-2 mb-4">Vị Trí Bản Đồ <span className="text-red-500">*</span></h3>

            <div className="h-80 w-full bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden relative">
              {/* Gọi Component LocationPicker */}
              {/* Lưu ý: Đảm bảo LocationPicker nhận props lat, lng và onLocationSelect */}
              <LocationPicker
                lat={parseFloat(formData.lat)}
                lng={parseFloat(formData.lng)}
                onLocationSelect={handleLocationSelect}
              />
            </div>

            {/* Hiển thị tọa độ dạng readonly để user kiểm tra */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Kinh độ (Lng)</label>
                <input
                  type="text"
                  value={formData.lng || ''}
                  readOnly
                  className="bg-transparent font-mono text-gray-700 w-full focus:outline-none"
                  placeholder="Chưa chọn"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Vĩ độ (Lat)</label>
                <input
                  type="text"
                  value={formData.lat || ''}
                  readOnly
                  className="bg-transparent font-mono text-gray-700 w-full focus:outline-none"
                  placeholder="Chưa chọn"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 italic">
              * Kéo thả ghim trên bản đồ để cập nhật chính xác vị trí chi nhánh.
            </p>
          </div>

        </div>

        {/* Footer Buttons */}
        <div className="px-8 py-5 bg-gray-50 border-t flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/branchlist')}
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold py-2 px-6 rounded-lg shadow-sm transition duration-200"
          >
            Hủy Bỏ
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-8 rounded-lg shadow-md transition duration-200 flex items-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading && (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {branchId ? 'Lưu Thay Đổi' : 'Tạo Chi Nhánh'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BranchEditPage;