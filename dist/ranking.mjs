export const resultLimit = 25;

export function priceWindow(budget, pieces = 1) {
  if (!Number.isFinite(budget) || budget < 1 || budget > 10000000) return null;
  const buffer = budget < 1000 ? 200 : budget < 10000 ? 2000 : budget < 100000 ? 5000 : 20000;
  return {
    min: Math.ceil(Math.max(0,budget-buffer)/pieces),
    max: Math.floor((budget+buffer)/pieces)
  };
}

function reviewScore({rating,reviews}) {
  // Use a small prior so that a single five-star rating cannot dominate.
  return (rating*reviews+4*20)/(reviews+20);
}

export function rankProducts(products, range, limit = resultLimit) {
  const sorted = products.filter(({rating,reviews,price}) =>
    Number.isFinite(rating) && rating > 0 && rating <= 5 &&
    Number.isInteger(reviews) && reviews > 0 &&
    (!range || (Number.isFinite(price) && price >= range.min && price <= range.max)))
    .sort((a,b) => reviewScore(b)-reviewScore(a) || b.reviews-a.reviews || b.rating-a.rating);
  const seen = new Set();
  return sorted.filter(product => {
    if (seen.has(product.url)) return false;
    seen.add(product.url);
    return true;
  }).slice(0,limit);
}
