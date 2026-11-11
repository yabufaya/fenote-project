const NUMBER_TOKEN = /(\d[\d,]*(?:\.\d+)?\+?)/g;

export function numericValue(input) {
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  const match = String(input ?? '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

export function decimalPlaces(input) {
  const text = String(input ?? '');
  const match = text.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  return Math.min((match[0].split('.')[1] || '').length, 3);
}

export function formatNumber(value, decimals = 0) {
  const safe = Number.isFinite(value) ? value : 0;
  if (typeof Intl === 'undefined' || typeof Intl.NumberFormat !== 'function') {
    return decimals ? safe.toFixed(decimals) : String(Math.round(safe));
  }
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(safe);
}

// Splits translated text such as "12+ Years Experience" or "ከ12 ዓመት በላይ ልምድ"
// into plain text and number tokens. Only explicitly marked strings use this,
// so phone numbers, prices, and opening hours are never counted.
export function splitNumericText(text) {
  const source = String(text ?? '');
  const parts = [];
  let lastIndex = 0;
  NUMBER_TOKEN.lastIndex = 0;
  let match;

  while ((match = NUMBER_TOKEN.exec(source)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: source.slice(lastIndex, match.index) });
    }
    const token = match[0];
    const hasPlus = token.endsWith('+');
    parts.push({
      type: 'number',
      value: hasPlus ? token.slice(0, -1) : token,
      suffix: hasPlus ? '+' : '',
    });
    lastIndex = match.index + token.length;
  }

  if (lastIndex < source.length) {
    parts.push({ type: 'text', value: source.slice(lastIndex) });
  }
  return parts;
}
