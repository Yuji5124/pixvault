export const projectTypes = { animation: 'アニメーション動画', education: '教材', game: 'ゲーム', other: 'その他' };
export function resolveProjects(assets, registry = [], overrides = {}) {
 const projects = new Map(registry.map(p => [p.id, {...p}]));
 for (const asset of assets) if (asset.project && !projects.has(asset.project)) projects.set(asset.project, {id: asset.project, name: asset.projectTitle || asset.project, type: 'other', status: 'active'});
 for(const [id,p] of Object.entries(overrides)) if(!projects.has(id) && p.name) projects.set(id,{id,name:p.name,type:'other',status:'active'});
 return [...projects.values()].map(p => ({...p, ...overrides[p.id], id:p.id}));
}
export function projectAssets(assets, projects, {type='all', status='active'}={}) {
 const map = new Map(projects.map(p=>[p.id,p]));
 return assets.filter(a=> {
  const p=map.get(a.project);
  if(p?.deleted) return false;
  if(type!=='all' && p?.type!==type) return false;
  return status==='all' || (status==='unassigned' ? !a.project : p ? p.status===status : status==='active');
 }).map(a=>({...a, projectTitle:map.get(a.project)?.name || a.projectTitle}));
}
