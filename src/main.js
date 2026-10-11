import './style.css';
import {projectTypes,resolveProjects,projectAssets} from './projects.js';
import {kindLabels,resolutionLabel,nativeDimensions} from './quality.js';
import { groupAssets } from './collections.js';
import { config } from './config.js';
import { indexAssets, filterAssets, sortAssets } from './search.js';
import { snippet, encodePath } from './snippets.js';
const app = document.querySelector('#app');
app.innerHTML = `<header><div class="brand"><span class="logo">▧</span><div><h1>PIXVAULT<span> / 01</span></h1><p>2D ASSET SERVER</p></div></div><div class="header-actions"><span class="mode">● FREE MODE</span><button id="random">⚄ RANDOM ASSET</button></div></header><main><section class="intro"><div><p class="eyebrow">YOUR CREATIVE INVENTORY</p><h2>A home for every pixel.</h2><p id="intro-description" class="muted">Find it. Copy it. Build something.</p></div><div class="total"><strong id="total">—</strong><span>ASSETS IN VAULT</span></div></section><section class="tools"><label class="search"><span>⌕</span><input id="search" type="search" placeholder="Search assets, tags, or a little inspiration…" aria-label="Search assets"><kbd>/</kbd></label><label class="sort-label">PROJECT <select id="project"><option value="all">すべて</option></select></label><label class="sort-label">PROJECT TYPE <select id="project-type"><option value="all">すべての種類</option></select></label><label class="sort-label">PROJECT STATUS <select id="project-status"><option value="active">Project</option><option value="archived">Project Archive</option><option value="all">すべて</option><option value="unassigned">Project 未設定</option></select></label><label class="sort-label">TYPE <select id="kind"><option value="all">すべての種別</option></select></label><label class="sort-label">RESOLUTION <select id="resolution"><option value="0">すべての解像度</option><option value="256">長辺256px以上</option><option value="512">長辺512px以上</option><option value="1024">長辺1024px以上</option><option value="2048">長辺2048px以上</option></select></label><label class="sort-label">SET <select id="collection"><option value="all">All sets</option></select></label><label class="sort-label">GROUP <select id="group"><option value="collection">カテゴリ＋タッチ</option><option value="none">グループなし</option></select></label><label class="sort-label">SORT BY <select id="sort"><option value="quality" selected>高解像度順</option><option value="name">Name</option><option value="newest">Newest</option><option value="width">Width</option><option value="height">Height</option><option value="random">Random</option></select></label></section><details id="project-manager"><summary>Project 管理（名称・種類・アーカイブ・削除）</summary><p class="muted">変更・削除はこのブラウザに保存します。削除した Project の画像は一覧から非表示になります。元の PNG ファイルは残り、復元できます。</p><form id="new-project"><input id="new-project-name" maxlength="100" placeholder="新しい Project 名" aria-label="新しい Project 名" required><button>Project を追加</button></form><div id="project-list"></div><button id="export-projects">設定を JSON で保存</button><p class="muted">全端末で共有するには、保存した JSON で public/data/projects.json を更新して公開してください。</p></details><nav id="categories" aria-label="Asset categories"></nav><section class="filterbar"><span id="count" role="status">Loading assets…</span><div><label><input id="attribution-free" type="checkbox" checked> 出典表示不要（CC0）</label><label><input id="transparent" type="checkbox"> Transparent only</label><label><input id="favorites" type="checkbox"> ☆ Favorites</label></div></section><section id="grid" aria-label="Assets"></section><p id="empty" hidden>No assets match. Try another search or clear the filters.</p><button id="more" hidden>LOAD MORE</button><footer><span>PIXVAULT v1.0 · Local-first. Yours to build with.</span><a id="json-link">OPEN ASSETS.JSON ↗</a></footer></main><dialog id="detail"><button class="close" aria-label="Close asset details">✕</button><div class="detail-layout"><div class="detail-image checker"><img id="original" alt=""></div><div class="detail-info"><p class="eyebrow" id="detail-category"></p><h2 id="detail-name"></h2><p id="metadata"></p><p id="description"></p><div id="provenance"><p id="credit"></p><a id="source-link" target="_blank" rel="noopener noreferrer">SOURCE ↗</a> · <a id="license-link" target="_blank" rel="noopener noreferrer">LICENSE ↗</a><button data-copy="attribution">COPY CREDIT</button></div><p class="eyebrow">TAGS</p><div id="tags"></div><button id="favorite">☆ FAVORITE</button><div class="copy-grid"><button data-copy="url">COPY URL</button><button data-copy="path">COPY PATH</button><button data-copy="html">COPY HTML</button><button data-copy="three">COPY THREE.JS</button><button data-copy="sprite">COPY SPRITE</button><button data-copy="phaser">COPY PHASER</button></div><a id="download" class="button" download>↓ DOWNLOAD ORIGINAL PNG</a><textarea id="code" readonly aria-label="Integration code"></textarea></div></div></dialog><div id="toast" role="status"></div>`;
const $ = s => document.querySelector(s);
const base = import.meta.env.BASE_URL;
const localUrl = p => base + encodePath(p);
const catalogUrl = `${localUrl('data/assets.json')}?v=${import.meta.env.VITE_CATALOG_VERSION}`;
$('#json-link').href = catalogUrl;
let assets = [], visible = [], category = 'all', limit = config.pageSize, selected, opener;
let registry=[], projects=[], projectOverrides={};
try {projectOverrides=JSON.parse(localStorage.getItem('pixvault.projects') || '{}') || {};} catch {}
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
 $('#detail-category').textContent=[asset.category,asset.projectTitle ? `Project: ${asset.projectTitle}` : 'Project 未設定'].join(' · '); $('#detail-name').textContent=asset.title || asset.name;
 $('#metadata').textContent=`${asset.width} × ${asset.height} · PNG · ${(asset.fileSize/1024).toFixed(1)} KB · Transparent ${asset.transparent?'✓ YES':'× NO'}${asset.fileSize >= config.largeFileBytes?' · LARGE FILE':''}`;
 const native=nativeDimensions(asset);
 $('#description').textContent=[asset.description || '',asset.kind ? `種別: ${kindLabels[asset.kind] || asset.kind}` : '',`解像度目安: ${resolutionLabel(asset)}（元画像 ${native.width}×${native.height}）`,asset.animationGroup ? `アニメグループ: ${asset.animationGroup} / フレーム ${asset.frameIndex}` : '',asset.storyRoles?.length ? `物語の題材: ${asset.storyRoles.join('・')}` : ''].filter(Boolean).join(' / ');

 $('#credit').textContent=[asset.collectionTitle,asset.author,asset.license,asset.attributionRequired===false || asset.license==='CC0-1.0' ? '出典表示不要' : ''].filter(Boolean).join(' · ');
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
 $('#intro-description').textContent=$('#project').value==='momotaro' ? '動画に組み合わせて使うCC0の汎用素材。桃太郎専用のキャラクターセットではありません。' : 'Find it. Copy it. Build something.';
 visible=sortAssets(filterAssets(indexAssets(projectAssets(assets,projects,{type:$('#project-type').value,status:$('#project-status').value})),{query:$('#search').value,category,collection:$('#collection').value,project:$('#project').value,kind:$('#kind').value,minResolution:$('#resolution').value,attributionFree:$('#attribution-free').checked,transparent:$('#transparent').checked,favoritesOnly:$('#favorites').checked,favorites}),$('#sort').value);
 $('#count').textContent=`${visible.length} / ${assets.length} ASSETS`;
 $('#empty').hidden=visible.length!==0; $('#more').hidden=visible.length<=limit;
 $('#random').disabled=visible.length===0;
 const cards=visible.slice(0,limit).map(asset=> {
 const card=document.createElement('article'); card.className='asset-card';
 const imageButton=document.createElement('button'); imageButton.className='image-button checker'; imageButton.setAttribute('aria-label',`Open ${asset.title || asset.name}`);
 const image=document.createElement('img'); image.src=localUrl(asset.thumbnail); image.alt=asset.title || asset.name; image.loading='lazy'; image.width=256; image.height=256; imageButton.append(image); imageButton.onclick=()=>open(asset,imageButton);
 const info=document.createElement('div'); info.className='card-info';
 const title=document.createElement('button'); title.className='asset-title'; title.textContent=asset.title || asset.name; title.onclick=()=>open(asset,title);
 const row=document.createElement('div'); row.className='card-meta'; const dimensions=document.createElement('span'); dimensions.textContent=`${resolutionLabel(asset)} · ${asset.width} × ${asset.height}`;
 const star=document.createElement('button'); star.className='star'; star.textContent=favorites.has(asset.id)?'★':'☆'; star.setAttribute('aria-label',`Favorite ${asset.name}`); star.setAttribute('aria-pressed',String(favorites.has(asset.id))); star.onclick=()=>favorite(asset);
 row.append(dimensions,star); info.append(title); if(asset.project) {const label=document.createElement('p');label.className='project-label';label.textContent=`Project · ${asset.projectTitle || asset.project}`;info.append(label);} info.append(row); card.append(imageButton,info);
 if(asset.transparent) { const badge=document.createElement('span'); badge.className='badge'; badge.textContent='α'; card.append(badge); }
 if(asset.fileSize>=config.largeFileBytes) { const badge=document.createElement('span'); badge.className='large'; badge.textContent='LARGE FILE'; info.append(badge); }
 return card;
 });
 if($('#group').value==='none') {
  $('#grid').className='asset-grid'; $('#grid').replaceChildren(...cards);
 } else {
  $('#grid').className='';
  const cardMap=new Map(visible.slice(0,limit).map((a,i)=>[a.id,cards[i]]));
  const sections=groupAssets(visible.slice(0,limit),$('#sort').value).map(group=>{
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
for(const id of ['sort','transparent','favorites','collection','group','project','kind','resolution','attribution-free','project-type','project-status']) $('#'+id).addEventListener('change',refresh);
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
function updateProjects() {
 projects=resolveProjects(assets,registry,projectOverrides);
 const previous=$('#project').value;
 $('#project').replaceChildren(new Option('すべて','all'));
 for(const p of projects.filter(p=>!p.deleted)) $('#project').add(new Option(`${p.name}${p.status==='archived'?' · Archive':''}`,p.id));
 $('#project').value=projects.some(p=>p.id===previous && !p.deleted)?previous:'all';
 $('#project-list').replaceChildren(...projects.map(p=> {
  const row=document.createElement('div');row.className='project-row';
  const name=document.createElement('input');name.value=p.name;name.maxLength=100;name.setAttribute('aria-label',`${p.id} Project 名`);name.disabled=!!p.deleted;
  const type=document.createElement('select');type.setAttribute('aria-label',`${p.id} Project の種類`);for(const [id,label] of Object.entries(projectTypes)) type.add(new Option(label,id));type.value=p.type;type.disabled=!!p.deleted;
  const count=document.createElement('span');count.textContent=`${assets.filter(a=>a.project===p.id).length} 枚`;
  const save=document.createElement('button');save.textContent='名称・種類を保存';save.disabled=!!p.deleted;save.onclick=()=>{if(!name.value.trim()) return notify('Project 名を入力してください');saveProject(p,{name:name.value.trim(),type:type.value});};
  const archive=document.createElement('button');archive.textContent=p.status==='archived'?'Project に戻す':'Project Archive に移す';archive.disabled=!!p.deleted;archive.onclick=()=>saveProject(p,{status:p.status==='archived'?'active':'archived'});
  const remove=document.createElement('button');remove.textContent=p.deleted?'復元':'一覧から削除';remove.onclick=()=>saveProject(p,{deleted:!p.deleted});
  row.append(name,type,count,save,archive,remove);return row;
 }));
}
function saveProject(p,change) {
 projectOverrides[p.id]={...projectOverrides[p.id],...change};
 try {localStorage.setItem('pixvault.projects',JSON.stringify(projectOverrides));} catch {notify('ブラウザに保存できません。このセッションのみ反映します。');}
 updateProjects(); refresh();
}
$('#new-project').onsubmit=e=>{e.preventDefault();const name=$('#new-project-name').value.trim();if(name){saveProject({id:crypto.randomUUID()},{name,type:'other',status:'active'});$('#new-project-name').value='';}};
$('#export-projects').onclick=()=> {
 const url=URL.createObjectURL(new Blob([JSON.stringify(projects,null,2)+'\n'],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download='projects.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
async function load() {
 try {
 const response=await fetch(catalogUrl, { cache: 'no-cache' }); if(!response.ok) throw Error(`HTTP ${response.status}`);
 const data=await response.json(); if(!Array.isArray(data)) throw Error('Expected an assets array');
 assets=indexAssets(data); $('#total').textContent=assets.length;
 for(const kind of [...new Set(assets.map(a=>a.kind || 'image'))]) {const option=document.createElement('option');option.value=kind;option.textContent=kindLabels[kind] || kind;$('#kind').append(option);}
 registry=await (await fetch(`${localUrl('data/projects.json')}?v=${import.meta.env.VITE_CATALOG_VERSION}`,{cache:'no-cache'})).json();
 if(!Array.isArray(registry)) throw Error('Expected a projects array');
 for(const [value,title] of Object.entries(projectTypes)) $('#project-type').add(new Option(title,value));
 updateProjects();
 if(projects.some(p=>p.id==='momotaro' && !p.deleted)) $('#project').value='momotaro';

 const sets=new Map(assets.map(a=>[a.collection || 'samples',a.collectionTitle || 'オリジナルサンプル']));
 for(const [value,title] of sets) {const option=document.createElement('option');option.value=value;option.textContent=title;$('#collection').append(option);}

 const categories=['all','animals','people','nature','objects','food','buildings','vehicles','effects','misc',...assets.map(a=>a.category)];
 $('#categories').replaceChildren(...[...new Set(categories)].map(name=> { const b=document.createElement('button'); b.textContent=name==='misc'?'OTHER':name.toUpperCase(); b.setAttribute('aria-pressed',String(name===category)); b.onclick=()=> { category=name; for(const el of $('#categories').children) el.setAttribute('aria-pressed',String(el===b)); refresh(); }; return b; })); render();
 } catch(error) { $('#count').textContent=`Unable to load assets: ${error.message}. Run npm run assets, then reload.`; $('#random').disabled=true; }
}
load();
