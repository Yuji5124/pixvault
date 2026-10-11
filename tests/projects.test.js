import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveProjects,projectAssets} from '../src/projects.js';
const assets=[{id:'a',project:'momotaro',projectTitle:'旧名'},{id:'b',project:'other'},{id:'c'}];
const registry=[{id:'momotaro',name:'桃太郎用',type:'animation',status:'active'},{id:'other',name:'教材',type:'education',status:'archived'}];
test('Project names resolve from registry and browser overrides without changing IDs',()=>{
 const projects=resolveProjects(assets,registry,{momotaro:{name:'桃太郎 第二話',id:'bad'}});
 assert.equal(projects[0].id,'momotaro');
 assert.equal(projectAssets(assets,projects)[0].projectTitle,'桃太郎 第二話');
});
test('Project Archive, types and unassigned filters combine correctly',()=>{
 assert.deepEqual(projectAssets(assets,registry).map(a=>a.id),['a','c']);
 assert.deepEqual(projectAssets(assets,registry,{status:'archived',type:'education'}).map(a=>a.id),['b']);
 assert.deepEqual(projectAssets(assets,registry,{status:'unassigned'}).map(a=>a.id),['c']);
});
test('Deleted projects are excluded even in all, and can be restored without deleting assets',()=>{
 const deleted=resolveProjects(assets,registry,{momotaro:{deleted:true}});
 assert.deepEqual(projectAssets(assets,deleted,{status:'all'}).map(a=>a.id),['b','c']);
 assert.equal(assets.length,3);
 const restored=resolveProjects(assets,registry,{momotaro:{deleted:false}});
 assert.equal(projectAssets(assets,restored,{status:'all'}).length,3);
});
test('Shared projects removed from the catalog do not reappear from stale browser overrides',()=>{
 assert.deepEqual(resolveProjects([],[],{momotaro:{name:'古い名前',deleted:true}}),[]);
 const id='cf08283e-83eb-4f8d-951b-ffb8a1519f17';
 assert.equal(resolveProjects([],[],{[id]:{name:'ブラウザだけの Project'}}).length,1);
});
