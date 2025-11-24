// src/pages/LoginPage.jsx

import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    const { userInfo, login } = useContext(AuthContext);
    const navigate = useNavigate();
    const { search } = useLocation();

    const redirectInUrl = new URLSearchParams(search).get('redirect');
    const redirect = redirectInUrl ? redirectInUrl : '/';

    useEffect(() => {
        if (userInfo) {
            navigate(redirect);
        }
    }, [navigate, userInfo, redirect]);

    const submitHandler = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            const { data } = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/users/login`, { email, password });
            login(data);
            navigate(redirect);
        } catch (err) {
            setError(err.response?.data?.message || 'Email hoặc mật khẩu không hợp lệ.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh] bg-gray-50">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-center text-gray-900">Đăng Nhập</h1>
                {error && <p className="text-red-500 text-center">{error}</p>}
                <form onSubmit={submitHandler} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Địa chỉ Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Mật khẩu
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-2 px-4 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Đăng Nhập
                    </button>
                </form>
                <div className="text-sm text-center">
                    <p className="text-gray-600">
                        Chưa có tài khoản?{' '}
                        <Link to={redirect ? `/register?redirect=${redirect}` : '/register'} className="font-medium text-indigo-600 hover:text-indigo-500">
                            Đăng ký
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;