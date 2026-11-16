const retailerRules = {
  'amazon.in': ['Amazon India', /\/(?:dp|gp\/product)\/[A-Z0-9]{10}(?:\/|$)/i],
  'flipkart.com': ['Flipkart', /\/p\//],
  'myntra.com': ['Myntra', /\/\d+\/buy\/?$/],
  'meesho.com': ['Meesho', /\/p\/[a-z0-9]+/i],
  'ajio.com': ['AJIO', /\/p\//],
  'nykaafashion.com': ['Nykaa Fashion', /\/p\/\d+/],
  'tatacliq.com': ['Tata CLiQ', /\/p-/]
};

function httpsUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) return url;
  } catch {
    return undefined;
  }
}

function productUrl(value) {
  const url = httpsUrl(value);
  if (!url) return undefined;
  if (/^(?:www\.)?google\.com$/.test(url.hostname) && url.pathname === '/url') {
    const target = url.searchParams.get('q') ?? url.searchParams.get('url');
    if (target && target !== value) {
      const nested = httpsUrl(target);
      if (nested && !/google\.com$/.test(nested.hostname)) return productUrl(target);
    }
  }
  const rule = retailerRules[url.hostname.replace(/^www\.|^m\./,'')];
  if (!rule || !rule[1].test(url.pathname)) return undefined;
  return {url:url.origin+url.pathname,retailer:rule[0]};
}

function positiveNumber(value) {
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function rupeePrice(value) {
  const text = String(value ?? '');
  const price = text.match(/(?:₹|\bINR\b|\bRs\.?)\s*([\d,]+(?:\.\d+)?)/i);
  return price ? positiveNumber(Number(price[1].replaceAll(',',''))) : undefined;
}

function makeCard(result, offer = result) {
  const target = productUrl(offer.link) ?? productUrl(offer.product_link);
  const title = String(result.title ?? '').trim().slice(0,220);
  if (!target || !title) return undefined;
  return {
    ...target,title,price:rupeePrice(offer.price),
    image:httpsUrl(result.thumbnail ?? result.thumbnails?.[0])?.href,
    rating:positiveNumber(result.rating),reviews:positiveNumber(result.reviews)
  };
}

async function providerSearch(parameters, key, signal) {
  const url = new URL('https://serpapi.com/search.json');
  url.search = new URLSearchParams({...parameters,api_key:key});
  const response = await fetch(url,{signal});
  if (!response.ok) throw new Error('Shopping provider unavailable');
  return response.json();
}

async function liveProducts(query, budget, key) {
  const signal = AbortSignal.timeout(8500);
  const response = await providerSearch({engine:'google_shopping',q:query,gl:'in',hl:'en',google_domain:'google.co.in'},key,signal);
  const results = Array.isArray(response.shopping_results) ? response.shopping_results.slice(0,16) : [];
  const direct = results.map(item => makeCard(item)).filter(Boolean);
  const unresolved = results.filter(item => !makeCard(item) && item.immersive_product_page_token);
  const selected = direct.length < 6 ? unresolved.slice(0,3) : [];
  const offers = await Promise.allSettled(selected.map(async item => {
    const data = await providerSearch({engine:'google_immersive_product',page_token:item.immersive_product_page_token},key,signal);
    const stores = data.product_results?.stores ?? [];
    return stores.map(store => makeCard(item,store)).filter(Boolean);
  }));
  const cards = [...direct,...offers.flatMap(result => result.status === 'fulfilled' ? result.value : [])];
  const seen = new Set();
  const unique = cards.filter(card => {
    if (seen.has(card.url)) return false;
    seen.add(card.url);
    return true;
  });
  if (budget > 0) {
    const rank = card => card.price === undefined ? 1 : card.price <= budget ? 0 : 2;
    unique.sort((a,b) => rank(a)-rank(b));
  }
  return unique.slice(0,12);
}

async function products(request, url, env, context) {
  const query = (url.searchParams.get('q') ?? '').trim().replace(/\s+/g,' ');
  if (!query || query.length > 180) return Response.json({products:[]},{status:400});
  if (!env.SERPAPI_API_KEY) return Response.json({products:[]});
  const requestedBudget = Number(url.searchParams.get('budget'));
  const budget = Number.isFinite(requestedBudget) && requestedBudget > 0 && requestedBudget <= 10000000 ? requestedBudget : 0;
  const cacheUrl = new URL('/api/products',url.origin);
  cacheUrl.search = new URLSearchParams({q:query.toLowerCase(),budget:String(budget)});
  const cacheKey = new Request(cacheUrl);
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;
  try {
    const results = await liveProducts(query,budget,env.SERPAPI_API_KEY);
    const response = Response.json({products:results},{headers:{'cache-control':'public, max-age=600'}});
    context.waitUntil(caches.default.put(cacheKey,response.clone()).catch(() => {}));
    return response;
  } catch {
    return Response.json({products:[]},{status:502});
  }
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed',{status:405});
    if (url.pathname === '/api/products' && request.method === 'GET') return products(request,url,env,context);
    const path = url.pathname === '/index.html' ? '/' : url.pathname;
    const asset = Object.hasOwn(assets,path) ? assets[path] : undefined;
    if (!asset) return new Response('Not found',{status:404});
    const body = request.method === 'HEAD' ? null : asset.binary ? Uint8Array.from(atob(asset.content),char => char.charCodeAt(0)) : asset.content;
    return new Response(body,{headers:{'content-type':asset.type+(asset.binary ? '' : '; charset=utf-8'),'x-content-type-options':'nosniff'}});
  }
};
