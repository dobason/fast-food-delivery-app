// src/components/AdminRoute.jsx
import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AdminRoute = ({ children }) => {
    const { userInfo } = useContext(AuthContext);
    const location = useLocation();

    if (userInfo && userInfo.isAdmin) {
        // Nếu đã đăng nhập và là admin, cho phép truy cập
        return children;
    }

    // Nếu không, chuyển hướng về trang chủ hoặc trang đăng nhập
    return <Navigate to="/login" state={{ from: location }} replace />;
};

export default AdminRoute;