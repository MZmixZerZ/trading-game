import React, { useState, useEffect } from 'react';
import { FaTimes, FaExclamationTriangle, FaInfoCircle, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const NotificationSystem = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Listen for custom notification events
    const handleNotification = (event) => {
      const { type, message, duration = 5000 } = event.detail;
      
      const notification = {
        id: Date.now() + Math.random(),
        type,
        message,
        duration,
        timestamp: new Date()
      };

      setNotifications(prev => [...prev, notification]);

      // Auto-remove after duration
      if (duration > 0) {
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, duration);
      }
    };

    window.addEventListener('show-notification', handleNotification);

    return () => {
      window.removeEventListener('show-notification', handleNotification);
    };
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <FaCheckCircle className="text-green-400" />;
      case 'error':
        return <FaTimesCircle className="text-red-400" />;
      case 'warning':
        return <FaExclamationTriangle className="text-yellow-400" />;
      case 'info':
      default:
        return <FaInfoCircle className="text-blue-400" />;
    }
  };

  const getNotificationStyles = (type) => {
    const baseStyles = "border border-opacity-50 backdrop-blur-sm";
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-900 bg-opacity-80 border-green-600`;
      case 'error':
        return `${baseStyles} bg-red-900 bg-opacity-80 border-red-600`;
      case 'warning':
        return `${baseStyles} bg-yellow-900 bg-opacity-80 border-yellow-600`;
      case 'info':
      default:
        return `${baseStyles} bg-blue-900 bg-opacity-80 border-blue-600`;
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            ${getNotificationStyles(notification.type)}
            p-4 rounded-lg shadow-lg
            transform transition-all duration-300 ease-in-out
            animate-slide-in-right
          `}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getNotificationIcon(notification.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm leading-relaxed">
                {notification.message}
              </p>
            </div>
            
            <button
              onClick={() => removeNotification(notification.id)}
              className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Utility functions to show notifications
export const showNotification = (type, message, duration = 5000) => {
  const event = new CustomEvent('show-notification', {
    detail: { type, message, duration }
  });
  window.dispatchEvent(event);
};

export const showSuccess = (message, duration) => showNotification('success', message, duration);
export const showError = (message, duration) => showNotification('error', message, duration);
export const showWarning = (message, duration) => showNotification('warning', message, duration);
export const showInfo = (message, duration) => showNotification('info', message, duration);

export default NotificationSystem;
