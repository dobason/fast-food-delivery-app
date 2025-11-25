import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminMenu from '../../components/AdminMenu';

const DroneListAdminPage = () => {
    const { userInfo } = useContext(AuthContext);
    const [drones, setDrones] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // URL của Delivery Service (chạy trên port 3005)
    // Trong thực tế nên dùng Gateway, nhưng tạm thời gọi trực tiếp hoặc qua Gateway nếu đã cấu hình
    // Giả sử Gateway đã forward /api/delivery -> delivery-service
    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

    const fetchDrones = async () => {
        try {
            setLoading(true);
            // Gọi qua Gateway: /api/delivery/drones
            const { data } = await axios.get(`${API_URL}/api/delivery/drones`);
            setDrones(data);
        } catch (err) {
            console.error(err);
            alert('Lỗi tải danh sách Drone');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrones();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa Drone này?')) {
            try {
                await axios.delete(`${API_URL}/api/delivery/drones/${id}`);
                fetchDrones();
            } catch (err) {
                alert('Lỗi khi xóa Drone');
            }
        }
    };

    return (
        <>
            <AdminMenu />
            <div className="container mx-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Quản Lý Drone</h1>
                    <button
                        onClick={() => navigate('/admin/drone/create')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded flex items-center shadow-md transition"
                    >
                        <span className="mr-2 text-xl">+</span> Thêm Drone
                    </button>
                </div>

                {loading ? <div className="text-center py-10">Đang tải dữ liệu...</div> : (
                    <div className="bg-white shadow-md rounded-lg overflow-hidden">
                        <table className="min-w-full leading-normal">
                            <thead>
                                <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                                    <th className="py-3 px-6 text-left">Tên Drone</th>
                                    <th className="py-3 px-6 text-center">Trạng Thái</th>
                                    <th className="py-3 px-6 text-center">Pin (%)</th>
<th className="py-3 px-6 text-center">Vị Trí</th>
                                    <th className="py-3 px-6 text-center">Hành Động</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-600 text-sm font-light">
                                {drones.map((drone) => (
                                    <tr key={drone._id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-6 text-left font-medium text-indigo-600">
                                            {drone.name}
                                        </td>
                                        <td className="py-3 px-6 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold
                                                ${drone.status === 'IDLE' || drone.status === 'available' ? 'bg-green-100 text-green-800' :
                                                    drone.status === 'BUSY' || drone.status === 'busy' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'}`}>
                                                {drone.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-6 text-center">
                                            <div className="flex items-center justify-center">
                                                <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-2">
                                                    <div
                                                        className={`h-2.5 rounded-full ${drone.battery > 20 ? 'bg-green-500' : 'bg-red-500'}`}
                                                        style={{ width: `${drone.battery}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs">{drone.battery}%</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-6 text-center font-mono text-xs">
                                            {drone.currentLocation ?
                                                `[${drone.currentLocation.lat?.toFixed(4)}, ${drone.currentLocation.lng?.toFixed(4)}]` :
                                                'N/A'
                                            }
                                        </td>
                                        <td className="py-3 px-6 text-center">
                                            <div className="flex item-center justify-center gap-3">
                                                <button
onClick={() => navigate(`/admin/drone/${drone._id}/edit`)}
                                                    className="transform hover:text-indigo-500 hover:scale-110 transition"
                                                    title="Chỉnh sửa"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(drone._id)}
                                                    className="transform hover:text-red-500 hover:scale-110 transition"
                                                    title="Xóa"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
};

export default DroneListAdminPage;