#!/usr/bin/env python3
"""Import a bounded, reproducible selection of openly licensed OpenMoji PNGs."""
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import zipfile

VERSION = '17.0.0'
COMMIT = 'f9fc506a3f913be9897ab0181d611d4c910a4104'
ARCHIVE = 'openmoji-618x618-color.zip'
DIGEST = '569628cc330a2c4ae2c38bbb2def190e08bb5fe4a76e657ea4bcc46bd2015d44'
REPO = 'https://github.com/hfg-gmuend/openmoji'
LICENSE_URL = 'https://creativecommons.org/licenses/by-sa/4.0/'
CORE_GROUPS = {'animals-nature', 'food-drink', 'objects', 'travel-places', 'activities', 'smileys-emotion'}
# Curated topic exclusions for a young-child learning/prize catalog; not an automated safety classifier.
EXCLUDE = re.compile(r'\b(gun|pistol|rifle|firearm|dagger|knife|bomb|coffin|headstone|funeral|skull|cigarette|smoking|beer|wine|cocktail|sake|champagne|tumbler|alcohol|love hotel|bottle with popping cork|clinking glasses|tropical drink|sex|booze|slot machine|casino|gambling|middle finger|poo|vomiting|nauseated|syringe|blood|razor|chains|axe|crossed swords|angry face with horns|smiling face with horns|ogre|goblin)\b', re.I)
CATEGORY_LABELS = {'animals':'動物','nature':'自然・植物','food':'食べ物','objects':'生活用品・道具','vehicles':'乗り物','buildings':'建物・場所','people':'表情・からだ','effects':'気持ち・お祝い'}


def category(item):
    group, sub = item['group'], item['subgroups']
    if group == 'animals-nature':
        return 'nature' if sub.startswith('plant-') else 'animals'
    if group == 'food-drink':
        return 'objects' if sub == 'dishware' else 'food'
    if group == 'travel-places':
        if sub.startswith('transport-'): return 'vehicles'
        if sub in ('sky-weather','place-geographic'): return 'nature'
        return 'objects' if sub == 'time' else 'buildings'
    if group == 'smileys-emotion':
        return 'animals' if sub in ('cat-face','monkey-face') else 'effects' if sub in ('heart','emotion') else 'people'
    if group == 'activities' and sub in ('event','award-medal'): return 'effects'
    return 'people' if group == 'people-body' else 'objects'


def select_items(data, limit):
    core, hands = [], []
    for item in sorted(data, key=lambda i: (int(i.get('order') or 0),i['hexcode'])):
        if item.get('skintone') or item.get('skintone_combination'): continue
        if EXCLUDE.search(' '.join([item['annotation'],item.get('tags',''),item.get('openmoji_tags','')])): continue
        if item['group'] in CORE_GROUPS: core.append(item)
        elif item['group'] == 'people-body' and (item['subgroups'].startswith('hand-') or item['subgroups'] in ('body-parts','person-activity','person-sport','person-role')):
            hands.append(item)
    candidates = core + hands
    if limit > len(candidates): raise ValueError(f'Only {len(candidates)} curated candidates available, requested {limit}')
    # Round-robin categories rather than taking the first Unicode block.
    groups = {}
    for item in candidates: groups.setdefault(category(item),[]).append(item)
    selected = []
    while len(selected) < limit:
        for entries in groups.values():
            if entries and len(selected) < limit: selected.append(entries.pop(0))
    return selected


def filename(item):
    slug = re.sub(r'[^a-z0-9]+','-',item['annotation'].lower()).strip('-')
    return f"{slug}-{item['hexcode'].lower()}.png"


def download(url, output):
    if output.exists(): return
    temporary = output.with_suffix(output.suffix + '.download')
    subprocess.run(['curl','--fail','--location','--silent','--show-error','--retry','2','--max-time','180',url,'-o',str(temporary)],check=True)
    temporary.replace(output)


