import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AdminMenu = () => {
    const location = useLocation();
    const { userInfo } = useContext(AuthContext);
    const path = location.pathname;

    // Kiểm tra quyền Super Admin (không có branchId)
    const isSuperAdmin = !userInfo?.branchId;

    const isActive = (route) => {
        return path.includes(route)
            ? 'bg-indigo-600 text-white shadow-md'
            : 'bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600';
    };

    return (
        <div className="bg-white shadow-sm mb-6 border-b">
            <div className="container mx-auto px-4">
                <div className="flex overflow-x-auto py-3 gap-2 no-scrollbar">
                    <Link
                        to="/admin/dashboard"
                        className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${isActive('/admin/dashboard') || isActive('/admin/orderlist')}`}
                    >
                        📦 Đơn Hàng
                    </Link>

                    <Link
                        to="/admin/productlist"
                        className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${isActive('/admin/product')}`}
                    >
                        🍔 Sản Phẩm
                    </Link>

                    {/* Drone Management - Visible to all Admins (Super Admin & Managers) */}
                    <Link
                        to="/admin/dronelist"
                        className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${isActive('/admin/drone')}`}
                    >
                        🚁 Drone
                    </Link>

                    <Link
                        to="/admin/branchlist"
                        className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${isActive('/admin/branch')}`}
                    >
                        🏢 Chi Nhánh
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AdminMenu;
