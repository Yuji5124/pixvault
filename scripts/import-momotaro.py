#!/usr/bin/env python3
"""Import a fixed-count CC0 native-PNG component library for Momotaro video work."""
import argparse
from collections import Counter
import csv
import hashlib
import io
import json
from pathlib import Path
import re
import struct
import shutil
import subprocess
import zipfile
from urllib.parse import quote

COMMIT='3694c6879e487c108f55677be7dd2ca75b07cc3b'
LICENSE_COMMIT='fc2cd355a8e7c1d8e625fd650abf64f50a1fddaa'
LICENSE_BLOB='1b43e9867edbaf2eeb116e1c1e018fcc32793e7a'
REPO='https://github.com/shorepine/kenney'
LICENSE_REPO='https://github.com/eturner58/game-assets'
LICENSE_URL='https://creativecommons.org/publicdomain/zero/1.0/'
# The source set is deliberately 2D cartoon/fantasy/nature. No sci-fi, vehicles,
# licensed third-party packs, previews, atlases, fonts or arbitrary file slicing.
PACKS={
 'Toon Characters','Animal Pack Remastered','Animal Pack','Background Elements Remastered',
 'Background Elements','Foliage Sprites','Foliage Pack','New Platformer Pack',
 'Platformer Pack Remastered','Platformer Assets Base','Platformer Assets Tile Extensions',
 'Platformer Pack Medieval','Isometric Medieval Town','RTS Medieval','Character Pack',
 'Character Pack Facial Hair','Shape Characters','Monster Builder Pack','Platformer Characters 1',
 'Generic Items','Particle Pack','Smoke Particles','Explosion Pack','Map Pack','Cartography Pack',
 'Isometric Nature','Isometric Tiles Base','Pirate Pack','Platformer Pack Nautical',
 'Isometric Watercraft','Fish Pack','Googly Eyes','Platformer Assets Extra Animations & Enemies',
 'Platformer Assets Buildings','Platformer Assets Requests','Platformer Assets Mushroom','Rune Pack',
}
KIND_LABELS={'character':'人物・キャラクター','character-part':'身体パーツ','animation-frame':'アニメ用ポーズ',
 'animal':'動物','background':'背景','background-part':'背景パーツ','prop':'小道具','effect':'演出・エフェクト','tile':'地形・組み立てパーツ'}
ROLE_WORDS={'dog':'犬','monkey':'猿','pheasant':'キジ','peach':'桃','demon':'鬼','ogre':'鬼','oni':'鬼',
 'sword':'刀','boat':'船','ship':'船','tree':'木','forest':'森','river':'川','mountain':'山','cloud':'雲',
 'castle':'城','house':'家','village':'村','island':'島','treasure':'宝物','chest':'宝箱','fire':'火','smoke':'煙',
 'sun':'太陽','moon':'月','rock':'岩','grass':'草','water':'水','fish':'魚','bird':'鳥','flower':'花'}


def slug(value): return re.sub(r'[^a-z0-9]+','-',value.lower()).strip('-')


def merge_tags(previous,additional):
    result=[];seen=set()
    for tag in [*previous,*additional]:
        key=tag.casefold()
        if key not in seen:result.append(tag);seen.add(key)
    return result


def canonical_source(path):
    # Keep only the highest-resolution source when the same pose has HD/Retina
    # and standard variants. Never upscale or create flipped/colour copies.
    parts=[]
    for component in path.lower().split('/'):
        if component in {'retina','normal','standard','normal size','default','default size','double'}:continue
        parts.append(re.sub(r'\s+hd$','',component))
    return '/'.join(parts)


