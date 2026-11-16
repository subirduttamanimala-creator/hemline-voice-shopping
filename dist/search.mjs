const colors = /\b(black|navy(?: blue)?|light blue|dark blue|blue|white|off[- ]white|ivory|cream|beige|tan|brown|grey|gray|charcoal|olive|green|emerald|red|maroon|burgundy|pink|purple|lavender|yellow|orange|teal|gold|silver)\b/gi;
const garments = /\b(three[- ]piece suits?|two[- ]piece suits?|salwar suits?|trouser suits?|pant suits?|pantsuits?|suits?|tuxedos?|blazers?|sherwanis?|lehengas?|sarees?|saris?|kurtis?|kurtas?|dresses|dress|(?:baggy |wide[- ]leg |straight[- ]leg )?jeans|trousers|pants|chinos|t[- ]shirts?|shirts?|tops?|sweaters?|cardigans?|jackets?|coats?|skirts?|jumpsuits?|co[- ]ord sets?|shoes?|sneakers?|loafers?|sandals?|outfits?)\b/gi;
const qualities = /\b(embroidered|sequinned|linen|wool|cotton|silk|velvet|oversized|slim[- ]fit|relaxed[- ]fit|midi|maxi|formal|casual|printed|solid)\b/gi;
const occasions = /\b(wedding(?: reception)?|reception|engagement|sangeet|haldi|mehendi|interview|office|work(?: meeting)?|business meeting|college|school|farewell|prom|graduation|birthday(?: party)?|cocktail(?: party)?|dinner|party|festival|diwali|eid|durga puja|puja|brunch|beach|vacation|date(?: night)?|conference|funeral|everyday(?: wear)?|gym|summer)\b/gi;

const numbers = {zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
const magnitude = {hundred:100,thousand:1000,lakh:100000,lac:100000};

function spokenNumber(words) {
  let total = 0;
  let group = 0;
  for (const word of words.split(/[\s-]+/)) {
    if (word in numbers) group += numbers[word];
    else if (word === 'hundred') group = Math.max(1,group)*100;
    else if (word in magnitude) {
      total += Math.max(1,group)*magnitude[word];
      group = 0;
    }
  }
  return total+group;
}

const wordPattern = [...Object.keys(numbers),...Object.keys(magnitude)].join('|');
const amount = '(\\d[\\d,]*(?:\\.\\d+)?\\s*(?:k\\b|thousand\\b|lakh\\b)?|(?:'+wordPattern+')\\b(?:[- ]+(?:(?:'+wordPattern+')\\b|and\\b(?=\\s+(?:'+wordPattern+')\\b)))*)';
const budgetBefore = new RegExp('(?:₹|\\b(?:rs\\.?|inr|rupees|under|below|within|up to|at most|less than|around|maximum|budget(?:\\s+(?:of|is|to))?)\\s*)\\s*(?:₹|rs\\.?\\s*|inr\\s*|rupees\\s*)?'+amount,'i');
const budgetAfter = new RegExp(amount+'\\s*(?:rupees|inr)\\b','i');

function readAmount(value) {
  if (!value) return undefined;
  if (!/^\d/.test(value)) return spokenNumber(value);
  const number = Number.parseFloat(value.replaceAll(',',''));
  if (/lakh/.test(value)) return number*100000;
  if (/(?:k|thousand)/.test(value)) return number*1000;
  return number;
}

function matches(value,pattern) {
  return [...value.matchAll(pattern)];
}

export function readRequest(request) {
  const text = request.toLowerCase().replace(/[–—]/g,'-').trim();
  const garmentMatches = matches(text,garments);
  const garmentsFound = [...new Set(garmentMatches.map(match => match[0]))];
  const colorsFound = [...new Set(matches(text,colors).map(match => match[0]))];
  const qualitiesFound = [...new Set(matches(text,qualities).map(match => match[0]))];
  const occasion = matches(text,occasions).at(-1)?.[0] ??
    text.match(/\b(?:for (?:my|a|an|the)|attending (?:a|an|the))\s+([a-z][a-z -]{1,50}?)(?=\s+(?:with|under|below|budget|in size|and i)\b|[,.!?]|$)/)?.[1]?.trim();
  const budget = readAmount((text.match(budgetBefore) ?? text.match(budgetAfter))?.[1]?.trim());
  const size = text.match(/\b(?:size|waist)\s*(?:is\s+)?(extra[- ]extra[- ]large|extra[- ]small|extra[- ]large|xxxl|xxl|xl|xs|small|medium|large|s|m|l|\d{1,3})\b/)?.[1];
  const spokenSize = text.match(new RegExp('\\b(?:size|waist)\\s*(?:is\\s+)?'+amount,'i'))?.[1];
  const numericSize = readAmount(spokenSize);
  const audience = text.match(/\b(women|women's|womens|men|men's|mens|girls|boys|unisex)\b/)?.[1]?.replace(/'s$|(?<=men)s$/,'');
  const adjective = qualitiesFound.length && (garmentMatches.length === 1 || !garmentMatches.length) ? qualitiesFound.join(' ') : '';
  const outfits = garmentMatches.length > 1
    ? garmentMatches.map((match,index) => {
      const previous = garmentMatches[index-1];
      const prefix = text.slice(previous ? previous.index+previous[0].length : 0,match.index);
      const color = matches(prefix,colors).at(-1)?.[0];
      const quality = matches(prefix,qualities).at(-1)?.[0];
      return [color,quality,match[0]].filter(Boolean).join(' ');
    })
    : null;
  return {
    occasion, garment:outfits ? outfits.join(' + ') : garmentsFound.length ? [adjective,...garmentsFound].filter(Boolean).join(' ') : undefined,
    color:outfits ? '' : colorsFound.length ? colorsFound.join(' ') : undefined,
    size:size?.replace(/-/g,' ') ?? (numericSize > 0 && numericSize <= 100 ? String(numericSize) : undefined),
    budget: Number.isFinite(budget) && budget > 0 ? Math.round(budget) : undefined, audience
  };
}

export function searchTerms(fields) {
  return fields.garment.split(/\s*\+\s*/).filter(Boolean).slice(0,4).map(item => {
    const fieldsForTerm = [fields.audience,fields.color,item,fields.occasion,fields.size && 'size '+fields.size];
    return fieldsForTerm.filter(Boolean).join(' ').trim().slice(0,180);
  });
}

export function retailerSearches(query, range) {
  const term = encodeURIComponent(query);
  const google = new URL('https://www.google.com/search');
  google.search = new URLSearchParams({udm:'28',gl:'in',hl:'en',q:query+(range ? ' ₹'+range.min+' to ₹'+range.max : '')});
  return [
    {name:'Google Shopping',initial:'G',url:google.href},
    {name:'Amazon India',initial:'a',url:'https://www.amazon.in/s?k='+term},
    {name:'Flipkart',initial:'F',url:'https://www.flipkart.com/search?q='+term},
    {name:'Myntra',initial:'M',url:'https://www.myntra.com/'+encodeURIComponent(query.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''))+'?rawQuery='+term},
    {name:'Meesho',initial:'m',url:'https://www.meesho.com/search?q='+term},
    {name:'AJIO',initial:'A',url:'https://www.ajio.com/search/?text='+term}
  ];
}
