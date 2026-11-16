import {readRequest, searchTerms, retailerSearches} from './search.mjs';
import {priceWindow,rankProducts,resultLimit} from './ranking.mjs';
import {setupVoice} from './voice.mjs';

const byId = id => document.getElementById(id);
const request = byId('request');
const form = byId('search');
const mic = byId('mic');
const voiceStatus = byId('voice-status');
const resultStatus = byId('result-status');
const resultList = byId('result-list');
const rankedList = byId('ranked-list');
const fields = Object.fromEntries([...form.elements].filter(item => item.name).map(item => [item.name,item]));
const currency = new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0});
let parsedText = '';
let activeSearch;

function showPriceRange() {
  const pieces = Math.max(1,searchTerms({garment:fields.garment.value}).length);
  const range = priceWindow(Number(fields.budget.value),pieces);
  byId('price-range').textContent = range
    ? currency.format(range.min)+'–'+currency.format(range.max)+(pieces > 1 ? ' per piece' : ' search range')
    : '';
}

fields.budget.addEventListener('input',showPriceRange);
fields.garment.addEventListener('input',showPriceRange);

function element(tag, text = '', className = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function fillDetails(text) {
  const cleaned = text.trim();
  if (!cleaned) return false;
  const details = readRequest(cleaned);
  const recognized = Object.values(details).some(Boolean);
  for (const [key,value] of Object.entries(details)) {
    if (value !== undefined) fields[key].value = value;
  }
  showPriceRange();
  parsedText = cleaned;
  return recognized;
}

byId('fill').addEventListener('click', () => {
  const filled = fillDetails(request.value);
  voiceStatus.textContent = filled ? 'Review the details below before searching.' :
    request.value.trim() ? 'Add the garment or occasion below to start a search.' : 'Speak or type a request first.';
});

function productLink(url, className) {
  const link = element('a','',className);
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function renderProduct(product, index) {
  const item = element('li','','ranked-item');
  const link = productLink(product.url,'product');
  link.append(element('span',String(index+1),'rank-number'));
  if (product.image) {
    const photo = element('img');
    photo.src = product.image;
    photo.alt = '';
    photo.loading = 'lazy';
    photo.referrerPolicy = 'no-referrer';
    photo.addEventListener('error', () => photo.replaceWith(element('div','Photo on retailer site','image-fallback')));
    link.append(photo);
  } else {
    link.append(element('div','Photo on retailer site','image-fallback'));
  }
  const body = element('div','','product-body');
  body.append(element('span',product.retailer+' ↗','merchant'),element('strong',product.title));
  const price = Number.isFinite(product.price) ? currency.format(product.price) : 'Check price';
  body.append(element('span',price));
  if (Number.isFinite(product.rating)) {
    const count = Number.isFinite(product.reviews) ? ' · '+product.reviews.toLocaleString('en-IN')+' ratings' : '';
    body.append(element('span','★ '+product.rating+count,'merchant'));
  } else {
    body.append(element('span','See reviews on retailer site','merchant'));
  }
  link.append(body);
  item.append(link);
  return item;
}

function makeSection(query, range) {
  const section = element('section','','result-group');
  section.append(element('h3',query));
  const links = element('div','','retailer-grid');
  for (const {name,initial,url} of retailerSearches(query,range)) {
    const link = productLink(url,'retailer');
    const mark = element('span',initial,'retailer-mark');
    mark.setAttribute('aria-hidden','true');
    link.append(mark,element('span',name),element('span','↗'));
    link.setAttribute('aria-label','Search '+name+' for '+query+' (opens new tab)');
    links.append(link);
  }
  section.append(links);
  resultList.append(section);
}

async function getListings(query, budget, pieces, signal) {
  try {
    const url = new URL('./api/products',location.href);
    url.search = new URLSearchParams({q:query,budget:budget || '',pieces});
    const response = await fetch(url,{signal});
    if (!response.ok) return {products:[],status:'unavailable'};
    const body = await response.json();
    return {products:Array.isArray(body.products) ? body.products : [],status:body.status};
  } catch {
    return {products:[],status:'unavailable'};
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (request.value.trim() !== parsedText) fillDetails(request.value);
  const details = Object.fromEntries(Object.entries(fields).map(([key,input]) => [key,input.value.trim()]));
  if (!details.garment) {
    if (details.occasion) details.garment = 'outfit';
    else {
      voiceStatus.textContent = 'Enter a garment or occasion to search.';
      fields.garment.focus();
      return;
    }
  }
  const terms = searchTerms(details);
  if (!terms.length) return;
  const budget = Number(details.budget);
  const range = priceWindow(budget,terms.length);
  activeSearch?.abort();
  const search = new AbortController();
  activeSearch = search;
  resultList.replaceChildren();
  rankedList.replaceChildren();
  byId('results').hidden = false;
  resultStatus.textContent = 'Looking for product listings. You can also open a store search below.';
  byId('results-title').focus();
  for (const query of terms) makeSection(query,range);
  const listings = await Promise.all(terms.map(term => getListings(term,budget,terms.length,search.signal)));
  if (search.signal.aborted) return;
  const products = rankProducts(listings.flatMap(entry => entry.products),range);
  rankedList.append(...products.map(renderProduct));
  const rangeText = range ? currency.format(range.min)+'–'+currency.format(range.max)+(terms.length > 1 ? ' per piece. ' : '. ') : '';
  if (products.length) {
    resultStatus.textContent = rangeText+'Showing '+products.length+' of up to '+resultLimit+' picks, ranked by rating and number of reviews. Confirm size availability with the retailer.';
  } else if (listings.every(entry => entry.status === 'unconfigured')) {
    resultStatus.textContent = rangeText+'On-site product listings require a connected shopping provider. Use the retailer searches below for current options.';
  } else if (listings.some(entry => entry.status === 'ok')) {
    resultStatus.textContent = rangeText+'No reviewed products matched this search. Try a different target budget or open a retailer below.';
  } else {
    resultStatus.textContent = rangeText+'Product results are temporarily unavailable. Use the retailer searches below.';
  }
});

byId('clear').addEventListener('click', () => {
  resetVoice();
  activeSearch?.abort();
  parsedText = '';
  request.value = '';
  form.reset();
  showPriceRange();
  voiceStatus.textContent = '';
  resultList.replaceChildren();
  rankedList.replaceChildren();
  byId('results').hidden = true;
  request.focus();
});

const resetVoice = setupVoice(mic,voiceStatus,text => {
  request.value = text;
  fillDetails(text);
});
