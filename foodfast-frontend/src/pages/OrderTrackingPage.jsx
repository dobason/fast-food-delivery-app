// src/pages/OrderTrackingPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import { AuthContext } from '../context/AuthContext.jsx';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import useVietMapGeocode from '../hooks/useVietMapGeocode';
import LeafletRoutingLayer from '../components/LeafletRoutingLayer';

// --- ĐỊNH NGHĨA CÁC ICON TÙY CHỈNH ---
const droneIcon = new L.Icon({
  iconUrl:
    'https://th.bing.com/th/id/OIP.QaleUwWt00f9ndpuwJLgGQHaF7?w=198&h=180&c=7&r=0&o=7&cb=ucfimgc2&dpr=1.1&pid=1.7&rm=3',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

const restaurantIcon = new L.Icon({
  iconUrl:
    'https://th.bing.com/th/id/OIP.yfzOcsBCl7743NUjTsAqRQHaHa?w=158&h=180&c=7&r=0&o=7&cb=ucfimgc2&dpr=1.1&pid=1.7&rm=3',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

const homeIcon = new L.Icon({
  iconUrl:
    'https://th.bing.com/th/id/OIP.F_egOr6vo3ZHivDJW4nd3gHaHa?w=180&h=180&c=7&r=0&o=7&cb=ucfimgc2&dpr=1.1&pid=1.7&rm=3',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

// --- COMPONENT CHÍNH ---
const OrderTrackingPage = () => {
  const { id: orderId } = useParams();
  const { userInfo } = useContext(AuthContext);

  const [order, setOrder] = useState(null);
  const [orderStatus, setOrderStatus] = useState('Đang tải...');
  const [driverLocation, setDriverLocation] = useState(null);
  const [droneId, setDroneId] = useState(null);
  const [error, setError] = useState('');

  const {
    data: geocodeData,
    error: geocodeError,
    refetch: refetchGeocode,
    isFetched,
  } = useVietMapGeocode();

  // Tọa độ giả lập (Mặc định HCM)
  const restaurantLocation = [10.7626, 106.6602];

  // URL Socket
  const ORDER_SOCKET_URL = 'http://localhost:3003';
  const DELIVERY_SOCKET_URL = import.meta.env.VITE_DELIVERY_SOCKET_URL || 'http://localhost:3005';

  useEffect(() => {
    // 1. Kết nối Socket
    const socketOrder = io(ORDER_SOCKET_URL);
    const socketDelivery = io(DELIVERY_SOCKET_URL);

    const fetchInitialData = async () => {
      if (!userInfo || !userInfo.token) {
        setError('Vui lòng đăng nhập.');
        return;
      }
      try {
        const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/api/orders/${orderId}`,
          config
        );
        const formattedShippingAddress =
          data?.shippingAddress?.address + ', ' + data?.shippingAddress?.city;
        if (formattedShippingAddress) {
          refetchGeocode(formattedShippingAddress);
        }
        setOrder(data);
        setOrderStatus(data.status);
        if (data.droneId) setDroneId(data.droneId);

        // Logic hiển thị vị trí ban đầu
        if (['DRONE_ASSIGNED', 'DELIVERING'].includes(data.status)) {
          setDriverLocation(restaurantLocation);
        } else {
          setDriverLocation(null);
        }

        // Tham gia phòng họp
        socketOrder.emit('join_order_room', orderId);
        socketDelivery.emit('join_order_room', orderId);
      } catch (err) {
        console.error('Error fetching initial order data:', err);
        setError('Không thể tải dữ liệu đơn hàng.');
      }
    };

    fetchInitialData();

    // --- NGƯỜI NGHE (LISTENER) 2: LẮNG NGHE SỰ KIỆN ---

    // 2a. Nghe tin từ Order Service (Trạng thái đơn hàng)
    socketOrder.on('status_update', (data) => {
      console.log('🔔 Order Status Update:', data);
      setOrderStatus(data.status);
      if (data.droneId) setDroneId(data.droneId);

      // Nếu trạng thái chuyển sang Giao hàng -> Bật bản đồ ngay
      if (data.status === 'DRONE_ASSIGNED' || data.status === 'DELIVERING') {
        setDriverLocation(restaurantLocation);
      }
    });

    // 2b. Nghe tin từ Delivery Service (Vị trí Drone bay)
    socketDelivery.on('status_update', (data) => {
      console.log('🚁 Drone Moving:', data);
      if (data.status) setOrderStatus(data.status);
      if (data.location) {
        setDriverLocation([data.location.lat, data.location.lng]);
      }
      if (data.droneId) setDroneId(data.droneId);
    });

    return () => {
      socketOrder.disconnect();
      socketDelivery.disconnect();
    };
  }, [orderId]);

  useEffect(() => {
    if (geocodeError && isFetched) {
      alert('Lỗi khi lấy địa chỉ từ VietMap: ' + geocodeError);
    }
  }, [geocodeError, isFetched]);

  useEffect(() => {
    if (isFetched && orderStatus === 'DELIVERED') {
      setDriverLocation(geocodeData ? [geocodeData.lat, geocodeData.lng] : null);
    }
  }, [isFetched, orderStatus]);

  // --- XÁC ĐỊNH TRẠNG THÁI HIỂN THỊ BẢN ĐỒ ---
  const isShipping = ['DRONE_ASSIGNED', 'DELIVERING', 'DELIVERED'].includes(orderStatus);

  // Hàm hiển thị thông báo trạng thái
  const getStatusMessage = (status) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return 'Vui lòng thanh toán đơn hàng 💳';
      case 'PAID_WAITING_PROCESS':
        return 'Đang chờ nhà hàng xác nhận... ⏳';
      case 'PREPARING':
        return 'Bếp đang nấu món ngon cho bạn... 👨‍🍳';
      case 'READY_TO_SHIP':
        return 'Đã đóng gói xong! Đang chờ Drone tới lấy... 📦';
      case 'DRONE_ASSIGNED':
        return 'Đã tìm thấy Drone! Đang di chuyển... 🚁';
      case 'DELIVERING':
        return 'Drone đang bay tới chỗ bạn! 🚀';
      case 'DELIVERED':
        return 'Giao hàng thành công! Chúc ngon miệng 😋';
      case 'CANCELLED':
        return 'Đơn hàng đã bị hủy ❌';
      default:
        return 'Trạng thái không xác định';
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Link
        to="/myorders"
        className="text-indigo-600 hover:text-indigo-800 font-medium mb-4 inline-block"
      >
        &larr; Quay lại danh sách đơn hàng
      </Link>

      <h1 className="text-3xl font-bold mb-4 text-center text-gray-800">
        Theo dõi đơn hàng #{orderId?.slice(-6)}
      </h1>

      {error && <p className="text-center text-red-500 mb-4">{error}</p>}

      {/* Hiển thị Trạng thái & Drone */}
      <div className="flex flex-col items-center mb-6 space-y-2">
        {droneId && (
          <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full flex items-center">
            🚁 Phương tiện: {droneId}
          </span>
        )}
        <div className="text-xl font-medium text-gray-700">
          Trạng thái:{' '}
          <span className="font-bold text-indigo-600 ml-2 animate-pulse">
            {getStatusMessage(orderStatus)}
          </span>
        </div>
        <div className="text-xl font-medium text-gray-700">
          Địa chỉ cần giao đến:{' '}
          <span className="font-bold text-indigo-600 ml-2 animate-pulse">
            {geocodeData?.display}
          </span>
        </div>
      </div>

      {/* Hiển thị Bản đồ hoặc Màn hình chờ */}
      <div
        className="mb-8 shadow-lg rounded-xl overflow-hidden border border-gray-200 bg-gray-50 relative"
        style={{ minHeight: '50vh' }}
      >
        {isShipping && driverLocation ? (
          <MapContainer
            center={driverLocation}
            zoom={14}
            scrollWheelZoom={true}
            style={{ height: '50vh', width: '100%' }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={restaurantLocation} icon={restaurantIcon}>
              <Popup>📍 Nhà hàng</Popup>
            </Marker>
            {geocodeData && (
              <Marker position={[geocodeData?.lat, geocodeData?.lng]} icon={homeIcon}>
                <Popup>
                  🏠 Địa chỉ cần giao: <br /> {geocodeData?.display}
                </Popup>
              </Marker>
            )}
            <Marker position={driverLocation} icon={droneIcon}>
              <Popup>🚁 {droneId || 'Tài xế'}</Popup>
            </Marker>
            {isFetched && geocodeData && (
              <LeafletRoutingLayer
                from={restaurantLocation}
                to={[geocodeData?.lat, geocodeData?.lng]}
              />
            )}
          </MapContainer>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-gray-100 p-4">
            <div className="text-6xl mb-4 animate-spin">
              {orderStatus === 'PENDING_PAYMENT'
                ? '💳'
                : orderStatus === 'PAID_WAITING_PROCESS'
                ? '⏳'
                : orderStatus === 'PREPARING'
                ? '👨‍🍳'
                : orderStatus === 'READY_TO_SHIP'
                ? '📦'
                : '⌛'}
            </div>
            {orderStatus && (
              <p className="text-xl font-bold text-center px-4 text-gray-700">
                {getStatusMessage(orderStatus)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Hiển thị Chi tiết đơn hàng (Bill) */}
      {order && (
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-xl mx-auto border border-gray-100">
          <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Chi tiết hóa đơn</h2>

          <div className="space-y-3">
            {order.orderItems.map((item, index) => (
              <div key={index} className="flex justify-between text-gray-700">
                <div>
                  <span className="font-medium">{item.name}</span>
                  <span className="text-gray-500 text-sm ml-2">
                    x{item.qty || item.quantity || 1}
                  </span>
                </div>
                <div className="font-semibold">
                  {(Number(item.price) * Number(item.qty || item.quantity || 1)).toLocaleString(
                    'vi-VN'
                  )}{' '}
                  VNĐ
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-300 my-4"></div>

          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Địa chỉ:</span>
              <span>
                {order.shippingAddress.address}, {order.shippingAddress.city}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Tạm tính:</span>
              <span>
                {Number(order.itemsPrice || Number(order.totalPrice) - 30000).toLocaleString(
                  'vi-VN'
                )}{' '}
                VNĐ
              </span>
            </div>
            <div className="flex justify-between">
              <span>Phí vận chuyển:</span>
              <span>
                {order.shippingPrice !== undefined
                  ? Number(order.shippingPrice).toLocaleString('vi-VN')
                  : '30.000'}{' '}
                VNĐ
              </span>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between items-center">
            <span className="text-lg font-bold text-gray-800">Tổng cộng:</span>
            <span className="text-xl font-bold text-indigo-600">
              {Number(order.totalPrice || 0).toLocaleString('vi-VN')} VNĐ
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTrackingPage;
