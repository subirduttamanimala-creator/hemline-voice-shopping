const sizes = ['XS','S','M','L','XL','XXL'];
const palettes = {cream:'#e8dbbf',black:'#555661',blue:'#a6b3d4',green:'#b3bd9e',red:'#c98a83',white:'#e7e5df'};
const stock = [
  ['studio-shirt','Studio Oxford',1290,'shirt','white',['interview','college'],[1,2,3,4],'breathable cotton with a clean collar'],
  ['metro-blazer','Metro Blazer',1890,'blazer','black',['interview','party'],[0,1,2,3],'structured tailoring for a polished look'],
  ['column-trouser','Column Trousers',1490,'trousers','black',['interview','college'],[1,2,3,4,5],'straight-leg fit with a pressed crease'],
  ['coast-shirt','Coast Linen Shirt',1190,'shirt','blue',['college','summer'],[0,1,2,3,4],'airy linen blend for warm days'],
  ['terrace-dress','Terrace Midi Dress',2190,'dress','green',['wedding','summer','party'],[0,1,2,3,4],'flowing midi cut for daytime events'],
  ['night-dress','Nightfall Dress',1790,'dress','black',['party','wedding'],[1,2,3,4],'streamlined midi cut for evening plans'],
  ['gulmohar-kurta','Gulmohar Kurta',1690,'kurta','red',['wedding','party'],[1,2,3,4,5],'festive colour with a relaxed straight cut'],
  ['courtyard-kurta','Courtyard Kurta',1390,'kurta','cream',['wedding','summer','college'],[0,1,2,3,4],'lightweight cotton with a subtle woven texture'],
  ['weekend-trouser','Weekend Trousers',990,'trousers','green',['college','summer'],[1,2,3,4,5],'relaxed fit and an adjustable waist'],
  ['sky-blazer','Skyline Blazer',2390,'blazer','blue',['interview','wedding','party'],[1,2,3,4],'soft tailoring with an easy drape'],
  ['cloud-shirt','Cloud Poplin Shirt',890,'shirt','cream',['interview','college','summer'],[0,1,2,3,4,5],'light cotton poplin with a classic cut'],
  ['ember-dress','Ember Wrap Dress',2490,'dress','red',['wedding','party'],[1,2,3,4],'adjustable waist and a draped wrap front']
];
export const catalogue = stock.map(([id,name,price,category,color,occasions,available,detail]) =>
  ({id,name,price,category,color,occasions,sizes:available.map(i => sizes[i]),detail,swatch:palettes[color]}));
export const rupees = value => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(value);

const vocabulary = {
  occasion:{interview:/\b(interviews?|office|formal|work)\b/,college:/\b(college|campus|casual|everyday)\b/,wedding:/\b(weddings?|reception|festive)\b/,party:/\b(part(y|ies)|dinner|evening)\b/,summer:/\b(summer|beach|hot weather)\b/},
  category:{shirt:/\bshirts?\b/,blazer:/\b(blazers?|jackets?)\b/,trousers:/\b(trousers|pants)\b/,dress:/\bdress(es)?\b/,kurta:/\bkurtas?\b/},
  color:{cream:/\b(cream|beige|ivory)\b/,black:/\bblack\b/,blue:/\b(blue|navy)\b/,green:/\b(green|olive)\b/,red:/\bred\b/,white:/\bwhite\b/}
};
export function interpret(message, previous = {}) {
  const query = message.toLowerCase().trim();
  if (/^(start over|reset|show (me )?all)[.!]?$/.test(query)) return {preferences:{}, understood:true};
  const preferences = {...previous};
  let understood = false;
  for (const [key, words] of Object.entries(vocabulary)) {
    const found = Object.entries(words).map(([value, pattern]) => [value, query.search(pattern)])
      .filter(([,position]) => position >= 0).sort((a,b) => b[1]-a[1])[0];
    const label = key === 'color' ? 'colou?r' : key;
    if (new RegExp('\\bany ' + label + '\\b').test(query)) {
      delete preferences[key];
      understood = true;
    } else if (found) {
      preferences[key] = found[0];
      understood = true;
    }
  }
  const size = query.match(/\bsize\s+(xxl|xl|xs|s|m|l|extra small|small|medium|large|extra large)\b/);
  if (/\bany size\b/.test(query)) {
    delete preferences.size;
    understood = true;
  } else if (size) {
    const names = {'extra small':'XS',small:'S',medium:'M',large:'L','extra large':'XL'};
    preferences.size = names[size[1]] || size[1].toUpperCase();
    understood = true;
  }
  const budget = query.match(/(?:\b(?:under|below|up to|at most|max(?:imum)?|budget(?: of| is| to)?)\s*[:=]?\s*(?:₹|rs\.?|inr|rupees)?\s*|(?:₹|\brs\.?|\binr)\s*)(\d[\d,]*(?:\.\d+)?)(?:\s*(k|thousand)\b)?/);
  if (/\b(no budget|any price)\b/.test(query)) {
    delete preferences.budget;
    understood = true;
  } else if (budget) {
    preferences.budget = Number(budget[1].replaceAll(',','')) * (budget[2] ? 1000 : 1);
    understood = true;
  }
  return {preferences, understood};
}

export function match(preferences) {
  const {budget, size, color, category, occasion} = preferences;
  const results = catalogue.filter(item =>
    (budget === undefined || item.price <= budget) &&
    (!size || item.sizes.includes(size)) &&
    (!color || item.color === color) &&
    (!category || item.category === category) &&
    (!occasion || item.occasions.includes(occasion)));
  return Object.keys(preferences).length ? results.sort((a,b) => a.price-b.price) : results;
}

export function filters(preferences) {
  const {budget,size,color,category,occasion} = preferences;
  return [occasion, category, color, size && 'Size '+size, budget === undefined ? null : 'Up to '+rupees(budget)].filter(Boolean);
}
