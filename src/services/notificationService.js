/**
 * Utility for handling Browser Desktop Notifications
 */
export const NotificationService = {
    /**
     * Request permission to show notifications
     */
    requestPermission: async () => {
        if (!('Notification' in window)) {
            console.warn('Este navegador no soporta notificaciones de escritorio.');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    },

    /**
     * Send a notification
     * @param {string} title 
     * @param {Object} options 
     */
    notify: async (title, options = {}) => {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return null;
        }

        const defaultOptions = {
            icon: '/fuentmondo-manager/logo.jpeg',
            badge: '/fuentmondo-manager/logo.jpeg',
        };

        const combinedOptions = { ...defaultOptions, ...options };

        // Try to use Service Worker registration if available (better for PWA/Mobile)
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                if (registration) {
                    return registration.showNotification(title, combinedOptions);
                }
            } catch (e) {
                console.warn('Falló el envío vía Service Worker, intentando vía ventana:', e);
            }
        }

        // Fallback to standard Notification API
        try {
            return new Notification(title, combinedOptions);
        } catch (e) {
            console.error('Error enviando notificación:', e);
            return null;
        }
    }
};
