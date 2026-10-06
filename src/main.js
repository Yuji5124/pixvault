import './style.css';
import { groupAssets } from './collections.js';
import { config } from './config.js';
import { indexAssets, filterAssets, sortAssets } from './search.js';
import { snippet, encodePath } from './snippets.js';
const app = document.querySelector('#app');
app.innerHTML = `<header><div class="brand"><span class="logo">▧</span><div><h1>PIXVAULT<span> / 01</span></h1><p>2D ASSET SERVER</p></div></div><div class="header-actions"><span class="mode">● FREE MODE</span><button id="random">⚄ RANDOM ASSET</button></div></header><main><section class="intro"><div><p class="eyebrow">YOUR CREATIVE INVENTORY</p><h2>A home for every pixel.</h2><p class="muted">Find it. Copy it. Build something.</p></div><div class="total"><strong id="total">—</strong><span>ASSETS IN VAULT</span></div></section><section class="tools"><label class="search"><span>⌕</span><input id="search" type="search" placeholder="Search assets, tags, or a little inspiration…" aria-label="Search assets"><kbd>/</kbd></label><label class="sort-label">SET <select id="collection"><option value="all">All sets</option></select></label><label class="sort-label">GROUP <select id="group"><option value="collection">カテゴリ＋タッチ</option><option value="none">グループなし</option></select></label><label class="sort-label">SORT BY <select id="sort"><option value="name">Name</option><option value="newest">Newest</option><option value="width">Width</option><option value="height">Height</option><option value="random">Random</option></select></label></section><nav id="categories" aria-label="Asset categories"></nav><section class="filterbar"><span id="count" role="status">Loading assets…</span><div><label><input id="transparent" type="checkbox"> Transparent only</label><label><input id="favorites" type="checkbox"> ☆ Favorites</label></div></section><section id="grid" aria-label="Assets"></section><p id="empty" hidden>No assets match. Try another search or clear the filters.</p><button id="more" hidden>LOAD MORE</button><footer><span>PIXVAULT v1.0 · Local-first. Yours to build with.</span><a id="json-link">OPEN ASSETS.JSON ↗</a></footer></main><dialog id="detail"><button class="close" aria-label="Close asset details">✕</button><div class="detail-layout"><div class="detail-image checker"><img id="original" alt=""></div><div class="detail-info"><p class="eyebrow" id="detail-category"></p><h2 id="detail-name"></h2><p id="metadata"></p><p id="description"></p><div id="provenance"><p id="credit"></p><a id="source-link" target="_blank" rel="noopener noreferrer">SOURCE ↗</a> · <a id="license-link" target="_blank" rel="noopener noreferrer">LICENSE ↗</a><button data-copy="attribution">COPY CREDIT</button></div><p class="eyebrow">TAGS</p><div id="tags"></div><button id="favorite">☆ FAVORITE</button><div class="copy-grid"><button data-copy="url">COPY URL</button><button data-copy="path">COPY PATH</button><button data-copy="html">COPY HTML</button><button data-copy="three">COPY THREE.JS</button><button data-copy="sprite">COPY SPRITE</button><button data-copy="phaser">COPY PHASER</button></div><a id="download" class="button" download>↓ DOWNLOAD ORIGINAL PNG</a><textarea id="code" readonly aria-label="Integration code"></textarea></div></div></dialog><div id="toast" role="status"></div>`;
const $ = s => document.querySelector(s);
const base = import.meta.env.BASE_URL;
const localUrl = p => base + encodePath(p);
$('#json-link').href = localUrl('data/assets.json');
let assets = [], visible = [], category = 'all', limit = config.pageSize, selected, opener;
let favorites;
try { const saved=JSON.parse(localStorage.getItem('pixvault.favorites') || '[]'); favorites = new Set(Array.isArray(saved) ? saved : []); } catch { favorites = new Set(); }
function notify(message) { $('#toast').textContent=message; clearTimeout(notify.timer); notify.timer=setTimeout(()=>$('#toast').textContent='',3000); }
function favorite(asset) {
 favorites.has(asset.id) ? favorites.delete(asset.id) : favorites.add(asset.id);
 try { localStorage.setItem('pixvault.favorites',JSON.stringify([...favorites])); } catch { notify('Favorites saved for this session only. Storage is unavailable.'); }
 render(); if(selected) updateFavorite();
}
function updateFavorite() { $('#favorite').textContent=favorites.has(selected.id) ? '★ FAVORITED' : '☆ FAVORITE'; $('#favorite').setAttribute('aria-pressed',String(favorites.has(selected.id))); }
function open(asset, source) {
 selected=asset; opener=source || document.activeElement;
 $('#original').src=localUrl(asset.file); $('#original').alt=asset.title || asset.name;
 $('#detail-category').textContent=asset.category; $('#detail-name').textContent=asset.title || asset.name;
 $('#metadata').textContent=`${asset.width} × ${asset.height} · PNG · ${(asset.fileSize/1024).toFixed(1)} KB · Transparent ${asset.transparent?'✓ YES':'× NO'}${asset.fileSize >= config.largeFileBytes?' · LARGE FILE':''}`;
 $('#description').textContent=asset.description || '';
 $('#credit').textContent=[asset.collectionTitle,asset.author,asset.license].filter(Boolean).join(' · ');
 for(const [selector,value] of [['#source-link',asset.source],['#license-link',asset.licenseUrl]]) {
  const link=$(selector); let valid=false;
  try { const url=new URL(value); valid=url.protocol==='https:'; if(valid) link.href=url.href; } catch {}
  link.hidden=!valid;
 }
 $('#provenance').hidden=!asset.license;

 $('#tags').replaceChildren(...asset.tags.map(tag=> { const el=document.createElement('span'); el.className='tag'; el.textContent=tag; return el; }));
 $('#download').href=localUrl(asset.file); $('#download').download=asset.name+'.png';
 $('#code').value=snippet(asset,'url'); updateFavorite(); $('#detail').showModal();
}
function render() {
 visible=sortAssets(filterAssets(assets,{query:$('#search').value,category,collection:$('#collection').value,transparent:$('#transparent').checked,favoritesOnly:$('#favorites').checked,favorites}),$('#sort').value);
 $('#count').textContent=`${visible.length} / ${assets.length} ASSETS`;
 $('#empty').hidden=visible.length!==0; $('#more').hidden=visible.length<=limit;
 $('#random').disabled=visible.length===0;
 const cards=visible.slice(0,limit).map(asset=> {
 const card=document.createElement('article'); card.className='asset-card';
 const imageButton=document.createElement('button'); imageButton.className='image-button checker'; imageButton.setAttribute('aria-label',`Open ${asset.title || asset.name}`);
 const image=document.createElement('img'); image.src=localUrl(asset.thumbnail); image.alt=asset.title || asset.name; image.loading='lazy'; image.width=256; image.height=256; imageButton.append(image); imageButton.onclick=()=>open(asset,imageButton);
 const info=document.createElement('div'); info.className='card-info';
 const title=document.createElement('button'); title.className='asset-title'; title.textContent=asset.title || asset.name; title.onclick=()=>open(asset,title);
 const row=document.createElement('div'); row.className='card-meta'; const dimensions=document.createElement('span'); dimensions.textContent=`${asset.width} × ${asset.height}`;
 const star=document.createElement('button'); star.className='star'; star.textContent=favorites.has(asset.id)?'★':'☆'; star.setAttribute('aria-label',`Favorite ${asset.name}`); star.setAttribute('aria-pressed',String(favorites.has(asset.id))); star.onclick=()=>favorite(asset);
 row.append(dimensions,star); info.append(title,row); card.append(imageButton,info);
 if(asset.transparent) { const badge=document.createElement('span'); badge.className='badge'; badge.textContent='α'; card.append(badge); }
 if(asset.fileSize>=config.largeFileBytes) { const badge=document.createElement('span'); badge.className='large'; badge.textContent='LARGE FILE'; info.append(badge); }
 return card;
 });
 if($('#group').value==='none') {
  $('#grid').className='asset-grid'; $('#grid').replaceChildren(...cards);
 } else {
  $('#grid').className='';
  const cardMap=new Map(visible.slice(0,limit).map((a,i)=>[a.id,cards[i]]));
  const sections=groupAssets(visible.slice(0,limit)).map(group=>{
   const section=document.createElement('section');section.className='asset-group';
   const heading=document.createElement('h3');heading.textContent=group.title;
   const count=document.createElement('span');count.textContent=`${group.assets.length} SHOWN`;heading.append(count);
   const grid=document.createElement('div');grid.className='asset-grid';grid.append(...group.assets.map(a=>cardMap.get(a.id)));
   section.append(heading,grid);return section;
  });
  $('#grid').replaceChildren(...sections);
 }

}
function refresh() { limit=config.pageSize; render(); }
$('#search').addEventListener('input',refresh);
for(const id of ['sort','transparent','favorites','collection','group']) $('#'+id).addEventListener('change',refresh);
$('#more').onclick=()=> { limit+=config.pageSize; render(); };
$('#random').onclick=()=> { if(visible.length) open(visible[Math.floor(Math.random()*visible.length)]); };
$('#favorite').onclick=()=>favorite(selected);
$('.close').onclick=()=>$('#detail').close();
$('#detail').addEventListener('click',e=> { if(e.target===$('#detail')) { const rect=e.target.getBoundingClientRect(); if(e.clientX<rect.left || e.clientX>rect.right || e.clientY<rect.top || e.clientY>rect.bottom) e.target.close(); } });
$('#detail').addEventListener('close',()=>opener?.isConnected && opener.focus());
for(const button of document.querySelectorAll('[data-copy]')) button.onclick=async()=> {
 const text=snippet(selected,button.dataset.copy); $('#code').value=text;
 try { await navigator.clipboard.writeText(text); notify('Copied to clipboard'); } catch { $('#code').focus(); $('#code').select(); notify('Clipboard unavailable. Copy the selected code manually.'); }
};
document.addEventListener('keydown',event=> { if(event.key==='/' && !$('#detail').open && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) { event.preventDefault(); $('#search').focus(); } });
async function load() {
 try {
 const response=await fetch(localUrl('data/assets.json')); if(!response.ok) throw Error(`HTTP ${response.status}`);
 const data=await response.json(); if(!Array.isArray(data)) throw Error('Expected an assets array');
 assets=indexAssets(data); $('#total').textContent=assets.length;
 const sets=new Map(assets.map(a=>[a.collection || 'samples',a.collectionTitle || 'オリジナルサンプル']));
 for(const [value,title] of sets) {const option=document.createElement('option');option.value=value;option.textContent=title;$('#collection').append(option);}

 const categories=['all','animals','people','nature','objects','food','buildings','vehicles','effects','misc',...assets.map(a=>a.category)];
 $('#categories').replaceChildren(...[...new Set(categories)].map(name=> { const b=document.createElement('button'); b.textContent=name==='misc'?'OTHER':name.toUpperCase(); b.setAttribute('aria-pressed',String(name===category)); b.onclick=()=> { category=name; for(const el of $('#categories').children) el.setAttribute('aria-pressed',String(el===b)); refresh(); }; return b; })); render();
 } catch(error) { $('#count').textContent=`Unable to load assets: ${error.message}. Run npm run assets, then reload.`; $('#random').disabled=true; }
}
load();
