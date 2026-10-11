import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {mkdtemp,mkdir,writeFile,readFile,access,rm,symlink} from 'node:fs/promises';
import {deletionPlan,deleteProject} from '../scripts/delete-project.js';
const projects=[{id:'target',name:'削除対象'},{id:'keep',name:'残す'}];
const assets=[{id:'a',project:'target',file:'assets/a.png',thumbnail:'thumbnails/a.webp'},{id:'b',project:'keep',file:'assets/b.png',thumbnail:'thumbnails/b.webp'}];
async function fixture(t) {
 const root=await mkdtemp(path.join(os.tmpdir(),'pixvault-delete-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 for(const dir of ['assets','thumbnails','data/imports']) await mkdir(path.join(root,dir),{recursive:true});
 for(const a of assets) for(const f of [a.file,a.thumbnail]) await writeFile(path.join(root,f),'fixture');
 await writeFile(path.join(root,'data/assets.json'),JSON.stringify(assets));
 await writeFile(path.join(root,'data/projects.json'),JSON.stringify(projects));
 await writeFile(path.join(root,'data/imports/target.json'),JSON.stringify({project:'target'}));
 await writeFile(path.join(root,'data/imports/keep.json'),JSON.stringify({project:'keep'}));
 return root;
}
test('Permanent deletion removes PNG, thumbnail, project and import manifest, preserving another project',async t=>{
 const root=await fixture(t);
 const result=await deleteProject(root,'target',1,'DELETE target');assert.equal(result.deletedFiles,2);
 for(const f of ['assets/a.png','thumbnails/a.webp','data/imports/target.json']) await assert.rejects(access(path.join(root,f)),{code:'ENOENT'});
 for(const f of ['assets/b.png','thumbnails/b.webp','data/imports/keep.json']) await access(path.join(root,f));
 assert.deepEqual(JSON.parse(await readFile(path.join(root,'data/assets.json'),'utf8')),assets.slice(1));
 assert.deepEqual(JSON.parse(await readFile(path.join(root,'data/projects.json'),'utf8')),projects.slice(1));
});
test('Wrong confirmation and changed asset counts cannot delete anything',async t=>{
 const root=await fixture(t);
 await assert.rejects(deleteProject(root,'target',1,'target'),/Confirmation/);
 await assert.rejects(deleteProject(root,'target',5000,'DELETE target'),/count changed/);
 await access(path.join(root,'assets/a.png'));
 assert.equal(JSON.parse(await readFile(path.join(root,'data/assets.json'),'utf8')).length,2);
});
test('Shared files referenced by another project are never removed',()=>{
 const plan=deletionPlan([...assets,{...assets[0],id:'c',project:'keep'}],projects,'target',1);
 assert.deepEqual(plan.files,[]);assert.equal(plan.assets.length,2);
});
test('Path traversal and unknown projects are rejected',()=>{
 assert.throws(()=>deletionPlan([{...assets[0],file:'assets/../secret.png'}],projects,'target',1),/Unsafe/);
 assert.throws(()=>deletionPlan(assets,projects,'missing',0),/does not exist/);
});
test('Symlinks are rejected before removing any files',async t=>{
 const root=await fixture(t);
 await rm(path.join(root,'thumbnails/a.webp'));
 await symlink(path.join(root,'thumbnails/b.webp'),path.join(root,'thumbnails/a.webp'));
 await assert.rejects(deleteProject(root,'target',1,'DELETE target'),/Unsafe/);
 await access(path.join(root,'assets/a.png'));await access(path.join(root,'thumbnails/b.webp'));
});
test('Registered projects with no assets can be permanently removed',async t=>{
 const root=await fixture(t);
 await writeFile(path.join(root,'data/projects.json'),JSON.stringify([...projects,{id:'empty',name:'空'}]));
 assert.equal((await deleteProject(root,'empty',0,'DELETE empty')).assetCount,0);
 assert.equal(JSON.parse(await readFile(path.join(root,'data/projects.json'),'utf8')).length,2);
});
