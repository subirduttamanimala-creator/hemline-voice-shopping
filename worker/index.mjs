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
  const number = typeof value === 'string' && /^[\d,.]+$/.test(value) ? Number(value.replaceAll(',','')) : value;
  return Number.isFinite(number) && number >= 0 ? number : undefined;
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

async function liveProducts(query, range, key) {
  const signal = AbortSignal.timeout(15000);
  const parameters = {engine:'google_shopping',q:query,gl:'in',hl:'en',google_domain:'google.co.in'};
  if (range) Object.assign(parameters,{min_price:String(range.min),max_price:String(range.max)});
  const response = await providerSearch(parameters,key,signal);
  if (response.error) throw new Error('Shopping provider returned an error');
  const results = Array.isArray(response.shopping_results) ? response.shopping_results : [];
  const direct = results.map(item => makeCard(item)).filter(Boolean);
  const reviewed = rankProducts(direct,range);
  const unresolved = results.filter(item => !makeCard(item) && item.immersive_product_page_token)
    .map(item => ({...item,url:item.immersive_product_page_token,rating:positiveNumber(item.rating),reviews:positiveNumber(item.reviews)}));
  // Prioritize well-reviewed records before spending lookups on their retailer offers.
  const selected = rankProducts(unresolved,null,Math.min(25,Math.max(8,resultLimit-reviewed.length)));
  const offers = await Promise.allSettled(selected.map(async item => {
    const data = await providerSearch({engine:'google_immersive_product',page_token:item.immersive_product_page_token},key,signal);
    const stores = data.product_results?.stores ?? [];
    return stores.map(store => makeCard(item,store)).filter(Boolean);
  }));
  return rankProducts([...direct,...offers.flatMap(result => result.status === 'fulfilled' ? result.value : [])],range);
}

async function products(url, env) {
  const query = (url.searchParams.get('q') ?? '').trim().replace(/\s+/g,' ');
  if (!query || query.length > 180) return Response.json({products:[]},{status:400});
  const size = (url.searchParams.get('size') ?? query.match(/\bsize\s+([\w -]+)$/i)?.[1] ?? '').trim().slice(0,20);
  const requestedBudget = Number(url.searchParams.get('budget'));
  const pieceCount = Number(url.searchParams.get('pieces'));
  const range = priceWindow(requestedBudget,Number.isInteger(pieceCount) && pieceCount >= 1 && pieceCount <= 4 ? pieceCount : 1);
  try {
    const [direct, provider] = await Promise.all([
      directProducts(query,size,range),
      env.SERPAPI_API_KEY ? liveProducts(query,range,env.SERPAPI_API_KEY).catch(() => null) : null
    ]);
    if (!direct.available && !provider) return Response.json({products:[],status:'unavailable'},{status:502});
    const results = rankProducts([...direct.cards,...(provider ?? [])],range);
    return Response.json({products:results,status:'ok'},{headers:{'cache-control':'public, max-age=300'}});
  } catch {
    return Response.json({products:[]},{status:502});
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed',{status:405});
    if (url.pathname === '/api/products' && request.method === 'GET') return products(url,env);
    const path = url.pathname === '/index.html' ? '/' : url.pathname;
    const asset = Object.hasOwn(assets,path) ? assets[path] : undefined;
    if (!asset) return new Response('Not found',{status:404});
    const body = request.method === 'HEAD' ? null : asset.binary ? Uint8Array.from(atob(asset.content),char => char.charCodeAt(0)) : asset.content;
    return new Response(body,{headers:{'content-type':asset.type+(asset.binary ? '' : '; charset=utf-8'),'x-content-type-options':'nosniff'}});
  }
};
