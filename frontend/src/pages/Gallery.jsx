import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import usePolling from '../hooks/usePolling';
import { errorMessage, publicApi } from '../services/api';
import { formatPrice } from '../utils/format';
import TattooCard from '../components/TattooCard';
import TattooModal from '../components/TattooModal';
import SearchBar from '../components/SearchBar';
import Spinner from '../components/Spinner';
import StateMessage from '../components/StateMessage';
import PriceNote from '../components/PriceNote';

const PAGE_SIZE = 12;

export default function Gallery() {
  const { id } = useParams(); // present on /category/:id, absent on /gallery
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const page = Math.max(parseInt(params.get('page'), 10) || 1, 1);
  const [viewing, setViewing] = useState(null);

  const cats = usePolling(publicApi.getCategories, [], 15000);
  const tattoos = usePolling(
    () => publicApi.getTattoos({ category: id || undefined, search: q || undefined, page, limit: PAGE_SIZE }),
    [id, q, page],
    10000
  );

  const category = id && cats.data ? cats.data.find((c) => c._id === id) : null;
  const categoryMissing = id && cats.data && !category;

  const go = (next) => {
    const sp = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v ? sp.set(k, v) : sp.delete(k)));
    setParams(sp);
  };

  const items = tattoos.data?.data || [];
  const pagination = tattoos.data?.pagination;

  // keep an open modal in sync with the latest data
  const liveViewing = viewing ? items.find((t) => t._id === viewing._id) || viewing : null;

  return (
    <section className="container section">
      <div className="gallery-head">
        <div>
          <p className="eyebrow">{id ? 'Category' : 'Gallery'}</p>
          <h1>{category ? category.name : 'All Tattoos'}</h1>
          {category && (
            <>
              <p className="category-price big">
                <span className="muted small">Starting from</span> {formatPrice(category.startingPrice)}
              </p>
              {category.description && <p className="muted">{category.description}</p>}
            </>
          )}
        </div>
        <SearchBar
          key={`${id || 'all'}-${q}`}
          initial={q}
          onSubmit={(value) => go({ q: value, page: '' })}
        />
      </div>

      <div className="chips" role="tablist" aria-label="Filter by category">
        <Link to={q ? `/gallery?q=${encodeURIComponent(q)}` : '/gallery'} className={`chip ${!id ? 'active' : ''}`}>
          All
        </Link>
        {(cats.data || []).map((c) => (
          <Link
            key={c._id}
            to={q ? `/category/${c._id}?q=${encodeURIComponent(q)}` : `/category/${c._id}`}
            className={`chip ${id === c._id ? 'active' : ''}`}
          >
            {c.name} <span className="chip-count">{c.tattooCount}</span>
          </Link>
        ))}
      </div>

      {q && (
        <p className="muted search-info">
          Results for “{q}” —{' '}
          <button className="link-btn" onClick={() => go({ q: '', page: '' })}>
            clear search
          </button>
        </p>
      )}

      {categoryMissing ? (
        <StateMessage
          title="Category not found"
          action={
            <button className="btn btn-light" onClick={() => navigate('/')}>
              Back to home
            </button>
          }
        >
          This category may have been removed or is not available right now.
        </StateMessage>
      ) : tattoos.loading ? (
        <Spinner label="Loading tattoos…" />
      ) : tattoos.error ? (
        <StateMessage
          tone="error"
          title="We couldn't load the tattoos"
          action={
            <button className="btn btn-light" onClick={tattoos.refresh}>
              Try again
            </button>
          }
        >
          {errorMessage(tattoos.error)}
        </StateMessage>
      ) : items.length === 0 ? (
        <StateMessage title={q ? 'No tattoos match your search' : 'No tattoos here yet'}>
          {q ? 'Try a different number or name.' : 'New designs are added regularly — please check back soon.'}
        </StateMessage>
      ) : (
        <>
          <div className="tattoo-grid">
            {items.map((t) => (
              <TattooCard key={t._id} tattoo={t} onView={setViewing} />
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <nav className="pagination" aria-label="Pagination">
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => go({ page: String(page - 1) })}>
                ← Previous
              </button>
              <span className="muted">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page >= pagination.pages}
                onClick={() => go({ page: String(page + 1) })}
              >
                Next →
              </button>
            </nav>
          )}
        </>
      )}

      <PriceNote />
      {liveViewing && <TattooModal tattoo={liveViewing} onClose={() => setViewing(null)} />}
    </section>
  );
}
