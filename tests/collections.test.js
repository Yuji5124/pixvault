import test from 'node:test';
import assert from 'node:assert/strict';
import { groupAssets } from '../src/collections.js';
import { indexAssets, filterAssets } from '../src/search.js';
import { snippet } from '../src/snippets.js';
test('groups keep category and visual series separate and preserve sort order',()=>{
 const animals=[{id:'1',category:'animals',collection:'openmoji-color',collectionTitle:'OpenMoji カラー'}, {id:'2',category:'animals'}, {id:'3',category:'food',collection:'openmoji-color',collectionTitle:'OpenMoji カラー'}, {id:'4',category:'animals',collection:'openmoji-color',collectionTitle:'OpenMoji カラー'}];
 const groups=groupAssets(animals);
 assert.equal(groups.length,3);
 const group=groups.find(g=>g.key==='animals:openmoji-color');
 assert.equal(group.title,'動物 · OpenMoji カラー');assert.deepEqual(group.assets.map(a=>a.id),['1','4']);
});
test('title/series search, series filter and credit export',()=>{
 const asset={id:'1',name:'cat-1f408',title:'cat',file:'assets/animals/openmoji-color/cat.png',category:'animals',collection:'openmoji-color',collectionTitle:'OpenMoji カラー',tags:['動物'],author:'Artist',license:'CC-BY-SA-4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',source:'https://openmoji.org/'};
 const data=indexAssets([asset,{id:'2',name:'sample',file:'assets/sample.png',category:'animals',tags:[]}]);
 assert.equal(filterAssets(data,{query:'動物 openmoji',collection:'openmoji-color'}).length,1);
 assert.equal(filterAssets(data,{collection:'samples'}).length,1);
 assert.match(snippet(asset,'attribution'),/Artist/);assert.match(snippet(asset,'attribution'),/creativecommons.org/);
});
