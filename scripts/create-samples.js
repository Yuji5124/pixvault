import sharp from 'sharp';
import { mkdir, access } from 'node:fs/promises';
const samples = [
 ['animals/cute_white_cat','<path d="M80 120L70 45L130 85Q160 70 190 85L245 45L235 120Q275 235 160 245Q45 235 80 120" fill="#eee7d8"/><circle cx="125" cy="145" r="9" fill="#222"/><circle cx="195" cy="145" r="9" fill="#222"/><path d="M148 173L172 173L160 186Z" fill="#ef9b98"/>'],
 ['nature/green_tree','<rect x="145" y="170" width="30" height="100" rx="5" fill="#a77852"/><circle cx="160" cy="105" r="65" fill="#80b991"/><circle cx="115" cy="155" r="55" fill="#579570"/><circle cx="205" cy="155" r="55" fill="#68a880"/>'],
 ['objects/gold_key','<circle cx="110" cy="125" r="46" fill="none" stroke="#e8be6a" stroke-width="22"/><path d="M145 155L235 245M210 220L230 200M185 195L205 175" stroke="#e8be6a" stroke-width="22"/>'],
 ['effects/red_fire','<path d="M160 35Q230 120 200 145Q240 130 245 180Q250 275 160 280Q60 275 80 190Q90 150 130 120Q115 180 150 185Q190 160 160 35" fill="#ed775b"/><path d="M160 165Q215 240 160 260Q105 240 160 165" fill="#f6cb78"/>'],
 ['objects/blue_tile','<rect width="320" height="320" fill="#668eb0"/><rect x="40" y="40" width="240" height="240" rx="30" fill="#9ac1d8"/>'],
];
for (const [name, drawing] of samples) {
 const output = `public/assets/${name}.png`;
 await mkdir(output.slice(0, output.lastIndexOf('/')), { recursive: true });
 try { await access(output); continue; } catch {}
 await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320">${drawing}</svg>`)).png().toFile(output);
}
console.log('Original geometric samples created (CC0).');
