import {catalogue, filters, interpret, match, rupees} from './matcher.mjs';
import {requestedPieces, shoppingLinks, suggestOutfit} from './outfits.mjs';

const byId = id => document.getElementById(id);
const promptField = byId('prompt');
const conversation = byId('conversation');
const speechStatus = byId('speech-status');
const mic = byId('mic');
const talk = byId('talk');
const bagDialog = byId('bag');
const bag = new Map();
let preferences = {};
let pieces = [];
let recognition;

function element(tag, content, className) {
  const node = document.createElement(tag);
  if (content) node.textContent = content;
  if (className) node.className = className;
  return node;
}

function message(text, speaker = 'stylist') {
  conversation.append(element('p', text, 'bubble '+speaker));
  conversation.scrollTop = conversation.scrollHeight;
  if (speaker === 'stylist') speak(text);
}

function speak(text) {
  if (talk.checked && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const reply = new SpeechSynthesisUtterance(text.replace(/₹/g,' rupees '));
    reply.lang = 'en-IN';
    window.speechSynthesis.speak(reply);
  }
}

function render(results) {
  byId('count').textContent = results.length+' '+(results.length === 1 ? 'piece' : 'pieces');
  byId('filters').replaceChildren(...filters(preferences).map(text => element('span',text)));
  byId('products').replaceChildren(...results.map(item => {
    const card = element('article',null,'product');
    const sample = element('img');
    sample.src = './catalogue/'+item.id+'.jpg';
    sample.alt = item.color+' '+item.category+' mockup';
    sample.loading = 'lazy';
    sample.style.setProperty('--swatch',item.swatch);
    sample.addEventListener('error', () => {
      const swatch = element('div',item.color+' '+item.category,'product-swatch');
      swatch.style.background = item.swatch;
      sample.replaceWith(swatch);
    });
    const info = element('div',null,'product-info');
    info.append(element('h3',item.name),element('strong',rupees(item.price)),
      element('p',item.detail+'.'));
    if (Object.keys(preferences).length) {
      const fit = [preferences.occasion && 'For '+preferences.occasion, preferences.size && 'Size '+preferences.size+' in stock', preferences.budget !== undefined && 'Within budget'].filter(Boolean);
      if (fit.length) info.append(element('p',fit.join(' · ')));
    }
    const options = element('div',null,'buy');
    const size = element('select');
    size.setAttribute('aria-label','Size for '+item.name);
    for (const value of preferences.size ? [preferences.size] : item.sizes) {
      size.append(new Option(value,value));
    }
    const add = element('button','Add to bag');
    add.setAttribute('aria-label','Add '+item.name+' to bag');
    add.addEventListener('click', () => {
      const key = item.id+'-'+size.value;
      const existing = bag.get(key);
      bag.set(key,{item,size:size.value,quantity:(existing?.quantity || 0)+1});
      byId('order-status').textContent = '';
      renderBag();
      speechStatus.textContent = item.name+' added in size '+size.value+'.';
    });
    options.append(size,add);
    info.append(options);
    card.append(sample,info);
    return card;
  }));
  if (!results.length) byId('products').append(element('p','No pieces match these preferences.'));
}

function submit(text) {
  const query = text.trim().slice(0,240);
  if (!query) return;
  message(query,'user');
  promptField.value = '';
  const result = interpret(query, preferences);
  const specified = requestedPieces(query);
  const reset = /^(start over|reset|show (me )?all)[.!]?$/i.test(query);
  if (!result.understood && !specified.length) {
    message('Try an occasion, a garment, a colour, a size, or a budget. For example, “a blue shirt under 1500, size M”.');
    return;
  }
  if (reset || /\b(any category|new outfit)\b/i.test(query)) pieces = [];
  if (specified.length) {
    pieces = specified;
    if (specified.length === 1 && /\b(outfit|look)\b/i.test(query)) {
      const [first] = specified;
      if (first.category === 'kurta') pieces.push({category:'jeans'});
      if (first.category === 'shirt' || first.category === 'blazer') pieces.push({category:'trousers'});
      if (first.category === 'jeans' || first.category === 'trousers') pieces.push({category:'shirt'});
    }
  } else if (/\b(colou?r|make (it|them)|black|white|blue|green|red|grey|gray|beige|cream|navy|olive)\b/i.test(query) && pieces.length && (result.preferences.color || /\bany colou?r\b/i.test(query))) {
    pieces = [{...pieces[0],color:result.preferences.color},...pieces.slice(1)];
  }
  preferences = result.preferences;
  render(match(preferences));
  if (!pieces.length && !filters(preferences).length) return renderOutfit();
  renderOutfit(suggestOutfit(preferences,pieces));
  speak('Your outfit preview and shopping links are ready.');
}