def classify(path):
    p=path.lower(); pack=path.split('/')[1]
    if pack in {'Particle Pack','Smoke Particles','Explosion Pack','Rune Pack'}:return 'effect','effects'
    if pack in {'Animal Pack','Animal Pack Remastered','Fish Pack'}:return 'animal','animals'
    if pack=='Character Pack' and '/face/completes/' in p:return 'character','characters'
    if pack in {'Monster Builder Pack','Character Pack','Character Pack Facial Hair','Shape Characters'}:return 'character-part','characters'
    if pack=='RTS Medieval' and 'unit' in Path(path).stem.lower():return 'character','characters'
    if '/poses' in p or re.search(r'(walk|jump|attack|idle|run|swim)\d',p):return 'animation-frame','characters'
    if any(x in p for x in ['/parts','/limbs','/face/','/head/','facial hair','/body/']) or pack=='Googly Eyes':return 'character-part','characters'
    if pack in {'Toon Characters','Character Pack','Shape Characters','Monster Builder Pack','Platformer Characters 1'}:return 'character','characters'
    if '/backgrounds/' in p and '/elements/' not in p:return 'background','backgrounds'
    if pack in {'Background Elements','Background Elements Remastered','Foliage Pack','Foliage Sprites','Isometric Nature'}:return 'background-part','backgrounds'
    if re.search(r'(sword|shield|chest|coin|key|torch|flag|bucket|barrel|rope|ladder|crate)',p) or pack=='Generic Items':return 'prop','props'
    if pack in {'Isometric Watercraft','Pirate Pack'} and re.search(r'(ship|boat|sail|raft)',p):return 'prop','props'
    if re.search(r'(fire|smoke|spark|explosion|particle|flame)',p):return 'effect','effects'
    return 'tile','tiles'


def style(pack):
    if 'Isometric' in pack or pack=='RTS Medieval':return 'isometric-cartoon'
    if pack in {'Particle Pack','Smoke Particles','Explosion Pack'}:return 'effects'
    if 'Character' in pack or pack=='Monster Builder Pack':return 'cartoon-character'
    return 'flat-cartoon'


def story_roles(source):
    tokenized=re.sub(r'(?<=[a-z])(?=[A-Z])',' ',source)
    words=set(re.split(r'[^a-z]+',tokenized.lower()))
    return list(dict.fromkeys(label for word,label in ROLE_WORDS.items() if word in words))


def animation_info(source,kind):
    if kind!='animation-frame':return '',None
    stem=Path(source).stem
    match=re.match(r'^(.*?)(\d+)$',stem)
    pose=match[1] if match else stem
    return f'{slug(source.split("/")[1])}/{pose}',int(match[2]) if match else 0


def resolution_prefix(w,h):
    longest=max(w,h)
    return '01-4k' if longest>=3840 else '02-2k' if longest>=2048 else '03-1k' if longest>=1024 else '04-512' if longest>=512 else '05-256' if longest>=256 else '06-small'


def candidates(rows,licenses):
    selected=[]
    for row in rows:
        source=row['path'];parts=source.split('/')
        if len(parts)<3 or parts[0]!='2d' or parts[1] not in PACKS:continue
        pack=parts[1];license=licenses.get(pack,{})
        text=license.get('license','')
        if 'CC0' not in text or 'not mandatory' not in text.lower() and 'not a requirement' not in text.lower():continue
        w,h=map(int,row['size'].split('x'))
        if max(w,h)<64:continue
        if any(x in source.lower() for x in ['black background','/rotated/','preview','instruction','example','sample','overview','spritesheet','tilemap','/double/']):continue
        selected.append({**row,'width':w,'height':h})
    return sorted(selected,key=lambda r:(-r['width']*r['height'],-max(r['width'],r['height']),r['path']))


def download(url,output):
    if output.exists():return
    tmp=output.with_suffix(output.suffix+'.download')
    subprocess.run(['curl','--fail','--location','--silent','--show-error','--retry','2','--max-time','180',url,'-o',str(tmp)],check=True)
    tmp.replace(output)


