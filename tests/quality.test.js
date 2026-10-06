import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeDimensions,qualityScore,resolutionLabel} from '../src/quality.js';
import {filterAssets,indexAssets,sortAssets} from '../src/search.js';
import {groupAssets} from '../src/collections.js';
test('quality ranking uses native source area, never an enlarged output',()=>{
 const small={id:'small',name:'small',width:4096,height:4096,sourceWidth:128,sourceHeight:128};
 const large={id:'large',name:'large',width:1024,height:1024};
 assert.deepEqual(nativeDimensions(small),{width:128,height:128});assert.equal(qualityScore(small),128*128);
 assert.equal(resolutionLabel(small),'小サイズ');assert.equal(sortAssets([small,large],'quality')[0].id,'large');
});
test('Momotaro project, kind, attribution-free and native resolution filters compose',()=>{
 const assets=indexAssets([
 {name:'forest',file:'forest.png',category:'backgrounds',project:'momotaro',kind:'background',width:1024,height:1024,license:'CC0-1.0',tags:['森']},
 {name:'dog',file:'dog.png',category:'animals',project:'momotaro',kind:'animal',width:256,height:256,license:'CC0-1.0',tags:['犬']},
 {name:'peach',file:'peach.png',category:'food',width:618,height:618,license:'CC-BY-SA-4.0',tags:['桃']},
 ]);
 assert.equal(filterAssets(assets,{project:'momotaro',attributionFree:true}).length,2);
 assert.equal(filterAssets(assets,{project:'momotaro',kind:'background',minResolution:1024}).length,1);
 assert.equal(filterAssets(assets,{minResolution:2048}).length,0);
 assert.equal(filterAssets(assets,{attributionFree:true,query:'桃'}).length,0);
 assert.equal(filterAssets(assets,{project:'momotaro',query:'背景 森'}).length,1);
});
test('quality sort also puts the highest-resolution group first',()=>{
 const groups=groupAssets([{category:'animals',collection:'a',width:64,height:64},{category:'backgrounds',collection:'b',width:1024,height:1024}],'quality');
 assert.equal(groups[0].category,'backgrounds');
});
