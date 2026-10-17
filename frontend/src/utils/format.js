export const formatPrice = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const formatNumber = (n) => `#${String(n).padStart(3, '0')}`;

export const tattooLabel = (n) => `Tattoo ${formatNumber(n)}`;

export function priceInfo(category) {
  if (category.minPrice != null && category.maxPrice != null) {
    return category.minPrice === category.maxPrice
      ? `Designs at ${formatPrice(category.minPrice)}`
      : `Designs ${formatPrice(category.minPrice)} – ${formatPrice(category.maxPrice)}`;
  }
  return null;
}
