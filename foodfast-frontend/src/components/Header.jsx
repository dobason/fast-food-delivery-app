import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';

const Header = ({ currentBranch, onChangeBranch }) => {
  const { userInfo, logout } = useContext(AuthContext);
  const { cartItems } = useContext(CartContext);
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setDropdownOpen(false);
  };

  // Tính tổng số lượng món trong giỏ
  const cartCount = cartItems.reduce(
    (acc, item) => acc + Number(item.qty || item.quantity || 0),
    0
  );

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-black text-indigo-900 tracking-tighter">
            Food<span className="text-yellow-500">Fast</span>.
          </span>
        </Link>

        {/* MENU PHẢI */}
        <div className="flex items-center gap-6">
          {/* --- NÚT DÀNH RIÊNG CHO ADMIN (MỚI THÊM) --- */}
          {userInfo && userInfo.isAdmin && (
            <Link
              to="/admin/dashboard"
              className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full font-bold text-sm hover:bg-indigo-200 transition"
            >
              🛡️ Trang Quản Trị
            </Link>
          )}

          {/* GIỎ HÀNG (Chỉ hiện nếu không phải Admin) */}
          {!userInfo?.isAdmin && (
            <Link to="/cart" className="relative text-gray-600 hover:text-indigo-600 transition">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                ></path>
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          )}

          {/* USER DROPDOWN */}
          {userInfo ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 font-medium text-gray-700 hover:text-indigo-600 focus:outline-none"
              >
                <span>{userInfo.name}</span>
                {userInfo.isAdmin && (
                  <span className="bg-yellow-300 text-xs px-1.5 py-0.5 rounded text-yellow-900">
                    Manager
                  </span>
                )}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 border border-gray-100">
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Hồ sơ cá nhân
                  </Link>

                  {/* Link Đơn hàng của tôi (User thường) */}
                  <Link
                    to="/myorders"
                    className="block px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Đơn hàng của tôi
                  </Link>

                  <div className="border-t my-1"></div>

                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-800">
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
