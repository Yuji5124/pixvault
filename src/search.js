import { qualityScore, nativeDimensions, kindLabels } from './quality.js';
export function indexAssets(assets) {
 return assets.map(asset => ({ ...asset, searchText: [asset.name,asset.title || '',asset.file,asset.category,...asset.tags,asset.description || '',asset.collectionTitle || '',asset.style || '',asset.projectTitle || '',kindLabels[asset.kind] || '',...(asset.storyRoles || [])].join(' ').normalize('NFKC').toLowerCase() }));
}
export function filterAssets(assets, { query = '', category = 'all', collection = 'all', project = 'all', kind = 'all', attributionFree = false, minResolution = 0, transparent = false, favoritesOnly = false, favorites = new Set() } = {}) {
 const words = query.normalize('NFKC').toLowerCase().trim().split(/\s+/).filter(Boolean);
 return assets.filter(a => (category === 'all' || a.category === category) && (collection === 'all' || (a.collection || 'samples') === collection) && (project === 'all' || a.project === project) && (kind === 'all' || (a.kind || 'image') === kind) && (!attributionFree || a.license === 'CC0-1.0' || a.license === 'CC0') && (Math.max(...Object.values(nativeDimensions(a))) >= Number(minResolution)) && (!transparent || a.transparent) && (!favoritesOnly || favorites.has(a.id)) && words.every(word => a.searchText.includes(word)));
}
export function sortAssets(assets, order) {
 const result = [...assets];
 if (order === 'random') { for(let i=result.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [result[i],result[j]]=[result[j],result[i]]; } return result; }
 return result.sort((a,b) => order === 'quality' ? qualityScore(b)-qualityScore(a) || a.name.localeCompare(b.name) : order === 'newest' ? (b.createdAt || '').localeCompare(a.createdAt || '') : order === 'width' || order === 'height' ? b[order]-a[order] || a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
}
