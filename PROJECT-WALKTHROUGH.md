# Hemline · Classroom walkthrough

Hemline demonstrates how a shopper can speak in everyday language and review the details a clothing search will use.

1. Open Hemline and choose **Speak**, or type **“I need a navy blue suit for a wedding reception, size 40, under five thousand rupees.”**
2. Review the transcript. Hemline fills the occasion, garment, colour, size and budget. Change a field to see how the search updates.
3. Choose **Find shopping options**. Open a Google Shopping or retailer search to discover actual products. When the live product provider is connected, listing cards can display photos, ratings and prices and open the retailer's product page.
4. Try **“A cream shirt and black trousers for an interview.”** Hemline creates one search group per garment.

## How it works

HTML and CSS define the request, detail fields and shopping results. JavaScript uses the browser's speech recognition service to collect a transcript. Speech and typed requests use the same rule-based parser, including support for spoken numbers such as “five thousand.” The shopper can correct every field before submitting.

Each retailer link carries a search built from those fields. The optional server-side Shopping API fetches product data and resolves links to seller pages. Different retailers may report prices and ratings differently, and the product page provides the current details.

Describe the project decisions and testing you personally completed and credit any AI assistance you used.
