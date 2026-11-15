# Hemline · Project walkthrough

Hemline is a prototype of a talking fashion website. It helps shoppers find clothes by describing an occasion, budget, size, colour or garment. Each request updates the catalogue, and follow-up requests keep the preferences already mentioned. Shoppers can inspect the matches, choose a size, and try a simulated checkout.

## How the project was built

1. **Build the storefront.** HTML defines the main sections, including the stylist, catalogue and bag. CSS sets the colour palette and responsive layout. The catalogue sits beside the conversation on wide screens and below it on smaller screens.
2. **Define the sample inventory.** Each of the 12 products has a name, price in rupees, category, colour, suggested occasions and a list of available sizes. Each card includes a mock product image.
3. **Turn speech into text.** When the shopper presses **Speak**, the browser’s speech recognition service returns a transcript. Typed requests and transcripts go through the same matching code. The optional read-aloud setting uses browser speech synthesis.
4. **Extract and retain preferences.** JavaScript looks for supported words and patterns. “Interview under ₹2,000, size M” sets the occasion to interview, the maximum price to 2,000, and the size to M. “Make it black” adds a colour to the existing preferences. **Reset** starts a new conversation.
5. **Filter the sample catalogue.** The matcher checks each item against every active preference, then orders matches by price. The storefront displays the active preferences and gives reasons such as “Size M in stock” and “Within budget.” When a single change could produce results, the stylist suggests a specific adjustment based on the catalogue.
6. **Simulate a purchase.** The bag holds products, sizes and quantities in browser memory. The checkout button confirms a demo order and empties the bag. The project uses static files and runs without a server-side application or application API key.

The matching logic is rule-based. It recognises supported English patterns and matches stock data directly. Browser speech recognition handles the audio. Shoppers can type if speech input fails.

## Live demonstration

1. Say or type **“Interview under ₹2,000, size M.”** Point out the four matches and the active preferences.
2. Say or type **“Make it black.”** Show how the four matches narrow to two while the size and budget stay active.
3. Say or type **“Under ₹500.”** The stylist should identify the cheapest item that meets the other requirements, the Column Trousers at ₹1,490.
4. Say or type **“Raise the budget to 2000.”** Add the trousers in size M, then open the bag and simulate checkout.

## How to describe your contribution

Use wording that reflects the work you actually did. One opening you can adapt is “Our assignment was to prototype a talking website. I chose to demonstrate it through a fashion store because shoppers often have a budget and occasion in mind. I used AI assistance to implement and revise the prototype. I’ll show how the browser turns speech into text and how the website matches that text against product data.” Add the design choices, testing or changes you personally made.

## What to improve next

For a classroom evaluation, compare the same task using speech, typing and ordinary filters. Measure time to find a matching item, task completion and how often shoppers have to rephrase. Try the microphone on the classroom device before presenting. For use by a real store, connect the matcher to live prices and size availability and hand the bag off to the store’s checkout.
