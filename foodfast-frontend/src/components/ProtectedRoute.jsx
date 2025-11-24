// src/components/ProtectedRoute.jsx
import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { userInfo } = useContext(AuthContext);
    const location = useLocation();

    if (!userInfo) {
        // Nếu chưa đăng nhập, chuyển hướng đến trang login
        // và "ghi nhớ" lại trang họ muốn đến (location.pathname)
        return <Navigate to={`/login?redirect=${location.pathname}`} replace />;
    }

    // Nếu đã đăng nhập, hiển thị component con (trang mà họ muốn truy cập)
    return children;
};

export default ProtectedRoute;