function externalLink(label, url, className) {
  const link = element('a',label,className);
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function outfitImage(src, alt) {
  const image = element('img');
  image.src = src;
  image.alt = alt;
  return image;
}

function renderOutfit(outfit) {
  const result = byId('outfit-result');
  result.replaceChildren();
  byId('outfit-placeholder').hidden = Boolean(outfit);
  if (!outfit) return;
  const {pieces:look,minimumTotal,budget} = outfit;
  const preview = element('figure',null,'look-preview');
  const fusion = look.length === 2 && look.some(piece => piece.category === 'kurta' && piece.color === 'black' && piece.style === 'embroidered')
    && look.some(piece => piece.category === 'jeans' && piece.color === 'blue' && piece.style === 'baggy');
  if (fusion) {
    preview.append(outfitImage('./fusion-look.jpg','Black embroidered kurta and blue baggy jeans laid side by side'));
  } else {
    const tiles = element('div',null,'look-tiles');
    for (const piece of look) {
      const sample = catalogue.find(item => item.category === piece.category && item.color === piece.color);
      const listing = piece.listings[0];
      if (sample || listing) {
        const image = outfitImage(sample ? './catalogue/'+sample.id+'.jpg' : listing.image,piece.label);
        image.addEventListener('error', () => image.replaceWith(element('span',piece.label,'image-placeholder')));
        tiles.append(image);
      } else {
        tiles.append(element('span',piece.label,'image-placeholder'));
      }
    }
    preview.append(tiles);
  }
  preview.append(element('figcaption','Outfit inspiration'));
  result.append(preview);

  const note = minimumTotal === null
    ? 'Check retailer prices to confirm the outfit total.'
    : 'Lowest listed outfit total '+rupees(minimumTotal)+(budget === undefined ? '' : ' · Budget '+rupees(budget))+(budget !== undefined && minimumTotal > budget ? ' · Over budget' : '');
  result.append(element('p',note,'outfit-total'));
  result.append(element('p','Listed prices are estimates from retailer pages. Confirm current price, size and delivery with the seller.','shopping-note'));
  for (const piece of look) {
    const section = element('section',null,'shop-piece');
    section.append(element('h3',piece.label));
    const cards = element('div',null,'shop-grid');
    for (const listing of piece.listings) {
      const link = externalLink(null,listing.url,'retail-card');
      const image = outfitImage(listing.image,listing.title);
      image.loading = 'lazy';
      image.referrerPolicy = 'no-referrer';
      image.addEventListener('error', () => image.replaceWith(element('span','Photo on retailer site','image-placeholder')));
      const details = element('div',null,'retail-info');
      details.append(element('strong',listing.title),element('span',listing.store+' ↗'),
        element('span',listing.price === null ? 'Check price' : rupees(listing.price)+(listing.fitsBudget === false ? ' · Over budget' : '')));
      link.append(image,details);
      cards.append(link);
    }
    if (piece.listings.length) section.append(cards);
    const links = element('div',null,'retailer-links');
    for (const [name,url] of shoppingLinks(piece,preferences.size)) links.append(externalLink(name+' ↗',url));
    section.append(links);
    result.append(section);
  }
}

function renderBag() {
  let units = 0;
  let total = 0;
  const rows = [];
  for (const [key,{item,size,quantity}] of bag) {
    units += quantity;
    total += item.price*quantity;
    const row = element('div',null,'bag-row');
    const remove = element('button','Remove one');
    remove.setAttribute('aria-label','Remove one '+item.name+' in size '+size);
    remove.addEventListener('click', () => {
      if (quantity > 1) bag.get(key).quantity--;
      else bag.delete(key);
      renderBag();
      (byId('bag-items').querySelector('button') || bagDialog.querySelector('form button')).focus();
    });
    row.append(element('span',item.name+' · '+size+' × '+quantity+' · '+rupees(item.price*quantity)),remove);
    rows.push(row);
  }
  byId('bag-items').replaceChildren(...(rows.length ? rows : [element('p','Your bag is empty.')]));
  byId('bag-count').textContent = units;
  byId('bag-total').textContent = 'Total '+rupees(total);
  byId('checkout').disabled = !units;
}

byId('chat').addEventListener('submit', event => {
  event.preventDefault();
  submit(promptField.value);
});
document.querySelectorAll('.examples button').forEach(button =>
  button.addEventListener('click', () => submit(button.textContent)));
byId('reset').addEventListener('click', () => {
  recognition?.abort();
  promptField.value = '';
  speechStatus.textContent = '';
  preferences = {};
  pieces = [];
  conversation.replaceChildren();
  render(catalogue);
  renderOutfit();
  message('Hi, I’m your Hemline stylist. What are you dressing for?');
});
byId('bag-button').addEventListener('click', () => {
  byId('order-status').textContent = '';
  bagDialog.showModal();
});
byId('checkout').addEventListener('click', () => {
  bag.clear();
  renderBag();
  byId('order-status').textContent = 'Demo order complete. No payment was taken.';
  bagDialog.querySelector('form button').focus();
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  mic.disabled = true;
  speechStatus.textContent = 'Voice input is unavailable here. You can type your request.';
} else {
  recognition = new SpeechRecognition();
  recognition.lang = 'en-IN';
  recognition.onstart = () => {
    mic.disabled = true;
    speechStatus.textContent = 'Listening…';
  };
  recognition.onresult = event => {
    speechStatus.textContent = '';
    submit(event.results[0][0].transcript);
  };
  recognition.onerror = event => {
    if (event.error !== 'aborted') speechStatus.textContent = 'Speech input was interrupted. Try again or type your request.';
  };
  recognition.onend = () => {
    mic.disabled = false;
    if (speechStatus.textContent === 'Listening…') speechStatus.textContent = 'Try speaking again or type your request.';
  };
  mic.addEventListener('click', () => {
    try {
      window.speechSynthesis?.cancel();
      recognition.start();
    } catch {
      speechStatus.textContent = 'Speech input could not start. Try again or type your request.';
    }
  });
}
if (!('speechSynthesis' in window)) talk.disabled = true;
talk.addEventListener('change', () => {
  if (!talk.checked) window.speechSynthesis?.cancel();
});

render(catalogue);
renderBag();
