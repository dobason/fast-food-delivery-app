import jwt from 'jsonwebtoken';

const protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Lấy token từ header (Bỏ chữ 'Bearer')
            token = req.headers.authorization.split(' ')[1];

            // Giải mã token để lấy thông tin user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Gắn thông tin user vào request để các route sau có thể sử dụng
            req.user = decoded;

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Token không hợp lệ' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Không có quyền truy cập, không tìm thấy token' });
    }
};

const admin = (req, res, next) => {
    // Middleware này phải chạy SAU middleware 'protect'
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        res.status(403).json({ message: 'Không có quyền admin' });
    }
};

export { protect, admin };