import '../skeletons/Skeleton.css';

function PanelSkeleton({ rows = 6 }) {
    return (
        <div className="card">
            <div className="skeleton skeleton-header" style={{ width: '200px', marginBottom: '1.5rem' }}></div>
            {Array.from({ length: rows }).map((_, idx) => (
                <div key={idx} style={{ marginBottom: '1rem' }}>
                    <div className="skeleton skeleton-row" style={{ width: `${Math.random() * 30 + 70}%` }}></div>
                </div>
            ))}
        </div>
    );
}

export default PanelSkeleton;
