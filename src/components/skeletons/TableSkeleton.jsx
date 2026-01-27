import '../skeletons/Skeleton.css';

function TableSkeleton({ rows = 8, columns = 12 }) {
    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="skeleton-table">
                <thead>
                    <tr style={{ background: '#1e293b' }}>
                        {Array.from({ length: columns }).map((_, i) => (
                            <th key={i} style={{ padding: '1rem' }}>
                                <div className="skeleton skeleton-text" style={{ width: '60px' }}></div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }).map((_, rowIdx) => (
                        <tr key={rowIdx}>
                            {Array.from({ length: columns }).map((_, colIdx) => (
                                <td key={colIdx}>
                                    {colIdx === 1 ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div className="skeleton skeleton-shield"></div>
                                            <div className="skeleton skeleton-text" style={{ width: '120px' }}></div>
                                        </div>
                                    ) : (
                                        <div className="skeleton skeleton-text" style={{ width: colIdx === 0 ? '30px' : '50px' }}></div>
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default TableSkeleton;
