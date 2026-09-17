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


## Store dashboard

Open `admin.html` (or the **Manage store** footer link).

- **Products:** add/delete designs, set BDT prices (blank means quote), popularity, descriptions, categories and multiple photos.
- **Categories:** add, rename, reorder or remove collections. Deleting a category preserves its products in All designs.
- **Showcase:** manage the rotating product images/videos and their order links.
- **Page content:** replace the cover video, cover image, other page artwork, text, delivery charges and refund terms.
- **Contact & settings:** WhatsApp, Messenger, page title and search description.
- **Preview draft:** see unpublished changes in the actual storefront.

Drafts and uploaded files save to IndexedDB on this device. Download a backup before switching browsers or clearing browser data. If storage is unavailable or full, the dashboard displays a warning; use Download draft backup. Product photos accept PNG/JPEG/WebP/GIF and videos accept MP4/WebM, up to 25 MB each.

### Publishing

In Publish & backups, follow Create a GitHub token. Create a fine-grained personal access token with access to **only LynxOF1971/keydify-dhaka**, **Contents: Read and write**, and an expiration date. Paste the token into the dashboard, connect, then Publish changes. GitHub Pages normally needs a few minutes to rebuild. The token stays only in the current page memory; reconnect after closing or reloading. Never put the token in config.js, backups or chat.

Anyone can view the static dashboard and public catalogue, but only GitHub-authorized users can publish. There is no server-side admin password on GitHub Pages.

Publishing creates asset blobs, a tree and a commit, then updates main without force. If another editor changed the store, publishing stops rather than overwriting their work. Download your draft backup and load the latest GitHub content before editing again. Git history retains old assets and versions for recovery.

Backups include content and new uploads; previously published assets remain in the repository. The dashboard does not collect customer orders in a database; orders still go to WhatsApp or Messenger.
