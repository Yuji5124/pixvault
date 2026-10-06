export function generateTags(path, manual = []) {
  const tokens = path.replace(/\.png$/i, '').replace(/([a-z\d])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2').split(/[\/ _\-.]+/u);
  return [...new Set([...tokens, ...manual].map(t => String(t).normalize('NFKC').toLowerCase().trim()).filter(Boolean))];
}
