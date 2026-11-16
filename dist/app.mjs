import {readRequest, searchTerms, retailerSearches} from './search.mjs';
import {setupVoice} from './voice.mjs';

const byId = id => document.getElementById(id);
const request = byId('request');
const form = byId('search');
const mic = byId('mic');
const voiceStatus = byId('voice-status');
const resultStatus = byId('result-status');
const resultList = byId('result-list');
const fields = Object.fromEntries([...form.elements].filter(item => item.name).map(item => [item.name,item]));
const currency = new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0});
let parsedText = '';
let activeSearch;

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

function renderProduct(product, budget) {
  const link = productLink(product.url,'product');
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
  body.append(element('span',price+(budget && product.price > budget ? ' · Over budget' : '')));
  if (Number.isFinite(product.rating)) {
    const count = Number.isFinite(product.reviews) ? ' · '+product.reviews.toLocaleString('en-IN')+' ratings' : '';
    body.append(element('span','★ '+product.rating+count,'merchant'));
  } else {
    body.append(element('span','See reviews on retailer site','merchant'));
  }
  link.append(body);
  return link;
}

function makeSection(query, budget) {
  const section = element('section','','result-group');
  section.append(element('h3',query));
  const products = element('div','','product-grid');
  section.append(products);
  const links = element('div','','retailer-grid');
  for (const {name,initial,url} of retailerSearches(query,budget)) {
    const link = productLink(url,'retailer');
    const mark = element('span',initial,'retailer-mark');
    mark.setAttribute('aria-hidden','true');
    link.append(mark,element('span',name),element('span','↗'));
    link.setAttribute('aria-label','Search '+name+' for '+query+' (opens new tab)');
    links.append(link);
  }
  section.append(links);
  resultList.append(section);
  return products;
}

async function getListings(query, budget, signal) {
  try {
    const url = new URL('./api/products',location.href);
    url.search = new URLSearchParams({q:query,budget:budget || ''});
    const response = await fetch(url,{signal});
    if (!response.ok) return [];
    const body = await response.json();
    return Array.isArray(body.products) ? body.products : [];
  } catch {
    return [];
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
  const perPiece = terms.length === 1 ? budget : 0;
  activeSearch?.abort();
  const search = new AbortController();
  activeSearch = search;
  resultList.replaceChildren();
  byId('results').hidden = false;
  resultStatus.textContent = 'Looking for product listings. You can also open a store search below.';
  byId('results-title').focus();
  const sections = terms.map(query => makeSection(query,perPiece));
  const listings = await Promise.all(terms.map(term => getListings(term,perPiece,search.signal)));
  if (search.signal.aborted) return;
  listings.forEach((items,index) => sections[index].append(...items.map(item => renderProduct(item,perPiece))));
  resultStatus.textContent = listings.some(items => items.length)
    ? 'Open a product to check the current price, size and reviews.'+(terms.length > 1 && budget > 0 ? ' Check the combined price against your '+currency.format(budget)+' budget.' : '')
    : 'Open Google Shopping or a retailer to see current products, prices and reviews.';
});

byId('clear').addEventListener('click', () => {
  resetVoice();
  activeSearch?.abort();
  parsedText = '';
  request.value = '';
  form.reset();
  voiceStatus.textContent = '';
  resultList.replaceChildren();
  byId('results').hidden = true;
  request.focus();
});

const resetVoice = setupVoice(mic,voiceStatus,text => {
  request.value = text;
  fillDetails(text);
});
