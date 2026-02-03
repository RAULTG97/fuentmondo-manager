import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/common/Toast';

const ToastContext = createContext();

export const useToast = () => {
    return useContext(ToastContext);
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prevToasts) => [...prevToasts, { id, message, type, duration }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="toast-container">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        {...toast}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
};
