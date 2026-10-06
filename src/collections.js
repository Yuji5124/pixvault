export const categoryLabels = {
 animals: '動物', nature: '自然・植物', food: '食べ物', objects: '生活用品・道具',
 vehicles: '乗り物', buildings: '建物・場所', people: '表情・からだ', effects: '気持ち・お祝い', misc: 'その他',
};
export function groupAssets(assets) {
 const groups = new Map();
 for (const asset of assets) {
  const collection = asset.collection || 'samples';
  const key = `${asset.category}:${collection}`;
  if (!groups.has(key)) groups.set(key, {key, category:asset.category, collection,
   title: `${categoryLabels[asset.category] || asset.category} · ${asset.collectionTitle || 'オリジナルサンプル'}`, assets:[]});
  groups.get(key).assets.push(asset);
 }
 return [...groups.values()].sort((a,b) => a.category.localeCompare(b.category) || a.collection.localeCompare(b.collection));
}
