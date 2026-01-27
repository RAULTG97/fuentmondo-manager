import React from 'react';
import { APP_LOGO } from '../utils/assets';
import './Loader.css';

const Loader = ({ text = "Cargando...", type = "full" }) => {
    // type: 'full' | 'inline' | 'overlay'

    return (
        <div className={`loader-container ${type}`}>
            <div className="loader-ring">
                <div className="ring-glow" />
                <svg className="ring-svg" viewBox="0 0 50 50">
                    <circle
                        cx="25"
                        cy="25"
                        r="20"
                        className="ring-circle"
                    />
                </svg>
                {type !== 'inline' && (
                    <img src={APP_LOGO} alt="Loading" className="loader-logo" />
                )}
            </div>
            {text && <span className="loader-text">{text}</span>}
        </div>
    );
};

export default Loader;
