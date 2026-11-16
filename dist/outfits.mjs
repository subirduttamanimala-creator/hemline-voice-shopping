// Public retailer listings and price snapshots. Check the seller for current stock and price.
const shop = {
  kurta: [
    ['Jompers embroidered kurta', 'NykaaMan', 1001, 'black', 'https://www.nykaaman.com/jompers-men-black-embroidered-kurta/p/24973330', 'https://images-static.nykaa.com/media/catalog/product/4/3/43b7c57KOO_5045Black_1.jpg?tr=w-500', 'embroidered'],
    ['Jompers embroidered long kurta', 'LimeRoad', 989, 'black', 'https://www.limeroad.com/vip/19453496', 'https://img0.junaroad.com/uiproducts/19453496/zoom_0-1709551327.jpg', 'embroidered'],
    ['Jompers embroidered straight kurta', 'NykaaMan', 1615, 'black', 'https://www.nykaaman.com/jompers-men-black-embroidered-straight-kurta/p/24199726', 'https://images-static.nykaa.com/media/catalog/product/9/1/9152399KO5137Black_1.jpg', 'embroidered']
  ],
  jeans: [
    ['Bene Kleed washed baggy jeans', 'Mintobay', 677, 'blue', 'https://mintobay.com/products/bomdt138zl53-666cj', 'https://mintobay.com/cdn/shop/files/3_49eaac38-ecf2-4da1-a35e-fe9987fd818a.jpg?v=1762252711', 'baggy'],
    ['Mid-wash baggy jeans', 'SHEIN India', 949, 'blue', 'https://www.sheinindia.in/shein-shein-baggy-fit-full-length-fly-with-button-closure-mid-wash-jeans/p/443384240_midblue', 'https://assets.sheinindia.in/medias/shein_sys_master/root1/20260312/TGBt/69b295c7af321a7f921ba85b/shein_mid_blue_shein_full_length_fly_with_button_closure_mid_wash_jeans.jpg', 'baggy'],
    ['Light-fade baggy jeans', 'Dennison', 1599, 'blue', 'https://dennison.in/products/light-fade-baggy-jeans', 'https://dennison.in/cdn/shop/files/AWJN-24-006.jpg?v=1781105537&width=500', 'baggy']
  ],
  shirt: [
    ['NETWORK linen shirt', 'AJIO', 1299, 'blue', 'https://www.ajio.com/network-linen-shirt-with-patch-pocket/p/440802287_blue', 'https://assets.ajio.com/medias/sys_master/root/h1d/h70/10862843658270/-473Wx593H-440802287-blue-MODEL.jpg', 'linen'],
    ['White slim-fit formal shirt', 'Peter England', 2224, 'white', 'https://peterengland.abfrl.in/p/men-white-slim-fit-formal-full-sleeves-formal-shirt-944852.html', 'https://imagescdn.peterengland.com/img/app/product/9/944852-12116635.jpg?auto=format&w=390', 'formal'],
    ['White regular-fit formal shirt', 'Peter England', null, 'white', 'https://peterengland.abfrl.in/p/men-white-genericfit-full-sleeves-formal-shirt-39945905.html', 'https://imagescdn.peterengland.com/img/app/product/3/39945905-19104271.jpg?auto=format&w=390', 'formal']
  ],
  trousers: [
    ['Slim-fit formal trousers', 'Peter England', 1067, 'black', 'https://peterengland.abfrl.in/p/men-black-solid-slim-fit-formal-trousers-350504.html', 'https://imagescdn.peterengland.com/img/app/product/3/350504-1722009.jpg?auto=format&w=390', 'formal'],
    ['Black solid formal trousers', 'Peter England', 1799, 'black', 'https://peterengland.abfrl.in/p/men-black-solid-genericfit-formal-trousers-39954478.html', 'https://imagescdn.peterengland.com/img/app/product/3/39954478-19300841.jpg?auto=format&w=390', 'formal'],
    ['Black slim-fit trousers', 'NykaaMan', 2299, 'black', 'https://www.nykaaman.com/peter-england-men-black-solid-slim-fit-formal-trousers/p/13196461', 'https://images-static.nykaa.com/media/catalog/product/4/8/4851c65PETFWNSPS85714_1.jpg?tr=w-500', 'formal']
  ],
  dress: [
    ['Janasya A-line midi dress', 'AJIO', null, 'black', 'https://www.ajio.com/janasya-women-self-design-a-line-dress/p/700768781_black', 'https://assets.ajio.com/medias/sys_master/root/20241117/bkK5/673a1ac50f47f80c878fcd25/-1117Wx1400H-700768781-black-MODEL.jpg', 'midi'],
    ['NoBarr fit-and-flare dress', 'AJIO', null, 'black', 'https://www.ajio.com/nobarr-women-crew-neck-fit--flare-dress/p/466695666_black', 'https://assets.ajio.com/medias/sys_master/root/20231011/wqKi/6525ac5dddf779151931e6aa/-473Wx593H-466695666-black-MODEL.jpg', 'midi']
  ]
};

