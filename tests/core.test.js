import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, copyFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { buildAssets } from '../scripts/build-assets.js';
import { generateTags } from '../scripts/generate-tags.js';
import { indexAssets, filterAssets, sortAssets } from '../src/search.js';
import { snippet } from '../src/snippets.js';
test('filename tags split CamelCase, separators and duplicate manual tags',()=> {
 assert.deepEqual(generateTags('animals/CuteWhiteCat-red.png',['cat','WHITE']),['animals','cute','white','cat','red']);
});
test('AND search covers names, tags, descriptions; filters and sort compose',()=> {
 const assets=indexAssets([{id:'1',name:'cat',file:'assets/cat.png',category:'animals',tags:['cute'],description:'Tokyo',transparent:true,width:20,height:10},{id:'2',name:'tree',file:'assets/tree.png',category:'nature',tags:['green'],transparent:false,width:30,height:40}]);
 assert.equal(filterAssets(assets,{query:'cute Tokyo'}).length,1);
 assert.equal(filterAssets(assets,{query:'cat green'}).length,0);
 assert.equal(filterAssets(assets,{transparent:true,favoritesOnly:true,favorites:new Set(['1'])}).length,1);
 assert.equal(filterAssets(assets,{category:'food'}).length,0);
 assert.equal(sortAssets(assets,'width')[0].id,'2');
 assert.equal(sortAssets(assets,'height')[0].id,'2');
 assert.equal(sortAssets(assets,'random').length,2);
});
test('snippets encode URL paths and safely quote names',()=> {
 const a={file:'assets/animals/cat #1.png',name:'cat "1"',width:20,height:10};
 assert.match(snippet(a,'url'),/cat%20%231.png$/);
 assert.match(snippet(a,'html'),/cat &quot;1&quot;/);
 assert.match(snippet(a,'three'),/PlaneGeometry\(2, 1\)/);
 assert.match(snippet(a,'sprite'),/SpriteMaterial/);
 assert.match(snippet(a,'phaser'),/this.add.image/);
});
test('scanner reads actual alpha, generates thumbnails, detects duplicates and preserves metadata',async()=> {
 const dir=await mkdtemp(path.join(os.tmpdir(),'pixvault-test-'));
 try {
 await mkdir(path.join(dir,'assets/animals'),{recursive:true});
 await sharp({create:{width:20,height:10,channels:4,background:{r:255,g:0,b:0,alpha:0}}}).png().toFile(path.join(dir,'assets/animals/CuteCat.png'));
 await sharp({create:{width:30,height:15,channels:4,background:{r:0,g:255,b:0,alpha:1}}}).png().toFile(path.join(dir,'assets/opaque.png'));
 await copyFile(path.join(dir,'assets/opaque.png'),path.join(dir,'assets/duplicate.png'));
 let warnings=[]; const warn=console.warn; console.warn=s=>warnings.push(s);
 let rows; try {rows=await buildAssets(dir);} finally {console.warn=warn;}
 assert.equal(rows.length,3); assert.equal(warnings.length,1);
 const cat=rows.find(a=>a.category==='animals');
 assert.equal(cat.transparent,true); assert.equal(cat.width,20); assert.equal(cat.height,10);
 assert.equal(rows.find(a=>a.name==='opaque').transparent,false);
 assert.equal((await sharp(path.join(dir,cat.thumbnail)).metadata()).format,'webp');
 assert.equal(cat.hash.length,64);
 cat.tags.push('manual'); cat.description='Custom caption'; cat.license='CC0';
 await writeFile(path.join(dir,'data/assets.json'),JSON.stringify(rows));
 const again=await buildAssets(dir); const updated=again.find(a=>a.id===cat.id);
 assert.ok(updated.tags.includes('manual')); assert.equal(updated.license,'CC0'); assert.equal(updated.description,'Custom caption'); assert.equal(updated.createdAt,cat.createdAt);
 await rm(path.join(dir,'assets/duplicate.png')); assert.equal((await buildAssets(dir)).length,2);
 assert.equal(JSON.parse(await readFile(path.join(dir,'data/assets.json'),'utf8')).length,2);
 } finally {await rm(dir,{recursive:true,force:true});}
});
test('invalid PNG fails without replacing the previous catalog',async()=> {
 const dir=await mkdtemp(path.join(os.tmpdir(),'pixvault-invalid-'));
 try {
 await mkdir(path.join(dir,'assets'),{recursive:true}); await mkdir(path.join(dir,'data'),{recursive:true});
 const original='[{"id":"keep","file":"assets/old.png"}]\n';
 await writeFile(path.join(dir,'data/assets.json'),original);
 await writeFile(path.join(dir,'assets/broken.png'),'not a PNG');
 await assert.rejects(buildAssets(dir));
 assert.equal(await readFile(path.join(dir,'data/assets.json'),'utf8'),original);
 }finally {await rm(dir,{recursive:true,force:true});}
});
