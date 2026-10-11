import path from 'node:path';
import {readFile,writeFile,unlink,lstat,realpath,readdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export function deletionPlan(assets,projects,id,expectedCount) {
 if(typeof id!=='string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw Error('Invalid Project ID');
 const targets=assets.filter(a=>a.project===id);
 if(!projects.some(p=>p.id===id) && !targets.length) throw Error('Project does not exist');
 if(!Number.isSafeInteger(expectedCount) || expectedCount<0 || targets.length!==expectedCount) throw Error(`Asset count changed: expected ${expectedCount}, found ${targets.length}`);
 const remaining=assets.filter(a=>a.project!==id);
 const shared=new Set(remaining.flatMap(a=>[a.file,a.thumbnail]).filter(Boolean));
 const files=new Set();
 for(const a of targets) for(const [key,prefix,extension] of [['file','assets/','.png'],['thumbnail','thumbnails/','.webp']]) {
  const file=a[key];
  if(typeof file!=='string' || !file.startsWith(prefix) || !file.endsWith(extension) || file.includes('\\') || file.includes('\0') || file.split('/').some(p=>!p || p==='.' || p==='..')) throw Error(`Unsafe ${key} path`);
  if(!shared.has(file)) files.add(file);
 }
 return {assets:remaining,projects:projects.filter(p=>p.id!==id),files:[...files],count:targets.length};
}
export async function deleteProject(publicDir,id,expectedCount,confirmation) {
 if(confirmation!==`DELETE ${id}`) throw Error(`Confirmation must be DELETE ${id}`);
 const root=await realpath(publicDir);
 const assets=JSON.parse(await readFile(path.join(root,'data/assets.json'),'utf8'));
 const projects=JSON.parse(await readFile(path.join(root,'data/projects.json'),'utf8'));
 const plan=deletionPlan(assets,projects,id,expectedCount);
 // Validate every target before writing. Never traverse symlinks outside public/.
 for(const relative of plan.files) {
  const file=path.join(root,relative);
  const canonical=await realpath(file);
  if(!canonical.startsWith(root+path.sep) || canonical!==file || !(await lstat(file)).isFile()) throw Error(`Unsafe or missing file: ${relative}`);
 }
 const importDir=path.join(root,'data/imports');
 let imports=[];
 try {imports=await readdir(importDir);} catch(e) {if(e.code!=='ENOENT') throw e;}
 const importFiles=[];
 for(const name of imports.filter(n=>n.endsWith('.json'))) {
  const file=path.join(importDir,name);
  if((await lstat(file)).isSymbolicLink()) throw Error('Import manifest cannot be a symlink');
  const data=JSON.parse(await readFile(file,'utf8'));
  if(data.project===id) importFiles.push(file);
 }
 for(const file of plan.files) await unlink(path.join(root,file));
 for(const file of importFiles) await unlink(file);
 await writeFile(path.join(root,'data/assets.json'),JSON.stringify(plan.assets,null,2)+'\n');
 await writeFile(path.join(root,'data/projects.json'),JSON.stringify(plan.projects,null,2)+'\n');
 return {project:id,assetCount:plan.count,deletedFiles:plan.files.length,remainingAssets:plan.assets.length};
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
 const [id,count,confirmation]=process.argv.slice(2);
 try {console.log(JSON.stringify(await deleteProject(path.resolve('public'),id,Number(count),confirmation),null,2));}
 catch(error) {console.error(error.message);process.exitCode=1;}
}
