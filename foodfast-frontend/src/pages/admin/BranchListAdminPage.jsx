import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AdminMenu from '../../components/AdminMenu';

const BranchListAdminPage = () => {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

    const fetchBranches = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(`${API_URL}/api/branches`);
            setBranches(data);
        } catch (err) {
            alert('Lỗi tải danh sách chi nhánh');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    return (
        <>
            <AdminMenu />
            <div className="container mx-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Quản Lý Chi Nhánh</h1>
                    <button
                        onClick={() => navigate('/admin/branch/create')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded flex items-center shadow-md transition"
                    >
                        <span className="mr-2 text-xl">+</span> Thêm Chi Nhánh
                    </button>
                </div>

                {loading ? <div className="text-center py-10">Đang tải dữ liệu...</div> : (
                    <div className="bg-white shadow-md rounded-lg overflow-hidden">
                        <table className="min-w-full leading-normal">
                            <thead>
                                <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                                    <th className="py-3 px-6 text-left">Tên Chi Nhánh</th>
                                    <th className="py-3 px-6 text-left">Địa Chỉ</th>
                                    <th className="py-3 px-6 text-center">Tọa Độ</th>
                                    <th className="py-3 px-6 text-center">Hành Động</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-600 text-sm font-light">
                                {branches.map((branch) => (
                                    <tr key={branch._id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-6 text-left font-medium text-indigo-600">
                                            {branch.name}
                                        </td>
                                        <td className="py-3 px-6 text-left">
                                            <p>{branch.address}</p>
                                            <p className="text-xs text-gray-400 mt-1">Hotline: {branch.phoneNumber || '---'}</p>
                                        </td>
                                        <td className="py-3 px-6 text-center font-mono text-xs">
                                            [{branch.location?.coordinates[1]}, {branch.location?.coordinates[0]}]
                                        </td>
                                        <td className="py-3 px-6 text-center">
                                            <div className="flex item-center justify-center gap-3">
                                                {/* Chỉ còn nút Chỉnh Sửa */}
                                                <button
                                                    onClick={() => navigate(`/admin/branch/${branch._id}/edit`)}
                                                    className="bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-800 py-1 px-3 rounded text-xs font-semibold transition flex items-center gap-1"
                                                    title="Chỉnh sửa thông tin"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                    Sửa
                                                </button>

                                                {/* ĐÃ XÓA NÚT THÙNG RÁC TẠI ĐÂY */}
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

export default BranchListAdminPage;