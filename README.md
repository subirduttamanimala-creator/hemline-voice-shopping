# Hemline — A Talking Fashion Website

Hemline is a student innovation project based on **Topic A**. A shopper can speak or type a request such as “I need something for an interview under ₹2,000, size M.” The stylist extracts the shopper’s constraints, updates a 12-piece fashion catalogue, and explains why an item fits. The shopper can refine the results, select a size, and simulate a purchase.

## Problem and approach

Online shoppers often have to translate a simple goal into several filters, then open individual products to check size and price. Hemline lets the shopper express the goal in one sentence. The storefront shows the interpreted preferences beside the results, so the shopper can see what the system understood and change it in a follow-up.

The prototype uses a rule-based English intent parser. It detects occasion, garment, colour, size, and a maximum price. It merges recognised preferences with the current conversation, filters out items that fail any active constraint, and sorts the matches by price. Prices and availability come directly from the sample inventory. The app gives a clear empty-state response when nothing matches.

## Shop the look

Try **“Black embroidered kurta and baggy jeans under ₹2,000.”** Hemline shows an outfit preview first and groups retailer photos and links by garment. It adds the lowest recorded prices to estimate the outfit total. It flags an alternative when it costs more than the budget left after allowing for the cheapest other pieces.

The product cards are curated listings with price snapshots. Each garment also has a Google Shopping link and retailer searches on Amazon, Flipkart, Myntra and Meesho for current results. Confirm price, stock and size with the seller. The separate sample catalogue and demo bag illustrate a simulated checkout.

## Run locally

From the repository root, run this command with Python 3.

```sh
python -m http.server 8000 --directory dist
```

Open http://localhost:8000 in your browser. The project uses HTML, CSS and JavaScript modules and has no package installation or API key requirement.

On a supported browser, choose **Speak** and allow microphone access. Choose **Read replies aloud** to hear the stylist. If the microphone or speech service is unavailable, type the same requests in the chat box. Use an HTTPS URL for hosted demos. Speech recognition depends on the browser, which may process microphone audio through its own service. Hemline has no application backend and keeps the conversation and bag in memory until the page reloads. [Browser speech documentation](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)

See the [project walkthrough](PROJECT-WALKTHROUGH.md) for the implementation and a classroom explanation.

## Classroom demo

1. Say or type **“Black embroidered kurta and baggy jeans under ₹2,000.”** Point out the outfit image and the two groups of shopping options.
2. Say or type **“Under ₹1,500.”** Show the price comparison and how it changes when the same outfit exceeds the budget.
3. Open **Google Shopping** for one garment to see current options. Click a product photo to visit its retailer.
4. Open the separate sample catalogue and demo bag to demonstrate simulated checkout.

To evaluate the idea in class, ask participants to find the same garment once with ordinary filters and once with Hemline. Record task completion, time to locate a valid item, and how often the assistant understood the first request.

## Project files

- `dist/index.html` and `dist/style.css` contain the storefront and responsive layout.
- `dist/matcher.mjs` contains the sample catalogue and intent matching logic.
- `dist/app.mjs` handles the conversation, speech controls, and demo bag.
- `dist/cover.jpg` and `dist/catalogue/` contain AI-generated imagery for the sample storefront.

The sample catalogue assumes fixed size availability and unit prices in rupees. Hemline accepts a supported English vocabulary and one active value per filter. Checkout is a simulation. A production version would need a live inventory and checkout integration.
