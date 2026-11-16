# Hemline · Voice shopping

Hemline turns a spoken or typed clothing request into editable shopping details. Shoppers review the occasion, garment, colour, size, budget and audience before looking for products across retailers.

## Run locally

Run `python -m http.server 8000 --directory dist` and open http://localhost:8000. The static preview supports request parsing and links to live retailer searches. Select Speak, allow microphone access, then choose Stop and transcribe. A quantized Whisper model runs in a browser worker. The first use downloads the model from Hugging Face. The recording stays on the device.

## Product search

Hemline builds searches from the filled fields and creates separate groups when garments are joined with a plus sign. Each group links to Google Shopping, Amazon India, Flipkart, Myntra, Meesho and AJIO.

**Top reviewed picks** shows up to 25 retailer products. It weighs the star rating alongside the number of reviews and only includes reviewed products in the selected price range. The search includes the requested size. Check size availability on the retailer page.

| Target budget | Price buffer |
| --- | --- |
| Below ₹1,000 | ±₹200 |
| ₹1,000 to ₹9,999 | ±₹2,000 |
| ₹10,000 to ₹99,999 | ±₹5,000 |
| ₹1,00,000 and above | ±₹20,000 |

For a multi-piece search, Hemline divides the adjusted outfit budget equally across the requested pieces.

The hosted worker can return product photos, prices and ratings from SerpApi Google Shopping results. It resolves Google product records to direct retailer offers when available and checks that each link points to a supported retailer's product page. Configure `SERPAPI_API_KEY` as a **server-side Sites secret** to enable this mode. Without it, the page opens retailer searches for current results. Ratings, stock, and current prices are confirmed on the product page.

Run `node worker/build.mjs` to build the Sites Worker. The build packages browser assets and the worker into `dist/server/index.js`.

[Classroom walkthrough](PROJECT-WALKTHROUGH.md)
