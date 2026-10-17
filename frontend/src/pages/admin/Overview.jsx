import { Link } from 'react-router-dom';
import usePolling from '../../hooks/usePolling';
import { adminApi, errorMessage, imageSrc } from '../../services/api';
import { formatNumber, formatPrice } from '../../utils/format';
import Spinner from '../../components/Spinner';
import StateMessage from '../../components/StateMessage';

export default function Overview() {
  const { data, loading, error, refresh } = usePolling(adminApi.dashboard, [], 30000);

  return (
    <>
      <div className="admin-head">
        <h1>Dashboard Overview</h1>
        <Link to="/admin/tattoos/new" className="btn btn-light">
          + Add New Tattoo
        </Link>
      </div>

      {loading && <Spinner />}
      {!loading && error && (
        <StateMessage
          tone="error"
          title="Could not load dashboard"
          action={
            <button className="btn btn-light" onClick={refresh}>
              Try again
            </button>
          }
        >
          {errorMessage(error)}
        </StateMessage>
      )}

      {data && (
        <>
          <div className="stat-grid">
            <div className="stat">
              <span className="stat-value">{data.totalTattoos}</span>
              <span className="stat-label">Total tattoos</span>
            </div>
            <div className="stat">
              <span className="stat-value">{data.activeTattoos}</span>
              <span className="stat-label">Visible to visitors</span>
            </div>
            <div className="stat">
              <span className="stat-value">{data.inactiveTattoos}</span>
              <span className="stat-label">Inactive (hidden)</span>
            </div>
            <div className="stat">
              <span className="stat-value">{data.activeCategories}</span>
              <span className="stat-label">Active categories</span>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Recently added</h2>
              <Link to="/admin/tattoos" className="link-btn">
                View all →
              </Link>
            </div>
            {data.recent.length === 0 ? (
              <p className="muted">No tattoos yet. Add your first one to get started.</p>
            ) : (
              <ul className="recent-list">
                {data.recent.map((t) => (
                  <li key={t._id}>
                    <img src={imageSrc(t.imageUrl)} alt={t.name} />
                    <div>
                      <strong>
                        {formatNumber(t.tattooNumber)} · {t.name}
                      </strong>
                      <span className="muted small">
                        {t.categoryId?.name || 'Uncategorised'} · {formatPrice(t.price)}
                      </span>
                    </div>
                    <span className={`pill ${t.isActive ? 'on' : 'off'}`}>{t.isActive ? 'Active' : 'Inactive'}</span>
                    <Link to={`/admin/tattoos/${t._id}/edit`} className="btn btn-ghost btn-sm">
                      Edit
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </>
  );
}