export const garmentWords = /\b(kurtas?|kurtis?|jeans?|denims?|blazers?|jackets?|trousers?|pants?|dresses|dress|shirts?)\b/gi;
const categoryAliases = {
  kurta:'kurta', kurti:'kurta', jean:'jeans', denim:'jeans', blazer:'blazer',
  jacket:'blazer', trouser:'trousers', pant:'trousers', dress:'dress', dresses:'dress', shirt:'shirt'
};
const colors = /\b(black|white|blue|navy|cream|beige|green|olive|red|grey|gray)\b/g;
const colorAliases = {navy:'blue',beige:'cream',olive:'green',gray:'grey'};
const styles = /\b(embroidered|embroidery|baggy|linen|formal|midi)\b/g;

export function requestedPieces(query) {
  let from = 0;
  const pieces = [];
  for (const word of query.toLowerCase().matchAll(garmentWords)) {
    const category = categoryAliases[word[0]] ?? categoryAliases[word[0].replace(/s$/, '')];
    const prefix = query.slice(from,word.index).toLowerCase();
    from = word.index+word[0].length;
    if (!category || pieces.some(piece => piece.category === category)) continue;
    const color = [...prefix.matchAll(colors)].at(-1)?.[0];
    const style = [...prefix.matchAll(styles)].at(-1)?.[0];
    pieces.push({category,color:colorAliases[color] || color,style:style === 'embroidery' ? 'embroidered' : style});
  }
  return pieces;
}

const defaults = {
  kurta:{color:'black',style:'embroidered'},
  jeans:{color:'blue',style:'baggy'},
  shirt:{color:'white',style:'formal'},
  trousers:{color:'black',style:'formal'},
  dress:{color:'black',style:'midi'},
  blazer:{color:'blue'}
};

export function suggestOutfit(preferences, requested) {
  const {occasion, budget, color} = preferences;
  const chosen = requested.length ? requested : occasion === 'wedding'
    ? [{category:'kurta'},{category:'trousers'}]
    : occasion === 'party'
      ? [{category:'dress'}]
      : occasion === 'college' || occasion === 'summer'
        ? [{category:'shirt',color:'blue',style:'linen'},{category:'jeans'}]
        : [{category:'shirt'},{category:'trousers'}];

  const pieces = chosen.map((piece,index) => {
    const {category} = piece;
    const style = piece.style ?? defaults[category].style;
    const desiredColor = piece.color ?? (index === 0 ? color : undefined) ?? defaults[category].color;
    const listings = (shop[category] ?? []).filter(row => row[3] === desiredColor && (!style || row[6] === style));
    return {
      category, color:desiredColor, style,
      label:[desiredColor,style,category].filter(Boolean).join(' '),
      listings:listings.map(([title,store,price,,url,image]) => ({title,store,price,url,image}))
        .sort((a,b) => (a.price ?? Infinity)-(b.price ?? Infinity))
    };
  });

  const minimums = pieces.map(piece => piece.listings.find(item => item.price !== null)?.price);
  const minimumTotal = minimums.every(price => price !== undefined) ? minimums.reduce((total,price) => total+price,0) : null;
  for (const [i,piece] of pieces.entries()) {
    const otherMinimums = minimums.filter((_,j) => i !== j);
    const remaining = budget === undefined || otherMinimums.some(price => price === undefined)
      ? budget : Math.max(0,budget-otherMinimums.reduce((total,price) => total+price,0));
    piece.searchBudget = remaining;
    piece.listings = piece.listings.map(item => ({
      ...item, fitsBudget:remaining === undefined || item.price === null ? null : item.price <= remaining
    }));
  }
  return {pieces,minimumTotal,budget};
}

export function shoppingLinks(piece, size) {
  const phrase = [piece.label,size && 'size '+size].filter(Boolean).join(' ');
  const budgetPhrase = piece.searchBudget > 0 ? phrase+' under ₹'+piece.searchBudget : phrase;
  return [
    ['Google Shopping','https://www.google.com/search?udm=28&gl=in&q='+encodeURIComponent(budgetPhrase)],
    ['Amazon','https://www.amazon.in/s?k='+encodeURIComponent(phrase)],
    ['Flipkart','https://www.flipkart.com/search?q='+encodeURIComponent(phrase)],
    ['Myntra','https://www.myntra.com/'+encodeURIComponent(piece.label.replaceAll(' ','-'))],
    ['Meesho','https://www.meesho.com/search?q='+encodeURIComponent(phrase)]
  ];
}
