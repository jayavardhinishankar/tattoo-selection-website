import { Link } from 'react-router-dom';
import { imageSrc } from '../services/api';
import { formatPrice, priceInfo } from '../utils/format';

export default function CategoryCard({ category }) {
  const info = priceInfo(category);
  return (
    <article className="category-card">
      <div className="category-cover">
        {category.coverImage ? (
          <img src={imageSrc(category.coverImage)} alt="" loading="lazy" />
        ) : (
          <div className="cover-placeholder" aria-hidden="true">
            ✦
          </div>
        )}
      </div>
      <div className="category-body">
        <h3>{category.name}</h3>
        <p className="category-price">
          <span className="muted small">Starting from</span> {formatPrice(category.startingPrice)}
        </p>
        {info && <p className="muted small">{info}</p>}
        {category.description && <p className="category-desc">{category.description}</p>}
        <p className="category-count">
          {category.tattooCount} {category.tattooCount === 1 ? 'tattoo' : 'tattoos'} available
        </p>
        <Link to={`/category/${category._id}`} className="btn btn-light btn-block">
          Explore Tattoos
        </Link>
      </div>
    </article>
  );
}