def import_assets(root,cache,limit):
    cache.mkdir(parents=True,exist_ok=True)
    sources={
        'index.tsv':f'https://raw.githubusercontent.com/shorepine/kenney/{COMMIT}/index.tsv',
        'packs.json':f'https://raw.githubusercontent.com/eturner58/game-assets/{LICENSE_COMMIT}/catalog/packs.json',
        'tree.json':f'https://api.github.com/repos/shorepine/kenney/git/trees/{COMMIT}?recursive=1',
        'kenney-3694c687.zip':f'https://codeload.github.com/shorepine/kenney/zip/{COMMIT}',
    }
    for name,url in sources.items():download(url,cache/name)
    tree=json.loads((cache/'tree.json').read_text())
    if tree.get('truncated'):raise ValueError('Incomplete source tree; cannot verify the archive')
    blobs={entry['path']:entry['sha'] for entry in tree['tree'] if entry['type']=='blob'}
    index_bytes=(cache/'index.tsv').read_bytes()
    if hashlib.sha1(f'blob {len(index_bytes)}\0'.encode()+index_bytes).hexdigest()!=blobs['index.tsv']:raise ValueError('Source index does not match pinned Git blob')
    license_bytes=(cache/'packs.json').read_bytes()
    if hashlib.sha1(f'blob {len(license_bytes)}\0'.encode()+license_bytes).hexdigest()!=LICENSE_BLOB:raise ValueError('License metadata does not match the pinned Git blob')
    packs=json.loads(license_bytes)
    licenses={p['pack']:p for p in packs if p['section']=='2D assets' and p.get('library')=='kenney'}
    rows=candidates(csv.DictReader(io.StringIO(index_bytes.decode()),delimiter='\t'),licenses)
    public=root/'public';catalog_path=public/'data/assets.json'
    catalog=json.loads(catalog_path.read_text()) if catalog_path.exists() else []
    existing={a['file']:a for a in catalog};existing_source={a.get('sourcePath'):a for a in catalog if a.get('project')=='momotaro'};hashes={a['hash'] for a in catalog if a.get('hash') and a.get('project')!='momotaro'}
    canonical=set();selected=[];skipped=Counter();native_sizes=Counter()
    with zipfile.ZipFile(cache/'kenney-3694c687.zip') as archive:
        prefix=f'kenney-{COMMIT}/'
        for row in rows:
            source=row['path'];key=canonical_source(source)
            if key in canonical:skipped['lower-resolution-variant']+=1;continue
            data=archive.read(prefix+source)
            blob=hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest()
            if blob!=blobs.get(source):raise ValueError(f'Source Git blob mismatch: {source}')
            if data[:8]!=b'\x89PNG\r\n\x1a\n':raise ValueError(f'Not PNG: {source}')
            w,h=struct.unpack('>II',data[16:24])
            if (w,h)!=(row['width'],row['height']):raise ValueError(f'Source dimensions mismatch: {source}')
            digest=hashlib.sha256(data).hexdigest()
            if digest in hashes:skipped['identical-bytes']+=1;continue
            canonical.add(key);hashes.add(digest)
            pack=source.split('/')[1];kind,category=classify(source);pack_slug=slug(pack)
            source_id=hashlib.sha256(source.encode()).hexdigest()[:10]
            name=f'{resolution_prefix(w,h)}_{kind}_{pack_slug}_{slug(Path(source).stem)}_{w}x{h}_{source_id}'
            relative=f'assets/{category}/momotaro/kenney-{pack_slug}/{name}.png'
            previous=existing.get(relative,existing_source.get(source,{}))
            title=re.sub(r'(?<=[a-z])(?=[A-Z])',' ',Path(source).stem).replace('_',' ')
            title=re.sub(r'\s+',' ',title).strip()
            roles=story_roles(source)
            tags=merge_tags(previous.get('tags',[]),['momotaro','桃太郎','CC0','出典表示不要',KIND_LABELS[kind],*roles])
            animation_group,frame_index=animation_info(source,kind)
            entry={**previous,'id':previous.get('id',f'momotaro-kenney-{source_id}'),'name':name,
                'title':f'{KIND_LABELS[kind]} / {title} [{w}×{h}]','file':relative,
                'category':category,'kind':kind,'project':'momotaro','projectTitle':'桃太郎動画用・CC0素材',
                'collection':f'momotaro-kenney-{pack_slug}','collectionTitle':f'Kenney · {pack}',
                'style':style(pack),'tags':tags,'storyRoles':roles,'animationGroup':animation_group,
                'frameIndex':frame_index,
                'source':f'{REPO}/blob/{COMMIT}/'+('/'.join(quote(p,safe='') for p in source.split('/'))),
                'sourcePath':source,'sourceCommit':COMMIT,'sourceHash':digest,'sourceBlob':blob,
                'sourceWidth':w,'sourceHeight':h,'upscaled':False,'author':'Kenney','license':'CC0-1.0',
                'licenseUrl':LICENSE_URL,'attributionRequired':False,
                'licenseEvidence':f'{LICENSE_REPO}/blob/{LICENSE_COMMIT}/catalog/packs.json',
                'description':previous.get('description',f'{pack} / {source}. 汎用の動画構成素材。桃太郎専用の描き下ろしではありません。'),
                'aiTags':previous.get('aiTags',[])}
            if previous.get('thumbnail'):
                entry['thumbnail']='thumbnails/'+relative.removeprefix('assets/')+'.webp'
            dest=public/relative
            if dest.exists() and hashlib.sha256(dest.read_bytes()).hexdigest()!=digest:raise ValueError(f'Existing file differs: {relative}')
            selected.append((entry,data,licenses[pack]));native_sizes[resolution_prefix(w,h)]+=1
            if len(selected)==limit:break
    if len(selected)<limit:raise ValueError(f'Only {len(selected)} unique suitable native PNGs found; requested {limit}. No images written.')
    for entry,data,license in selected:
        destination=public/entry['file'];destination.parent.mkdir(parents=True,exist_ok=True)
        if not destination.exists():destination.write_bytes(data)
        previous=existing_source.get(entry['sourcePath'],{})
        if entry.get('thumbnail') and previous.get('thumbnail') and entry['thumbnail']!=previous['thumbnail']:
            thumbnail=public/entry['thumbnail'];thumbnail.parent.mkdir(parents=True,exist_ok=True)
            if not thumbnail.exists():shutil.copyfile(public/previous['thumbnail'],thumbnail)
        existing[entry['file']]=entry
        license_file=public/'licenses/kenney'/f"{slug(license['pack'])}-CC0.txt"
        license_file.parent.mkdir(parents=True,exist_ok=True);license_file.write_text(license['license']+'\n')
    temporary=catalog_path.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(list(existing.values()),ensure_ascii=False,indent=2)+'\n');temporary.replace(catalog_path)
    receipt={'project':'momotaro','count':len(selected),'sourceRepository':REPO,'sourceCommit':COMMIT,
        'licenseRepository':LICENSE_REPO,'licenseCommit':LICENSE_COMMIT,'archiveSha256':hashlib.sha256((cache/'kenney-3694c687.zip').read_bytes()).hexdigest(),
        'licenseMetadataSha256':hashlib.sha256((cache/'packs.json').read_bytes()).hexdigest(),
        'license':'CC0-1.0','attributionRequired':False,'resizedOriginals':False,
        'selection':'Curated 2D cartoon/fantasy/nature packs; highest native area first; exact-byte and HD/Retina scale variants removed.',
        'kinds':dict(Counter(a['kind'] for a,_,_ in selected)),'resolutionTiers':dict(native_sizes),'skipped':dict(skipped),
        'packs':dict(Counter(a['collectionTitle'] for a,_,_ in selected)),
        'files':[{'file':a['file'],'sourcePath':a['sourcePath'],'sha256':a['sourceHash'],'gitBlob':a['sourceBlob']} for a,_,_ in selected]}
    receipt_path=public/'data/imports/momotaro-kenney.json';receipt_path.parent.mkdir(parents=True,exist_ok=True)
    receipt_path.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:receipt[k] for k in ['count','kinds','resolutionTiers','skipped']},ensure_ascii=False,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--limit',type=int,default=5000);parser.add_argument('--cache',type=Path,default=Path('.asset-cache/kenney'))
    args=parser.parse_args()
    if args.limit<1:parser.error('--limit must be positive')
    import_assets(Path(__file__).resolve().parents[1],args.cache.resolve(),args.limit)
