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

export function rankProducts(products, range, limit = resultLimit, mixRetailers = false) {
  const sorted = products.filter(({rating,reviews,price}) =>
    Number.isFinite(rating) && rating >= (mixRetailers ? 4 : 1) && rating <= 5 &&
    Number.isInteger(reviews) && reviews > 0 &&
    (!range || (Number.isFinite(price) && price >= range.min && price <= range.max)))
    .sort((a,b) => reviewScore(b)-reviewScore(a) || b.reviews-a.reviews || b.rating-a.rating);
  const seen = new Set();
  const titles = new Set();
  const unique = sorted.filter(product => {
    const title = product.title?.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    const variant = title && product.retailer+'|'+title;
    if (seen.has(product.url) || (mixRetailers && variant && titles.has(variant))) return false;
    seen.add(product.url);
    if (variant) titles.add(variant);
    return true;
  });
  if (!mixRetailers) return unique.slice(0,limit);

  const queues = new Map();
  for (const product of unique) {
    if (!queues.has(product.retailer)) queues.set(product.retailer,{items:[],used:0});
    queues.get(product.retailer).items.push(product);
  }
  const picked = [];
  while (picked.length < limit && queues.size) {
    const available = [...queues.values()];
    const newStores = picked.length >= 2 && picked.length < 5 ? available.filter(store => !store.used) : [];
    const best = (newStores.length ? newStores : available).reduce((first,current) =>
      reviewScore(current.items[0])-.12*current.used > reviewScore(first.items[0])-.12*first.used ? current : first);
    const item = best.items.shift();
    picked.push(item);
    best.used++;
    if (!best.items.length) queues.delete(item.retailer);
  }
  return picked;
}
