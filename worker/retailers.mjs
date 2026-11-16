function embeddedState(html,name) {
  const marker = new RegExp('window\\.'+name+'\\s*=\\s*','g');
  const match = marker.exec(html);
  if (!match) return undefined;
  const end = html.indexOf('</script>',marker.lastIndex);
  if (end < 0) return undefined;
  try {
    return JSON.parse(html.slice(marker.lastIndex,end).trim().replace(/;$/,''));
  } catch {
    return undefined;
  }
}

function structuredProducts(html) {
  const products = [];
  for (const script of html.matchAll(/<script[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(script[1]);
      for (const item of [data].flat().flatMap(value => value?.['@graph'] ?? value ?? [])) {
        if ([item?.['@type']].flat().includes('Product')) products.push(item);
      }
    } catch {}
  }
  return products;
}

async function retailerPage(url, signal) {
  const response = await fetch(url,{signal,headers:{Accept:'text/html'},redirect:'error'});
  if (!response.ok) return '';
  return response.text();
}

function sizeKey(value) {
  return String(value ?? '').toLowerCase().trim().replace(/\s+/g,' ')
    .replace(/^extra extra large$/,'xxl').replace(/^extra large$/,'xl')
    .replace(/^extra small$/,'xs').replace(/^medium$/,'m').replace(/^small$/,'s')
    .replace(/^large$/,'l').replace(/^2xl$/,'xxl');
}

function sizeStatus(wanted, labels, knownSize) {
  if (!wanted) return undefined;
  const key = sizeKey(wanted);
  const normalized = labels.flatMap(label => String(label ?? '').split(/[(),]/)).map(sizeKey).filter(Boolean);
  if (normalized.includes(key)) return 'matched';
  const comparable = normalized.some(label => /^\d+$/.test(label) === /^\d+$/.test(key));
  return knownSize && comparable ? 'different' : 'check';
}

function shopImage(value) {
  return typeof value === 'string' ? httpsUrl(value.replace(/^http:/,'https:'))?.href : undefined;
}

function matchesGarment(term, title, category = '') {
  const description = title+' '+category;
  if (/\bkurta\b/i.test(term)) return /\bkurtas?\b/i.test(description);
  if (/\bsalwar suits?\b/i.test(term)) return /\b(?:salwar|suit set|kurta set)\b/i.test(description);
  if (/\bsuits?\b/i.test(term)) return /\b(?:suits?|tuxedos?)\b/i.test(description) && !/\bsuit (?:cover|bag|hanger)\b/i.test(description);
  if (/\boutfits?\b/i.test(term)) return /\b(?:kurta|suit|sherwani|blazer|dress|shirt|trousers|pants|lehenga|saree|sari|jumpsuit|skirt|co[- ]ord|tuxedo|pyjama|apparel)s?\b/i.test(description);
  return true;
}

function snapshotProducts(query, size, range) {
  const term = query.toLowerCase().replace(/\s+size\s+[\w -]+$/i,'').trim();
  const category = term.match(/\b(sherwani|lehenga|saree|sari|kurti|kurta|suit|blazer|jeans|trousers|pants|shirt|dress(?:es)?)s?\b/)?.[1];
  const normalizedCategory = {kurti:'kurta',sari:'saree',pants:'trousers',dresses:'dress'}[category] ?? category;
  const occasion = term.match(/\b(wedding|reception|engagement|sangeet|haldi|mehendi|party|interview|office|work|college|formal|casual)\b/)?.[1];
  const wedding = /wedding|reception|engagement|sangeet|haldi|mehendi/.test(occasion ?? '');
  const audience = term.match(/\b(men|women|boys|girls|unisex)\b/)?.[1];
  const color = term.match(/\b(navy(?: blue)?|black|white|off-white|cream|ivory|blue|charcoal|grey|gray|beige|brown|olive|green|maroon|burgundy|red|pink|purple|yellow|orange|teal|silver|gold)\b/)?.[1];
  const matches = snapshot.products.flatMap(item => {
    const title = item.title.toLowerCase();
    if (normalizedCategory && item.category !== normalizedCategory) return [];
    if (!normalizedCategory && (!wedding || !item.occasions.includes('wedding'))) return [];
    if (wedding && !item.occasions.includes('wedding')) return [];
    if (audience && audience !== 'unisex' && !new RegExp('\\b'+audience+'\\b','i').test(title+' '+(item.audience ?? ''))) return [];
    if (color && !new RegExp('\\b'+(color === 'navy blue' ? 'navy' : color === 'grey' || color === 'gray' ? 'gr[ae]y' : color)+'\\b','i').test(title+' '+(item.colour ?? ''))) return [];
    if (/\bbaggy\b/.test(term) && !/\b(?:baggy|loose fit|wide leg)\b/.test(title)) return [];
    if (/\bembroidered\b/.test(term) && !/\bembroider/.test(title)) return [];
    if (!matchesGarment(term,title)) return [];
    const garmentName = normalizedCategory === 'saree' ? 'saree|sari' : normalizedCategory === 'trousers' ? 'trousers|pants|chinos' :
      normalizedCategory === 'dress' ? 'dress(?:es)?' : normalizedCategory;
    if (garmentName && !new RegExp('\\b(?:'+garmentName+')s?\\b','i').test(title)) return [];
    const status = sizeStatus(size,item.sizes ?? [],item.retailer === 'Flipkart' || !/^\d+$/.test(size));
    if (status === 'different') return [];
    return [{...item,sizeStatus:status,snapshotDate:snapshot.asOf}];
  });
  return matches;
}

function myntraListings(html, size, term) {
  const results = embeddedState(html,'__myx')?.searchData?.results;
  if (!Array.isArray(results?.products)) return undefined;
  return results.products.flatMap(item => {
    if (!item.landingPageUrl || !item.productName || !matchesGarment(term,item.productName,item.category)) return [];
    if (/\boutfits?\b/i.test(term) && item.masterCategory?.typeName !== 'Apparel') return [];
    const target = productUrl(new URL(item.landingPageUrl,'https://www.myntra.com/').href);
    if (!target || target.retailer !== 'Myntra') return [];
    const stock = (item.inventoryInfo ?? []).filter(entry => entry.available && entry.inventory !== 0);
    const labels = stock.flatMap(entry => [entry.label,entry.brandSizeLabel]);
    const listed = String(item.sizes ?? '').split(',');
    // The page can expose one available SKU alongside a longer list of size labels.
    const knownSize = !/^\d+$/.test(size) && listed.some(Boolean);
    const status = sizeStatus(size,[...labels,...listed],knownSize);
    if (status === 'different') return [];
    return [{
      ...target,title:item.productName,price:positiveNumber(item.price),rating:positiveNumber(item.rating),
      reviews:positiveNumber(item.ratingCount),image:shopImage(item.searchImage),sizeStatus:status,
      sizes:[...new Set([...labels,...listed].filter(Boolean))],colour:item.primaryColour,audience:item.gender
    }];
  });
}

function flipkartCandidates(html, size, range) {
  const state = embeddedState(html,'__INITIAL_STATE__');
  const widgets = state?.pageDataV4?.page?.data;
  if (!widgets) return undefined;
  const list = Object.values(widgets).flat();
  const items = new Map();
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    const product = node.productInfo?.value;
    if (product?.baseUrl && product.buyability?.intent === 'positive') {
      const label = product.titles?.coSubtitle?.match(/^Size:\s*(.+)/i)?.[1];
      const status = sizeStatus(size,[label],Boolean(label));
      const price = product.pricing?.prices?.find(price => !price.strikeOff && price.currency === 'INR')?.value;
      const target = productUrl(new URL(product.baseUrl,'https://www.flipkart.com/').href);
      if (target?.retailer === 'Flipkart' && status !== 'different' && (!range || (price >= range.min && price <= range.max))) {
        const url = new URL(product.baseUrl,'https://www.flipkart.com/');
        const pid = url.searchParams.get('pid');
        if (pid && /^[A-Z0-9]+$/i.test(pid)) target.url += '?pid='+encodeURIComponent(pid);
        items.set(target.url,{...target,price,sizeStatus:status,sizes:label ? [label] : []});
      }
    }
    for (const child of Object.values(node)) visit(child);
  }
  visit(list);
  return [...items.values()];
}

