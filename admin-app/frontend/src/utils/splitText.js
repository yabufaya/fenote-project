export function combineText(parts, separator = '\n') {
  const list = Array.isArray(parts) ? parts : [parts];
  return list
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join(separator);
}

export function splitHeadline(text) {
  const clean = String(text || '').trim();
  if (!clean) return { title1: '', title2: '' };

  const explicit = clean.split(/\s*\|\s*/);
  if (explicit.length > 1) {
    return { title1: explicit[0].trim(), title2: explicit.slice(1).join(' ').trim() };
  }

  const words = clean.split(/\s+/);
  if (words.length <= 2) return { title1: clean, title2: '' };
  return {
    title1: words.slice(0, -2).join(' '),
    title2: words.slice(-2).join(' '),
  };
}

export function splitDescription(text, lines = 3) {
  const clean = String(text || '').replace(/\r/g, '').trim();
  const out = Array.from({ length: lines }, () => '');
  if (!clean) return out;

  let parts = clean.split(/\n+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) {
    parts = clean.split(/(?<=[.!?።])\s+/).map((part) => part.trim()).filter(Boolean);
  }
  if (!parts.length) parts = [clean];

  parts.slice(0, lines).forEach((part, i) => { out[i] = part; });
  if (parts.length > lines) {
    out[lines - 1] = parts.slice(lines - 1).join(' ');
  }
  return out;
}
