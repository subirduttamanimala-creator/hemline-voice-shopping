import {catalogue, filters, interpret, match, rupees} from './matcher.mjs';

const byId = id => document.getElementById(id);
const promptField = byId('prompt');
const conversation = byId('conversation');
const speechStatus = byId('speech-status');
const mic = byId('mic');
const talk = byId('talk');
const bagDialog = byId('bag');
const bag = new Map();
let preferences = {};
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
  if (speaker === 'stylist' && talk.checked && 'speechSynthesis' in window) {
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
  if (!result.understood) {
    message('Try an occasion, a garment, a colour, a size, or a budget. For example, “a blue shirt under 1500, size M”.');
    return;
  }
  preferences = result.preferences;
  const results = match(preferences);
  render(results);
  if (!filters(preferences).length) {
    message('Here’s the full catalogue. What would you like to find?');
  } else if (!results.length) {
    message('Nothing matches those preferences. Try a higher budget, say “any colour”, or reset to start a new search.');
  } else {
    const best = results[0];
    message('I found '+results.length+' '+(results.length === 1 ? 'piece' : 'pieces')+'. Start with the '+best.name+' at '+rupees(best.price)+'. It has '+best.detail+'.');
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
  conversation.replaceChildren();
  render(catalogue);
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
