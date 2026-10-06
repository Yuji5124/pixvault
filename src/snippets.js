import { config } from './config.js';
export const encodePath = path => path.split('/').map(encodeURIComponent).join('/');
export const assetUrl = a => new URL(encodePath(a.file), config.baseUrl.endsWith('/') ? config.baseUrl : `${config.baseUrl}/`).href;
const htmlEscape = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function snippet(asset, kind) {
 const url = assetUrl(asset), u = JSON.stringify(url), key = JSON.stringify(asset.name);
 if(kind === 'url') return url;
 if(kind === 'path') return `/${asset.file}`;
 if(kind === 'html') return `<img src="${htmlEscape(url)}" alt="${htmlEscape(asset.name)}" />`;
 if(kind === 'phaser') return `// preload()\nthis.load.image(${key}, ${u});\n\n// create()\nthis.add.image(400, 300, ${key});`;
 if(kind === 'sprite') return `const texture = new THREE.TextureLoader().load(${u});\ntexture.colorSpace = THREE.SRGBColorSpace;\nconst sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));\nsprite.scale.set(${asset.width / asset.height}, 1, 1);\nscene.add(sprite);`;
 return `const texture = new THREE.TextureLoader().load(${u});\ntexture.colorSpace = THREE.SRGBColorSpace;\nconst material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });\nconst geometry = new THREE.PlaneGeometry(${asset.width / asset.height}, 1);\nconst sprite = new THREE.Mesh(geometry, material);\nscene.add(sprite);`;
}
