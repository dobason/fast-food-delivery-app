import React, { createContext, useState, useEffect } from 'react';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
    // 1. Khởi tạo giỏ hàng
    const [cartItems, setCartItems] = useState(() => {
        try {
            const savedCart = localStorage.getItem('cartItems');
            return savedCart ? JSON.parse(savedCart) : [];
        } catch (error) {
            console.error("Lỗi đọc giỏ hàng cũ:", error);
            return [];
        }
    });

    // 2. Tự động lưu
    useEffect(() => {
        localStorage.setItem('cartItems', JSON.stringify(cartItems));
    }, [cartItems]);

    // 3. Thêm vào giỏ
    const addToCart = (product) => {
        if (!product || !product._id) return;

        const existItem = cartItems.find((x) => x._id === product._id);

        if (existItem) {
            setCartItems(
                cartItems.map((x) =>
                    x._id === existItem._id ? { ...existItem, qty: (existItem.qty || 1) + 1 } : x
                )
            );
        } else {
            const newItem = {
                _id: product._id,
                product: product._id,
                name: product.name,
                image: product.image || product.imageUrl || "",
                price: Number(product.price),
                countInStock: product.countInStock,
                qty: 1
            };
            setCartItems([...cartItems, newItem]);
        }
        alert(`Đã thêm "${product.name}" vào giỏ!`);
    };

    // 4. Xóa món
    const removeFromCart = (id) => {
        setCartItems(cartItems.filter((x) => x._id !== id));
    };

    // --- 5. MỚI THÊM: CẬP NHẬT SỐ LƯỢNG ---
    const updateQty = (id, newQty) => {
        // Không cho phép số lượng < 1
        if (newQty < 1) return;
        
        setCartItems(cartItems.map((x) => 
            x._id === id ? { ...x, qty: newQty } : x
        ));
    };
    // -------------------------------------

    // 6. Xóa sạch giỏ
    const clearCart = () => {
        setCartItems([]);
        localStorage.removeItem('cartItems');
    };

    return (
        // Nhớ thêm updateQty vào value provider
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQty, clearCart }}>
            {children}
        </CartContext.Provider>
    );
};

export default CartProvider;