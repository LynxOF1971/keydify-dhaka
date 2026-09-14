# KeyDify Dhaka

Static KeyDify storefront with Bagtag, Clicky, NFC and Spooky product photos, category cards, sorting, scroll animations and a clickable 1.5-second showcase. Orders are discussed in WhatsApp; no payment or order is submitted on the website.

## Store settings

Edit `config.js` for products, categories, images and contacts. WhatsApp is configured. Add the exact Facebook Page username to `messenger` to enable Messenger. Prices are confirmed in chat; optional `priceAmount` (BDT) and `popularity` numbers enable meaningful sorting. Unknown values appear last.

Each slideshow `productId` must match a catalogue product. Product `categories` allow designs to appear in multiple collections. Supplied images live in `assets/`.

## Hosting

For GitHub Pages select Settings → Pages → Deploy from a branch → main → / (root), then Save. The site supports a repository subpath through relative asset URLs. The included optional workflow can instead be used with GitHub Actions as the Pages source.

## Preview

Run `python3 -m http.server 4173` in this folder and open http://localhost:4173.

Motion respects reduced-motion preferences. The continuous ticker runs independently of scrolling. The showcase pauses on hover, focus, an open order dialog or a hidden tab.
