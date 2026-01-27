import '../skeletons/Skeleton.css';

function CardSkeleton({ count = 4 }) {
    return (
        <div className="skeleton-grid">
            {Array.from({ length: count }).map((_, idx) => (
                <div key={idx} className="skeleton-card">
                    <div className="skeleton-card-header">
                        <div style={{ flex: 1 }}>
                            <div className="skeleton skeleton-text-lg" style={{ width: '150px', marginBottom: '0.5rem' }}></div>
                            <div className="skeleton skeleton-text" style={{ width: '100px' }}></div>
                        </div>
                        <div className="skeleton skeleton-shield"></div>
                    </div>
                    <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <div className="skeleton skeleton-text" style={{ width: '80px', marginBottom: '0.5rem' }}></div>
                            <div className="skeleton skeleton-text-lg" style={{ width: '60px' }}></div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div className="skeleton skeleton-text" style={{ width: '80px', marginBottom: '0.5rem' }}></div>
                            <div className="skeleton skeleton-text-lg" style={{ width: '60px' }}></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default CardSkeleton;
