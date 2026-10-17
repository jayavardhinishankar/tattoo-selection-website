import { Link, useNavigate } from 'react-router-dom';
import usePolling from '../hooks/usePolling';
import { errorMessage, publicApi } from '../services/api';
import CategoryCard from '../components/CategoryCard';
import SearchBar from '../components/SearchBar';
import Spinner from '../components/Spinner';
import StateMessage from '../components/StateMessage';
import PriceNote from '../components/PriceNote';

export default function Home() {
  const navigate = useNavigate();
  const { data: categories, loading, error, refresh } = usePolling(publicApi.getCategories, [], 15000);

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <p className="eyebrow">Tattoo Studio</p>
          <h1>Find Your Perfect Tattoo</h1>
          <p className="hero-sub">
            Explore our numbered collection of designs, compare prices across four categories, and pick the
            artwork you want to wear. No account needed — just browse, select and bring your numbers to the studio.
          </p>
          <SearchBar
            big
            onSubmit={(q) => navigate(q ? `/gallery?q=${encodeURIComponent(q)}` : '/gallery')}
          />
          <p className="muted small hero-hint">Try a number like “12” or a name like “rose”.</p>
        </div>
      </section>

      <section className="container section">
        <div className="section-head">
          <h2>Choose a Category</h2>
          <p className="muted">Each category has its own starting price. Individual designs show their exact price.</p>
        </div>

        {loading && <Spinner label="Loading categories…" />}

        {!loading && error && (
          <StateMessage
            tone="error"
            title="We couldn't load the categories"
            action={
              <button className="btn btn-light" onClick={refresh}>
                Try again
              </button>
            }
          >
            {errorMessage(error)}
          </StateMessage>
        )}

        {!loading && !error && categories && categories.length === 0 && (
          <StateMessage title="No categories yet">Please check back soon — new designs are on the way.</StateMessage>
        )}

        {!loading && !error && categories && categories.length > 0 && (
          <div className="category-grid">
            {categories.map((c) => (
              <CategoryCard key={c._id} category={c} />
            ))}
          </div>
        )}

        <PriceNote />
      </section>

      <section className="container section home-features">
        <div className="section-head">
          <h2>More from our studio</h2>
          <p className="muted">Share your experience or create a custom letter design.</p>
        </div>
        <div className="home-feature-grid">
          <article className="home-feature-card">
            <p className="eyebrow">Your experience matters</p>
            <h3>Customer Feedback</h3>
            <p className="muted">Tell us about your experience and read feedback shared by our customers.</p>
            <Link to="/feedback" className="btn btn-ghost">Leave feedback</Link>
          </article>
          <article className="home-feature-card">
            <p className="eyebrow">Make it personal</p>
            <h3>Letter Tattoo Designer</h3>
            <p className="muted">Choose a letter and explore fonts to create a design reference for your artist.</p>
            <Link to="/lettering-designer" className="btn btn-light">Design a letter</Link>
          </article>
        </div>
      </section>
    </>
  );
}
