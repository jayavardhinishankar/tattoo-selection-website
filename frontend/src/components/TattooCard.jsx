import { imageSrc } from '../services/api';
import { useSelection } from '../context/SelectionContext';
import { formatNumber, formatPrice } from '../utils/format';

export default function TattooCard({ tattoo, onView }) {
  const { has, toggle } = useSelection();
  const selected = has(tattoo._id);

  return (
    <article className={`tattoo-card ${selected ? 'is-selected' : ''}`}>
      <button type="button" className="tattoo-image" onClick={() => onView(tattoo)} aria-label={`View details of ${tattoo.name}`}>
        <img src={imageSrc(tattoo.imageUrl)} alt={tattoo.name} loading="lazy" />
        <span className="tattoo-number">Tattoo {formatNumber(tattoo.tattooNumber)}</span>
        {selected && <span className="selected-flag">Selected</span>}
      </button>
      <div className="tattoo-info">
        <h3>{tattoo.name}</h3>
        <p className="tattoo-price">{formatPrice(tattoo.price)}</p>
        <div className="tattoo-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onView(tattoo)}>
            View Details
          </button>
          <button
            type="button"
            className={`btn btn-sm ${selected ? 'btn-selected' : 'btn-light'}`}
            onClick={() => toggle(tattoo)}
          >
            {selected ? 'Remove' : 'Select This Tattoo'}
          </button>
        </div>
      </div>
    </article>
  );
}
