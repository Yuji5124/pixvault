export const kindLabels = {
 character:'人物・キャラクター', 'character-part':'身体パーツ', 'animation-frame':'アニメ用ポーズ',
 animal:'動物', background:'背景', 'background-part':'背景パーツ', prop:'小道具', effect:'演出・エフェクト', tile:'地形・組み立てパーツ', image:'その他の画像',
};
export function nativeDimensions(asset) {
 return {width:Math.min(asset.width || 0, asset.sourceWidth || asset.width || 0),height:Math.min(asset.height || 0,asset.sourceHeight || asset.height || 0)};
}
export function qualityScore(asset) { const {width,height}=nativeDimensions(asset);return width*height; }
export function resolutionLabel(asset) {
 const {width,height}=nativeDimensions(asset);const edge=Math.max(width,height);
 return edge>=3840?'4K級':edge>=2048?'2K級':edge>=1024?'1K級':edge>=512?'512px級':edge>=256?'256px級':'小サイズ';
}
