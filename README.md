# Hemline — A Talking Fashion Website

Hemline is a student innovation project based on **Topic A**. A shopper can speak or type a request such as “I need something for an interview under ₹2,000, size M.” The stylist extracts the shopper’s constraints, updates a 12-piece fashion catalogue, and explains why an item fits. The shopper can refine the results, select a size, and simulate a purchase.

## Problem and approach

Online shoppers often have to translate a simple goal into several filters, then open individual products to check size and price. Hemline lets the shopper express the goal in one sentence. The storefront shows the interpreted preferences beside the results, so the shopper can see what the system understood and change it in a follow-up.

The prototype uses a rule-based English intent parser. It detects occasion, garment, colour, size, and a maximum price. It merges recognised preferences with the current conversation, filters out items that fail any active constraint, and sorts the matches by price. Prices and availability come directly from the sample inventory. The app gives a clear empty-state response when nothing matches.

## Run locally

From the repository root, run this command with Python 3.

```sh
python -m http.server 8000 --directory dist
```

Open http://localhost:8000 in your browser. The project uses HTML, CSS and JavaScript modules and has no package installation or API key requirement.

On a supported browser, choose **Speak** and allow microphone access. Choose **Read replies aloud** to hear the stylist. If the microphone or speech service is unavailable, type the same requests in the chat box. Use an HTTPS URL for hosted demos. Speech recognition depends on the browser, which may process microphone audio through its own service. Hemline has no application backend and keeps the conversation and bag in memory until the page reloads. [Browser speech documentation](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)

See the [project walkthrough](PROJECT-WALKTHROUGH.md) for the implementation and a classroom explanation.

## Classroom demo

1. Say or type **“Interview under ₹2,000, size M.”** The catalogue shows matching pieces with the budget and size visible.
2. Say or type **“Make it black.”** The results narrow while the occasion, size and budget stay active.
3. Try **“Under ₹500.”** The assistant explains that the catalogue has no exact match.
4. Restore **“Under ₹2,000.”** Add a recommended item, open the bag, and choose **Simulate checkout**. The demo completes without collecting payment or personal details.

To evaluate the idea in class, ask participants to find the same garment once with ordinary filters and once with Hemline. Record task completion, time to locate a valid item, and how often the assistant understood the first request.

## Project files

- `dist/index.html` and `dist/style.css` contain the storefront and responsive layout.
- `dist/matcher.mjs` contains the sample catalogue and intent matching logic.
- `dist/app.mjs` handles the conversation, speech controls, and demo bag.
- `dist/cover.jpg` and `dist/catalogue/` contain AI-generated imagery for the sample storefront.

The sample catalogue assumes fixed size availability and unit prices in rupees. Hemline accepts a supported English vocabulary and one active value per filter. Checkout is a simulation. A production version would need a live inventory and checkout integration.
