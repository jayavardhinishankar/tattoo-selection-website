import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelection } from '../context/SelectionContext';
import usePolling from '../hooks/usePolling';
import { imageSrc, publicApi } from '../services/api';
import { formatNumber, formatPrice } from '../utils/format';
import StateMessage from '../components/StateMessage';
import PriceNote from '../components/PriceNote';

export default function Selection() {
  const { items, total, count, remove, clear, applySync } = useSelection();
  const idKey = items.map((i) => i._id).join(',');

  // Re-check every selected tattoo against the server so prices / availability stay accurate.
  const sync = usePolling(
    async () => {
      const ids = idKey ? idKey.split(',') : [];
      const results = await Promise.all(
        ids.map((tid) =>
          publicApi.getTattoo(tid).catch((err) => (err.response?.status === 404 ? null : undefined))
        )
      );
      return { ids, results };
    },
    [idKey],
    20000
  );

  useEffect(() => {
    if (sync.data) applySync(sync.data.ids, sync.data.results);
  }, [sync.data, applySync]);

  if (items.length === 0) {
    return (
      <section className="container section">
        <h1>My Selection</h1>
        <StateMessage
          title="You haven't selected any tattoos yet"
          action={
            <Link to="/gallery" className="btn btn-light">
              Browse tattoos
            </Link>
          }
        >
          Tap “Select This Tattoo” on any design and it will appear here with its number and price.
        </StateMessage>
      </section>
    );
  }

  const hasUnavailable = items.some((i) => i.unavailable);

  return (
    <section className="container section">
      <div className="gallery-head">
        <div>
          <p className="eyebrow">Your picks</p>
          <h1>My Selection</h1>
          <p className="muted">Show these tattoo numbers to the studio to confirm your booking.</p>
        </div>
        <button className="btn btn-ghost" onClick={clear}>
          Clear selection
        </button>
      </div>

      {hasUnavailable && (
        <div className="notice error" role="alert">
          Some tattoos in your selection are no longer available. They are excluded from the total — please remove them.
        </div>
      )}

      <div className="selection-layout">
        <ul className="selection-list">
          {items.map((i) => (
            <li key={i._id} className={`selection-item ${i.unavailable ? 'unavailable' : ''}`}>
              <img src={imageSrc(i.imageUrl)} alt={i.name} />
              <div className="selection-meta">
                <p className="eyebrow">Tattoo {formatNumber(i.tattooNumber)}</p>
                <h3>{i.name}</h3>
                {i.categoryName && <p className="muted small">{i.categoryName}</p>}
                {i.unavailable && <p className="unavailable-tag">No longer available</p>}
              </div>
              <div className="selection-price">{i.unavailable ? '—' : formatPrice(i.price)}</div>
              <button className="icon-btn" onClick={() => remove(i._id)} aria-label={`Remove ${i.name}`}>
                ×
              </button>
            </li>
          ))}
        </ul>

        <aside className="summary">
          <h3>Selection Summary</h3>
          <table className="summary-table">
            <tbody>
              {items
                .filter((i) => !i.unavailable)
                .map((i) => (
                  <tr key={i._id}>
                    <td>
                      {formatNumber(i.tattooNumber)} · {i.name}
                    </td>
                    <td className="num">{formatPrice(i.price)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <div className="summary-total">
            <span>
              Estimated total ({count} {count === 1 ? 'tattoo' : 'tattoos'})
            </span>
            <strong>{formatPrice(total)}</strong>
          </div>
          <PriceNote />
          <Link to="/gallery" className="btn btn-ghost btn-block">
            Add more tattoos
          </Link>
        </aside>
      </div>
    </section>
  );
}