function flipkartCard(html, candidate, size, term) {
  const item = structuredProducts(html).find(entry => entry.aggregateRating);
  const offer = [item?.offers].flat().find(entry => entry?.priceCurrency === 'INR');
  if (!item?.name || !offer || !matchesGarment(term,item.name,item.category) || /OutOfStock|Discontinued/i.test(offer.availability ?? '')) return undefined;
  const status = sizeStatus(size,[item.size],Boolean(item.size)) ?? candidate.sizeStatus;
  if (status === 'different') return undefined;
  return {
    ...candidate,title:item.name,price:positiveNumber(offer.price),rating:positiveNumber(item.aggregateRating.ratingValue),
    reviews:positiveNumber(item.aggregateRating.ratingCount ?? item.aggregateRating.reviewCount),image:shopImage([item.image].flat()[0]),
    sizeStatus:status === 'check' && candidate.sizeStatus === 'matched' ? 'matched' : status,
    sizes:item.size ? [...candidate.sizes,item.size] : candidate.sizes,colour:item.color
  };
}

async function directProducts(query, size, range) {
  const signal = AbortSignal.timeout(13000);
  const term = query.replace(/\s+size\s+[\w -]+$/i,'').trim() || query;
  const alternate = term.replace(/\bwedding reception\b/i,'wedding').replace(/\bkurta\b(?!\s+set)/i,'kurta set');
  async function myntra(searchTerm, page, sort) {
    const slug = searchTerm.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    if (!slug) return [];
    const url = new URL('/'+slug,'https://www.myntra.com');
    url.searchParams.set('rawQuery',searchTerm);
    if (sort) url.searchParams.set('sort',sort);
    if (page > 1) url.searchParams.set('p',String(page));
    if (range) url.searchParams.set('rf','Price:'+range.min+'.0_'+range.max+'.0_'+range.min+'.0 TO '+range.max+'.0');
    return myntraListings(await retailerPage(url,signal),size,term);
  }
  async function flipkart() {
    const url = new URL('/search','https://www.flipkart.com');
    url.searchParams.set('q',term);
    if (range) {
      url.searchParams.append('p[]','facets.price_range.from='+range.min);
      url.searchParams.append('p[]','facets.price_range.to='+range.max);
    }
    const candidates = flipkartCandidates(await retailerPage(url,signal),size,range);
    if (!candidates) return undefined;
    candidates.sort((a,b) => Number(b.sizeStatus === 'matched')-Number(a.sizeStatus === 'matched'));
    const cards = await Promise.allSettled(candidates.slice(0,16).map(async item => flipkartCard(await retailerPage(item.url,signal),item,size,term)));
    return cards.flatMap(card => card.status === 'fulfilled' && card.value ? [card.value] : []);
  }
  const searches = [myntra(term,1,'Customer Rating'),myntra(term,1,'popularity'),myntra(term,2,''),flipkart()];
  if (alternate !== term) searches.push(myntra(alternate,1,'Customer Rating'),myntra(alternate,2,''));
  const results = await Promise.allSettled(searches);
  const succeeded = results.flatMap(result => result.status === 'fulfilled' && Array.isArray(result.value) ? [result.value] : []);
  return {cards:succeeded.flat(),available:Boolean(succeeded.length)};
}
