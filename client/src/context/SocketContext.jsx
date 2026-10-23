import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

export const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
};

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [staffLocations, setStaffLocations] = useState({});
  const [activeDeliveryStatus, setActiveDeliveryStatus] = useState(null);

  useEffect(() => {
    if (token && user) {
      const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
      const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.on('connect', () => {
        setConnected(true);
        console.log('Socket connected:', socket.id);
      });

      socket.on('disconnect', () => {
        setConnected(false);
      });

      socket.on('staffLocationUpdate', (data) => {
        setStaffLocations((prev) => ({
          ...prev,
          [data.staffId]: { ...data, updatedAt: new Date() },
        }));
      });

      socket.on('deliveryStatusUpdate', (data) => {
        setActiveDeliveryStatus(data);
      });

      socket.on('staffOffDuty', (data) => {
        setStaffLocations((prev) => {
          const updated = { ...prev };
          delete updated[data.staffId];
          return updated;
        });
      });

      socketRef.current = socket;

      return () => {
        socket.disconnect();
        socketRef.current = null;
      };
    }
  }, [token, user]);

  const emit = (event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  };

  const on = (event, callback) => {
    socketRef.current?.on(event, callback);
    return () => socketRef.current?.off(event, callback);
  };

  const trackDelivery = (deliveryId) => {
    emit('trackDelivery', deliveryId);
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, emit, on, staffLocations, activeDeliveryStatus, trackDelivery }}>
      {children}
    </SocketContext.Provider>
  );
};
