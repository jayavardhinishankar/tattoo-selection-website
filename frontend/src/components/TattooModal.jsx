import { useEffect } from 'react';
import { imageSrc } from '../services/api';
import { useSelection } from '../context/SelectionContext';
import { formatNumber, formatPrice } from '../utils/format';
import PriceNote from './PriceNote';

export default function TattooModal({ tattoo, onClose }) {
  const { has, toggle } = useSelection();
  const selected = has(tattoo._id);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={tattoo.name} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="modal-image">
          <img src={imageSrc(tattoo.imageUrl)} alt={tattoo.name} />
        </div>
        <div className="modal-body">
          <p className="eyebrow">Tattoo {formatNumber(tattoo.tattooNumber)}</p>
          <h2>{tattoo.name}</h2>
          {tattoo.categoryId?.name && <p className="muted">Category: {tattoo.categoryId.name}</p>}
          <p className="modal-price">{formatPrice(tattoo.price)}</p>
          {tattoo.description ? <p className="modal-desc">{tattoo.description}</p> : <p className="muted">No description provided.</p>}
          <PriceNote />
          <div className="modal-actions">
            <button type="button" className={`btn ${selected ? 'btn-selected' : 'btn-light'}`} onClick={() => toggle(tattoo)}>
              {selected ? 'Remove From Selection' : 'Select This Tattoo'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
