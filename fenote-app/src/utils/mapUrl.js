export function getMapUrl(input) {
  if (!input) return '';
  const value = String(input).trim();
  const match = value.match(/src=["']([^"']+)["']/i);
  const url = match ? match[1] : value;
  return url.replace(/&amp;/g, '&').trim();
}
