export const projectTypes = { animation: 'アニメーション動画', education: '教材', game: 'ゲーム', other: 'その他' };
export function resolveProjects(assets, registry = [], overrides = {}) {
 const projects = new Map(registry.map(p => [p.id, {...p}]));
 for (const asset of assets) if (asset.project && !projects.has(asset.project)) projects.set(asset.project, {id: asset.project, name: asset.projectTitle || asset.project, type: 'other', status: 'active'});
 for(const [id,p] of Object.entries(overrides)) if(!projects.has(id) && p.name && (p.localOnly || (p.localOnly!==false && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)))) projects.set(id,{id,name:p.name,type:'other',status:'active'});
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