def import_assets(root, cache, limit):
    cache.mkdir(parents=True,exist_ok=True)
    for name, url in [
        ('openmoji.json', f'https://raw.githubusercontent.com/hfg-gmuend/openmoji/{COMMIT}/data/openmoji.json'),
        ('LICENSE.txt', f'https://raw.githubusercontent.com/hfg-gmuend/openmoji/{COMMIT}/LICENSE.txt'),
        (ARCHIVE, f'{REPO}/releases/download/{VERSION}/{ARCHIVE}'),
    ]: download(url,cache/name)
    archive_bytes = (cache/ARCHIVE).read_bytes()
    archive_hash = hashlib.sha256(archive_bytes).hexdigest()
    if archive_hash != DIGEST: raise ValueError('Official archive SHA-256 mismatch. No images imported; remove the cache file and retry a trusted download.')
    selected = select_items(json.loads((cache/'openmoji.json').read_text()),limit)
    public = root/'public'
    catalog_path = public/'data/assets.json'
    catalog = json.loads(catalog_path.read_text()) if catalog_path.exists() else []
    old = {asset['file']: asset for asset in catalog}
    imported, ids, hashes = [], set(), set()
    # Stage all bytes and validate every destination before any repository write.
    with tempfile.TemporaryDirectory(prefix='pixvault-openmoji-') as stage:
        staging = Path(stage)
        with zipfile.ZipFile(cache/ARCHIVE) as archive:
            for item in selected:
                code = item['hexcode']
                if not re.fullmatch(r'[A-F0-9-]+',code): raise ValueError('Invalid source codepoint')
                rel = f"assets/{category(item)}/openmoji-color/{filename(item)}"
                data = archive.read(code+'.png')
                if not data.startswith(b'\x89PNG\r\n\x1a\n'): raise ValueError(f'Invalid PNG: {code}')
                source_hash = hashlib.sha256(data).hexdigest()
                if code in ids or source_hash in hashes: raise ValueError(f'Duplicate selected PNG: {code}')
                ids.add(code); hashes.add(source_hash)
                destination = public/rel
                if destination.exists() and hashlib.sha256(destination.read_bytes()).hexdigest() != source_hash:
                    raise ValueError(f'Existing file differs; refusing to overwrite: {rel}')
                stage_file = staging/rel
                stage_file.parent.mkdir(parents=True,exist_ok=True); stage_file.write_bytes(data)
                tags = [s.strip() for s in (item.get('tags','')+','+item.get('openmoji_tags','')).split(',') if s.strip()]
                prior = old.get(rel,{})
                imported.append({**prior,'id': prior.get('id',f'openmoji-{code.lower()}'),'name':Path(rel).stem,
                    'title':item['annotation'],'file':rel,'category':category(item),
                    'tags':list(dict.fromkeys([*prior.get('tags',[]),*tags,CATEGORY_LABELS[category(item)],'openmoji'])),
                    'collection':'openmoji-color','collectionTitle':'OpenMoji カラー','style':'outlined-color',
                    'source':f'{REPO}/blob/{COMMIT}/color/618x618/{code}.png',
                    'sourceVersion':VERSION,'sourceCommit':COMMIT,'sourceHash':source_hash,
                    'author':item.get('openmoji_author','OpenMoji contributors'),
                    'license':'CC-BY-SA-4.0','licenseUrl':LICENSE_URL,
                    'attribution':'OpenMoji – the open-source emoji and icon project. License: CC BY-SA 4.0.',
                    'sourceSubgroup':item['subgroups'],'description':prior.get('description',item['annotation']),
                    'aiTags':prior.get('aiTags',[]),
                    'createdAt':prior.get('createdAt',(item.get('openmoji_date') or '2025-01-01')+'T00:00:00Z')})
        for item in imported:
            dest=public/item['file']; dest.parent.mkdir(parents=True,exist_ok=True)
            if not dest.exists(): shutil.copyfile(staging/item['file'],dest)
    public.joinpath('licenses').mkdir(parents=True,exist_ok=True)
    shutil.copyfile(cache/'LICENSE.txt',public/'licenses/OpenMoji-CC-BY-SA-4.0.txt')
    public.joinpath('data/imports').mkdir(parents=True,exist_ok=True)
    # Keep earlier imports/user images; rerunning does not delete files or metadata.
    for item in imported: old[item['file']] = item
    catalog_path.parent.mkdir(parents=True,exist_ok=True)
    temporary=catalog_path.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(list(old.values()),ensure_ascii=False,indent=2)+'\n');temporary.replace(catalog_path)
    receipt={'collection':'openmoji-color','title':'OpenMoji カラー','version':VERSION,'commit':COMMIT,
        'archiveUrl':f'{REPO}/releases/download/{VERSION}/{ARCHIVE}','archiveSha256':DIGEST,
        'metadataSha256':hashlib.sha256((cache/'openmoji.json').read_bytes()).hexdigest(),
        'license':'CC-BY-SA-4.0','licenseUrl':LICENSE_URL,'count':len(imported),
        'categories':dict(Counter(a['category'] for a in imported)),
        'selectionPolicy':'Child-learning topics; excludes weapons, alcohol, smoking and listed topics. Not an automated safety classifier.',
        'files':[{'file':a['file'],'sourceHash':a['sourceHash']} for a in imported]}
    public.joinpath('data/imports/openmoji-17.0.0.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'imported':len(imported),'categories':receipt['categories'],'archiveSha256':DIGEST},ensure_ascii=False,indent=2))


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--limit',type=int,default=1000)
    parser.add_argument('--cache',type=Path,default=Path('.asset-cache/openmoji'))
    args=parser.parse_args()
    if args.limit < 1: parser.error('--limit must be positive')
    import_assets(Path(__file__).resolve().parents[1],args.cache.resolve(),args.limit)
