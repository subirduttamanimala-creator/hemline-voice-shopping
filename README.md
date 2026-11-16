# Hemline · Voice shopping

Hemline turns a spoken or typed clothing request into editable shopping details. Shoppers review the occasion, garment, colour, size, budget and audience before looking for products across retailers.

## Run locally

Run `python -m http.server 8000 --directory dist` and open http://localhost:8000. The static preview supports request parsing and links to live retailer searches. The browser's Web Speech API handles microphone recognition. Allow microphone access and try the public site in Chrome or Edge if your embedded browser reports a speech-service error.

## Product search

Hemline builds searches from the filled fields and creates separate groups when garments are joined with a plus sign. Each group links to Google Shopping, Amazon India, Flipkart, Myntra, Meesho and AJIO.

The hosted worker can return product photos, prices and ratings from SerpApi Google Shopping results. It resolves Google product records to direct retailer offers when available and checks that each link points to a supported retailer's product page. Configure `SERPAPI_API_KEY` as a **server-side Sites secret** to enable this mode. Without it, the page opens retailer searches for current results. Ratings, stock, and current prices are confirmed on the product page.

Run `node worker/build.mjs` to build the Sites Worker. The build packages browser assets and the worker into `dist/server/index.js`.

[Classroom walkthrough](PROJECT-WALKTHROUGH.md)
