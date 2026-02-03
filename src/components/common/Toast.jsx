import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import './Toast.css';

const icons = {
    success: <CheckCircle size={20} />,
    error: <AlertCircle size={20} />,
    warning: <AlertCircle size={20} />,
    info: <Info size={20} />
};

const Toast = ({ message, type = 'info', duration = 3000, onClose }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(onClose, 300); // Wait for exit animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div className={`toast toast-${type} ${isExiting ? 'exit' : ''}`}>
            <div className="toast-icon">{icons[type]}</div>
            <div className="toast-message">{message}</div>
            <button className="toast-close" onClick={() => { setIsExiting(true); setTimeout(onClose, 300); }}>
                <X size={16} />
            </button>
        </div>
    );
};

export default Toast;
