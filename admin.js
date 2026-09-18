'use strict';
const $ = s => document.querySelector(s);
const clone = x => JSON.parse(JSON.stringify(x));
const repo = 'LynxOF1971/keydify-dhaka';
const titles = { products: ['Products', 'Add designs and choose their photos and categories.'], categories: ['Categories', 'Organise your collections. Each category opens its related designs.'], slides: ['Showcase', 'Choose the designs shown in the rotating product slideshow.'], content: ['Page content', 'Edit your cover, page images, wording, delivery charges and policies.'], settings: ['Contact & settings', 'Choose where your customers can reach you.'], publish: ['Publish & backups', 'Save your changes to GitHub and update the live store.'] };
let data = clone(window.KEYDIFY), baseline = clone(data), assets = {}, tab = 'products', token = '', connected = false, dirty = false, busy = false, db, saveTimer, template;
let previewURLs = [];
let uploading = 0;
function el(tag, text, cls) { const node = document.createElement(tag); if (text != null) node.textContent = text; if (cls) node.className = cls; return node; }
function button(text, fn, cls = '') { const node = el('button', text, cls); node.type = 'button'; node.onclick = fn; return node; }
function message(text) { $('#status').textContent = text; }
function error(e) { message(e.message || String(e)); }
function field(parent, title, value, update, type = 'text') {
  const label = el('label', title), input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
  if (type !== 'textarea') input.type = type;
  input.value = value ?? ''; input.setAttribute('aria-label', title);
  if (type === 'number') { input.min = '0'; input.step = 'any'; }
  input.oninput = () => { update(input.value); changed(); };
  label.append(input); parent.append(label); return input;
}
function choice(parent, title, value, options, update) {
  const label = el('label', title), select = document.createElement('select'); select.setAttribute('aria-label', title);
  options.forEach(([v, name]) => { const option = el('option', name); option.value = v; select.append(option); });
  select.value = value; select.onchange = () => { update(select.value); changed(); }; label.append(select); parent.append(label); return select;
}
function changed() { dirty = true; $('#save-state').textContent = 'Saving draft on this device…'; clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); }
async function save() {
  if (!db) { $('#save-state').textContent = 'Draft not saved. Download a backup before closing.'; return; }
  try {
    await new Promise((resolve, reject) => { const tx = db.transaction('draft', 'readwrite'); tx.objectStore('draft').put({ data: clone(data), baseline, assets, dirty }, 'current'); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
    $('#save-state').textContent = dirty ? 'Draft saved on this device · Unpublished' : 'Draft matches last loaded or published version';
  } catch { $('#save-state').textContent = 'Storage full or unavailable. Download a backup to keep your draft.'; }
}
async function ask(text) { const dialog=document.createElement('dialog');dialog.className='confirm-dialog';const description=el('p',text);const actions=el('div',null,'actions');dialog.append(description,actions);document.body.append(dialog);return new Promise(resolve=>{const done=value=>{dialog.close();dialog.remove();resolve(value);};actions.append(button('Cancel',()=>done(false)),button('Continue',()=>done(true),'primary'));dialog.addEventListener('cancel',event=>{event.preventDefault();done(false);});dialog.showModal();}); }
function mediaURL(path) { return assets[path]?.url || path; }
function upload(parent, title, set, video = false, multiple = false) {
  const label = el('label', title, 'upload'), input = document.createElement('input'); input.type = 'file'; input.accept = video ? 'video/mp4,video/webm' : 'image/png,image/jpeg,image/webp,image/gif'; input.multiple = multiple; input.setAttribute('aria-label', title);
  input.onchange = async () => {
    uploading++; $('#preview').disabled = true;
    try {
      for (const file of input.files) {
        if (file.size > 25 * 1024 * 1024) throw new Error('Please choose a file smaller than 25 MB.');
        if (!(video ? /^video\/(mp4|webm)$/ : /^image\/(png|jpeg|webp|gif)$/).test(file.type)) throw new Error('Choose a supported image or video file.');
        const url = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
        const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/webm': 'webm' }[file.type];
        const path = `assets/upload-${crypto.randomUUID()}.${ext}`; assets[path] = { url, name: file.name }; set(path); changed();
      }
      changed(); render();
    } catch (e) { error(e); } finally { uploading--; $('#preview').disabled = busy || uploading > 0; await save(); }
  }; label.append(input); parent.append(label);
}
function imageField(parent, object, key, title = 'Image', update = value => object[key] = value) {
  if (object[key]) { const img = el('img', null, 'thumb'); img.src = mediaURL(object[key]); img.alt = title; parent.append(img); }
  field(parent, `${title} URL or asset path`, object[key], update);
  upload(parent, `Upload ${title.toLowerCase()}`, update);
}
function reorder(list, index, delta) { if (list[index + delta]) { [list[index], list[index + delta]] = [list[index + delta], list[index]]; changed(); render(); } }
function controls(parent, list, index, remove) {
  const actions = el('div', null, 'actions');
  const up = button('↑ Move up', () => reorder(list, index, -1), 'small'); up.disabled = index === 0;
  const down = button('↓ Move down', () => reorder(list, index, 1), 'small'); down.disabled = index === list.length - 1;
  actions.append(up, down, button('Delete', remove, 'small danger')); parent.append(actions);
}
async function removeProduct(p) {
  if (!await ask(`Remove “${p.name}” from your draft? Its showcase slides will also be removed. The live store changes only after publishing.`)) return;
  data.products = data.products.filter(x => x !== p); data.slides = data.slides.filter(x => x.productId !== p.id); changed(); render();
}
function renderProducts(root) {
  root.append(button('+ Add product', () => { data.products.unshift({ id: `design-${crypto.randomUUID().slice(0,8)}`, name: 'New design', category: data.categories[0]?.id || '', categories: [], description: '', price: 'Ask for a quote', image: '', images: [] }); changed(); render(); }, 'primary'));
  root.append(el('p', `${data.products.length} designs · Use a separate product for each design customers can order.`, 'help'));
  const cards = el('div', null, 'cards');
  data.products.forEach((p, i) => {
    const card = el('article', null, 'card'); card.append(el('h2', p.name)); controls(card, data.products, i, () => removeProduct(p));
    field(card, 'Product name', p.name, v => p.name = v);
    choice(card, 'Category', p.category, [['', 'Choose category'], ...data.categories.map(c => [c.id, c.name])], v => p.category = v);
    field(card, 'Description', p.description, v => p.description = v, 'textarea');
    imageField(card, p, 'image', 'Product image', value => {
      const old = p.image; p.image = value;
      data.slides.forEach(slide => { if (slide.productId === p.id && slide.type === 'image' && slide.src === old) slide.src = value; });
    });
    card.append(el('p', 'This design and its extra photos appear only in the category selected above. Matching showcase photos update with the main product image.', 'help'));
    const photos = el('details'); photos.append(el('summary', 'Category gallery photos'));
    (p.images || []).forEach((src, n) => { const line = el('div', null, 'photo-row'), img = el('img'); img.src = mediaURL(src); img.alt = `${p.name} photo ${n+1}`; line.append(img); field(line, `Photo ${n+1}`, src, v => p.images[n] = v); line.append(button('Remove', () => { p.images.splice(n, 1); changed(); render(); }, 'small')); photos.append(line); });
    upload(photos, 'Add photos to this category gallery', path => (p.images ||= []).push(path), false, true); card.append(photos); cards.append(card);
  }); root.append(cards);
}
function renderCategories(root) {
  root.append(button('+ Add category', () => { data.categories.push({ id: `category-${crypto.randomUUID().slice(0,8)}`, name: 'New category', description: '', image: '' }); changed(); render(); }, 'primary'));
  const cards = el('div', null, 'cards');
  data.categories.forEach((c,i) => {
    const card = el('article', null, 'card'); card.append(el('h2', c.name));
    controls(card, data.categories, i, async () => {
      const count = data.products.filter(p => p.category === c.id || p.categories?.includes(c.id)).length;
      if (!await ask(`Delete “${c.name}” from the draft? ${count} related products will remain in Studio but will be hidden from category galleries until you assign them to another category.`)) return;
      data.categories.splice(i,1); data.products.forEach(p => { if (p.category === c.id) p.category = ''; p.categories = (p.categories || []).filter(id => id !== c.id); }); changed(); render();
    });
    field(card, 'Category name', c.name, v => c.name = v); field(card, 'Category description', c.description, v => c.description = v, 'textarea'); imageField(card,c,'image','Category image'); cards.append(card);
  }); root.append(cards);
}
function renderSlides(root) {
  root.append(el('p','These slides rotate every 1.5 seconds. Link a product so clicking its slide opens the order details. The full-width video and cover are under Page content.','notice'));
  root.append(button('+ Add showcase slide', () => { data.slides.push({ type: 'image', src: data.products[0]?.image || '', label: 'New design', productId: data.products[0]?.id || '', alt: '' }); changed(); render(); }, 'primary'));
  const cards = el('div',null,'cards');
  data.slides.forEach((s,i) => { const card=el('article',null,'card'); card.append(el('h2',`Slide ${i+1}`)); controls(card,data.slides,i,()=>{data.slides.splice(i,1);changed();render();});
    choice(card,'Media type',s.type,[['image','Image'],['video','Video']],v=>{s.type=v;changed();render();});
    field(card,'Slide label',s.label,v=>s.label=v); field(card,'Image description',s.alt,v=>s.alt=v);
    choice(card,'Product to order',s.productId || '',[['','Explore categories'],...data.products.map(p=>[p.id,p.name])],v=>s.productId=v);
    if(s.type==='video'){field(card,'Video URL or asset path',s.src,v=>s.src=v);upload(card,'Upload slide video',path=>s.src=path,true);}else imageField(card,s,'src','Slide image'); cards.append(card);
  });root.append(cards);
}
const textFields = [
 ['Hero','.hero-copy .eyebrow'],['Hero title','.hero-copy h1'],['Hero introduction','.hero-copy .intro'],['Hero note','.hero-note'],['Hero artwork label','.art-index'],['Hero bottom label','.hero-bottom>span'],
 ['Ticker','.ticker-group'],['Collection label','.section-heading .eyebrow'],['Collection title','.section-heading h2'],['Collection introduction','.section-heading>p'],['Category heading','.category-heading'],
 ['Brand label','.brand-break .eyebrow'],['Brand statement','.brand-statement'],['How to order label','.how>.eyebrow'],['How to order title','.how>h2'],
 ...[1,2,3].flatMap(n=>[[`Step ${n} title`,`.steps article:nth-child(${n}) h3`],[`Step ${n} text`,`.steps article:nth-child(${n}) p`]]),
 ['Delivery label','.delivery-content>.eyebrow'],['Delivery title','.delivery-content>h2'],['Courier','.delivery-content>p:not(.eyebrow)'],
 ...[1,2,3].flatMap(n=>[[`Delivery area ${n}`,`.delivery-table tbody tr:nth-child(${n}) th`],[`Delivery charge ${n}`,`.delivery-table tbody tr:nth-child(${n}) td`]]),
 ['Payment terms','.delivery-terms p:first-of-type'],['Delivery address note','.delivery-terms p:last-of-type'],
 ['Refund label','.refund-content>.eyebrow'],['Refund title','.refund-content>h2'],['Reporting deadline','.refund-deadline strong'],['How to report','.refund-deadline p'],
 ['Refund terms','.policy-block:first-of-type p'],['Return and redelivery terms','.policy-block:nth-of-type(3) p:first-of-type'],['Redelivery charge','.policy-block:nth-of-type(3) p:last-of-type'],
 ['Contact label','.contact .eyebrow'],['Contact title','.contact h2'],['Contact details','.contact-links>p:not([id])'],['Footer tagline','footer>p']
];
// Use structure-independent selectors for the two policy blocks.
textFields.find(x=>x[0]==='Refund terms')[1]='.refund-content .policy-block:nth-child(4) p';
textFields.find(x=>x[0]==='Return and redelivery terms')[1]='.refund-content .policy-block:nth-child(5) p:first-of-type';
textFields.find(x=>x[0]==='Redelivery charge')[1]='.refund-content .policy-block:nth-child(5) p:last-of-type';
const mediaFields=[['Cover image','.brand-cover>img'],['Cover video','#cover-video'],['Brand artwork','.brand-break>img'],['Delivery illustration','.delivery-art img'],['Refund illustration','.refund-art img']];
function renderContent(root){
  data.site ||= {};data.site.text ||= {};data.site.media ||= {};
  const media=el('div',null,'cards');
  for(const [title,selector] of mediaFields){const card=el('div',null,'card');card.append(el('h2',title));const value=data.site.media[selector] ?? template.querySelector(selector)?.getAttribute('src') ?? '';
    if(!title.includes('video')){const img=el('img',null,'thumb');img.src=mediaURL(value);img.alt=title;card.append(img);}
    field(card,`${title} URL or asset path`,value,v=>data.site.media[selector]=v);upload(card,`Upload ${title.toLowerCase()}`,path=>data.site.media[selector]=path,title.includes('video'));media.append(card);
  }root.append(media);
  const panel=el('div',null,'panel');panel.append(el('h2','Words, delivery & policies'),el('p','Your wording is displayed as plain text. Use line breaks where you want a new line.','help'));
  for(const [title,selector] of textFields){const node=template.querySelector(selector);if(!node)continue;const copy=node.cloneNode(true);copy.querySelectorAll('br').forEach(br=>br.replaceWith('\n'));field(panel,title,data.site.text[selector] ?? copy.textContent,v=>data.site.text[selector]=v,'textarea');}root.append(panel);
}
function normalizeWhatsApp(v){let number=v.replace(/\D/g,'');if(/^01\d{9}$/.test(number))number='88'+number;return number;}
function normalizeMessenger(v){v=v.trim();if(/^https:\/\//i.test(v)){try{const url=new URL(v);if(['facebook.com','www.facebook.com','m.me','www.messenger.com','messenger.com'].includes(url.hostname)){const parts=url.pathname.split('/').filter(Boolean);return parts[0]==='t'?parts[1] || '':parts[0] || '';}}catch{}}return v;}
function renderSettings(root){const panel=el('div',null,'panel');panel.append(el('h2','Customer contact'));field(panel,'WhatsApp number',data.whatsapp,v=>data.whatsapp=v);panel.append(el('p','Bangladesh numbers such as 01704184090 are converted to +880 format when you publish.','help'));field(panel,'Messenger username or Facebook page URL',data.messenger,v=>data.messenger=v);panel.append(el('p','Example: https://www.facebook.com/keydify.dhaka/','help'));data.site ||= {};field(panel,'Browser tab title',data.site.title ?? template.title,v=>data.site.title=v);field(panel,'Search description',data.site.description ?? template.querySelector('meta[name="description"]').content,v=>data.site.description=v,'textarea');root.append(panel);}
async function api(path,method='GET',body){const response=await fetch(`https://api.github.com/repos/${repo}${path ? "/"+path : ""}`,{method,headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});if(!response.ok){const info=await response.json().catch(()=>({}));throw new Error(`GitHub ${response.status}: ${info.message || 'Request failed'}. Your draft is still saved.`);}return response.json();}
function parseConfig(source){const match=source.match(/window\.KEYDIFY\s*=\s*([\s\S]*?)\s*;?\s*$/);if(!match)throw new Error('Could not read the store configuration.');return JSON.parse(match[1].replace(/;\s*$/,''));}
function encode(text){const bytes=new TextEncoder().encode(text);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary);}
function decode(base64){return new TextDecoder().decode(Uint8Array.from(atob(base64.replace(/\s/g,'')),c=>c.charCodeAt(0)));}
async function latest(){const ref=await api('git/ref/heads/main');const file=await api(`contents/config.js?ref=${ref.object.sha}`);return {head:ref.object.sha,data:parseConfig(decode(file.content))};}
function validMedia(value){return typeof value==='string' && (value==='' || /^assets\/[a-zA-Z0-9_./ -]+$/.test(value) && !value.split('/').includes('..') || /^https:\/\//.test(value) && (()=>{try{return new URL(value).protocol==='https:';}catch{return false;}})());}
function validate(value){
  if(!value || !Array.isArray(value.products)||!Array.isArray(value.categories)||!Array.isArray(value.slides))throw new Error('Invalid store data. Products, categories and slides are required.');
  for(const list of [value.products,value.categories]){const ids=new Set();for(const item of list){if(!item.id || ids.has(item.id)||!item.name?.trim())throw new Error('Every product and category needs a name and a unique ID.');ids.add(item.id);}}
  const ids=new Set(value.categories.map(c=>c.id));const products=new Set(value.products.map(p=>p.id));
  for(const p of value.products){if(!ids.has(p.category))throw new Error(`Choose an existing category for ${p.name}.`);if(!p.image)throw new Error(`Add an image for ${p.name}.`);}
  for(const s of value.slides){if(!['image','video'].includes(s.type)||!s.src)throw new Error('Every showcase slide needs an image or video.');if(s.productId&&!products.has(s.productId))throw new Error('A slideshow product no longer exists. Select another product.');}
  if(Object.keys(value.site?.text||{}).some(key=>!textFields.some(field=>field[1]===key))||Object.keys(value.site?.media||{}).some(key=>!mediaFields.some(field=>field[1]===key)))throw new Error('This backup has unsupported page fields.');
  const media=[...value.products.flatMap(p=>[p.image,...(p.images||[])]),...value.categories.map(c=>c.image||''),...value.slides.map(s=>s.src),...Object.values(value.site?.media||{})];if(media.some(v=>!validMedia(v)))throw new Error('Use an uploaded asset or an HTTPS link for each image and video.');
  value.whatsapp=normalizeWhatsApp(value.whatsapp||'');value.messenger=normalizeMessenger(value.messenger||'');if(!/^\d{7,15}$/.test(value.whatsapp))throw new Error('Enter a valid WhatsApp phone number.');if(!/^[a-zA-Z0-9._-]+$/.test(value.messenger))throw new Error('Enter a valid Messenger username or Facebook page URL.');return value;
}
async function publish(){
  if(busy)return;try{
    if(uploading)throw new Error('Please wait for your photos or videos to finish loading.');
    let next=validate(clone(data));if(!connected||!token)throw new Error('Connect GitHub first.');
    if(!await ask('Publish this draft to your live KeyDify website?'))return;
    busy=true;render();message('Checking the latest version on GitHub…');
    const remote=await latest();
    const merged=window.KeydifyDraft.merge(baseline,next,remote.data);
    if(merged.conflicts.length)throw new Error(`The same fields changed both here and on the website: ${merged.conflicts.join(', ')}. Your draft is safe. Download a draft backup before loading the latest GitHub version and reapplying these edits.`);
    next=validate(merged.data);
    const commit=await api(`git/commits/${remote.head}`),tree=[];
    const serialized=JSON.stringify(next);let n=0;const pending=Object.entries(assets).filter(([path])=>serialized.includes(path));
    for(const [path,asset] of pending){message(`Uploading image/video ${++n} of ${pending.length}…`);const blob=await api('git/blobs','POST',{content:asset.url.split(',')[1],encoding:'base64'});tree.push({path,mode:'100644',type:'blob',sha:blob.sha});}
    const blob=await api('git/blobs','POST',{content:encode(`/* Edited in KeyDify Studio */\nwindow.KEYDIFY = ${JSON.stringify(next,null,2)};\n`),encoding:'base64'});tree.push({path:'config.js',mode:'100644',type:'blob',sha:blob.sha});
    const page=await api(`contents/index.html?ref=${remote.head}`);const html=decode(page.content).replace(/config\.js(?:\?[^\"]*)?/g, `config.js?v=${Date.now()}`);tree.push({path:'index.html',mode:'100644',type:'blob',content:html});
    const newTree=await api('git/trees','POST',{base_tree:commit.tree.sha,tree});const newCommit=await api('git/commits','POST',{message:'Update store content from KeyDify Studio',tree:newTree.sha,parents:[remote.head]});
    message('Publishing changes…');await api('git/refs/heads/main','PATCH',{sha:newCommit.sha,force:false});
    data=next;baseline=clone(next);assets={};dirty=false;await save();message('Published to GitHub. GitHub Pages is rebuilding your store; allow a few minutes, then refresh the live site.');
  }catch(e){error(e);}finally{busy=false;render();}
}
function download(){const blob=new Blob([JSON.stringify({version:1,data,baseline,assets},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=`keydify-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function renderPublish(root){
  const panel=el('div',null,'panel');panel.append(el('h2','Publish to your website'),el('p',`Destination: ${repo} · main`,'help'));
  const info=el('p','A GitHub fine-grained personal access token is required to publish. Choose only the keydify-dhaka repository and give Contents: Read and write access. Your token is kept in memory for this session and is never saved in the website, draft or backup.','notice');panel.append(info);
  const link=el('a','Create a GitHub token ↗','link');link.href='https://github.com/settings/personal-access-tokens/new';link.target='_blank';link.rel='noopener noreferrer';panel.append(link);
  if(!connected){const input=field(panel,'GitHub access token','',()=>{},'password');input.autocomplete='off';input.oninput=null;
    panel.append(button('Connect GitHub',async()=>{try{token=input.value.trim();input.value='';if(!token)throw new Error('Enter your GitHub token.');const result=await api('');if(!result.permissions?.push)throw new Error('This account cannot update this repository.');connected=true;message('GitHub connected. Review your draft, then publish.');render();}catch(e){token='';error(e);}},'primary'));
  }else{panel.append(el('p','GitHub connected ✓'));panel.append(button('Disconnect',()=>{token='';connected=false;render();}));}
  const actions=el('div',null,'actions');actions.append(button('Check live website',async()=>{try{const response=await fetch(`config.js?verify=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error('Could not check the live website. Try again.');const live=parseConfig(await response.text());message(JSON.stringify(live)===JSON.stringify(data)?'Verified: the live website has all changes in this draft.':'The live website differs from this draft. Publish any unpublished edits, or wait for GitHub Pages to finish deploying and check again.');}catch(e){error(e);}}));const pub=button(busy?'Publishing…':'Publish changes',publish,'primary');pub.disabled=busy||!connected||uploading>0;actions.append(pub,button('Load latest from GitHub',async()=>{if(!await ask('Replace this device’s draft with the latest GitHub version? Download a backup first if you want to keep your edits.'))return;try{const remote=await latest();data=remote.data;baseline=clone(data);assets={};dirty=false;await save();message('Latest GitHub content loaded.');render();}catch(e){error(e);}}));panel.append(actions);const build=el('a','Check publishing status on GitHub ↗');build.href=`https://github.com/${repo}/actions`;build.target='_blank';build.rel='noopener';panel.append(build);root.append(panel);
  const backup=el('div',null,'panel');backup.append(el('h2','Backups'),el('p','Download your content and any new uploads before switching devices. Existing website images remain in your GitHub repository.','help'),button('Download draft backup',download));
  const label=el('label','Restore backup'),input=document.createElement('input');input.type='file';input.accept='application/json,.json';input.onchange=async()=>{try{const value=JSON.parse(await input.files[0].text());validate(clone(value.data));if(!await ask('Replace the current draft with this backup?'))return;data=value.data;baseline=value.baseline||clone(window.KEYDIFY);assets=value.assets||{};changed();render();message('Backup restored as a draft. Preview before publishing.');}catch(e){error(e);}};label.append(input);backup.append(label);root.append(backup);
}
function render(){const root=$('#editor');root.replaceChildren();$('#page-title').textContent=titles[tab][0];$('#page-help').textContent=titles[tab][1];document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));({products:renderProducts,categories:renderCategories,slides:renderSlides,content:renderContent,settings:renderSettings,publish:renderPublish})[tab](root); if(busy)root.querySelectorAll('button,input,textarea,select').forEach(node=>node.disabled=true);$('#preview').disabled=busy||uploading>0;}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{if(busy)return;tab=b.dataset.tab;message('');render();});
$('#preview').onclick=()=>{try{if(uploading)throw new Error('Please wait for your photos or videos to finish loading.');const draft=validate(clone(data));previewURLs.forEach(url=>URL.revokeObjectURL(url));previewURLs=[];let serialized=JSON.stringify(draft);for(const [path,asset] of Object.entries(assets)){const [head,base64]=asset.url.split(',');const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:head.split(':')[1].split(';')[0]}));previewURLs.push(url);serialized=serialized.split(path).join(url);}sessionStorage.setItem('keydify-preview',serialized);$('#preview-frame').src=`index.html?preview=1&t=${Date.now()}`;$('#preview-dialog').showModal();}catch(e){error(e);}};
$('#close-preview').onclick=()=>{$('#preview-dialog').close();$('#preview-frame').src='about:blank';};
window.addEventListener('beforeunload',event=>{if(busy||uploading){event.preventDefault();event.returnValue='';}});
async function start(){try{const fresh=await fetch(`config.js?fresh=${Date.now()}`,{cache:'no-store'});if(!fresh.ok)throw new Error('Could not load store content. Refresh to try again.');data=parseConfig(await fresh.text());baseline=clone(data);template=new DOMParser().parseFromString(await(await fetch(`index.html?studio=${Date.now()}`,{cache:'no-store'})).text(),'text/html');
  try{db=await new Promise((resolve,reject)=>{const req=indexedDB.open('keydify-studio',1);req.onupgradeneeded=()=>req.result.createObjectStore('draft');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});const saved=await new Promise((resolve,reject)=>{const req=db.transaction('draft').objectStore('draft').get('current');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});if(saved?.dirty){
    const merged=window.KeydifyDraft.merge(saved.baseline,saved.data,data);
    if(merged.conflicts.length){data=saved.data;baseline=saved.baseline;message('Saved draft restored. Some fields also changed on the website: '+merged.conflicts.join(', ')+'. Download a backup before loading the latest version.');}
    else{data=merged.data;message('Your saved edits have been restored and combined with the latest website changes.');}
    assets=saved.assets||{};dirty=true;
  }}
  catch{message('Browser storage is unavailable. Download a backup before leaving.');}
  render();await save();
}catch(e){error(e);}}
start();
