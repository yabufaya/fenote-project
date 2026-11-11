// Helpers for protecting a just-committed admin edit from a stale GET.
//
// A database write is committed, but several live-refresh GETs can be in
// flight. The backend now returns `xmin::text AS _row_version` on every content
// row. That is a read-only Postgres transaction token: a newer committed row
// always has a larger token. The admin uses it to reject an old cached GET that
// arrives after the save, instead of briefly showing the previous value.
// Cloudflare Hyperdrive can serve a cached SELECT for max_age (60s) plus
// stale_while_revalidate (15s) after a write. Hold the committed row for that
// whole window; newer server rows are still accepted immediately.
export const LOCAL_PROTECTION_MS = 75000;

export const rowSignature = (row) => (
  row ? `${row.updated_at || ''}|${row._row_version || ''}|${JSON.stringify(row)}` : ''
);

export const timestampValue = (row) => {
  const value = Date.parse(row?.updated_at || '');
  return Number.isFinite(value) ? value : 0;
};

function rowVersionValue(row) {
  const raw = row?._row_version;
  if (raw === undefined || raw === null || raw === '') return null;
  try {
    return BigInt(raw);
  } catch (_) {
    return null;
  }
}

export function fetchedRowIsStale(fetched, savedEntry, now = Date.now()) {
  if (!savedEntry || now - savedEntry.at > LOCAL_PROTECTION_MS) return false;
  const saved = savedEntry.row;
  const savedAt = timestampValue(saved);
  const fetchedAt = timestampValue(fetched);

  // A clearly older timestamp is stale. A fetched row with no timestamp while
  // the committed row has one is also an old response shape.
  if (savedAt && fetchedAt && fetchedAt < savedAt) return true;
  if (savedAt && fetchedAt === 0) return true;
  // A clearly newer timestamp is an external edit; never suppress it.
  if (fetchedAt && (!savedAt || fetchedAt > savedAt)) return false;

  // Same millisecond / timestamp-less tables: compare committed transaction
  // tokens. This is the exact fix for the hero "new -> old -> new" blink.
  const savedVersion = rowVersionValue(saved);
  const fetchedVersion = rowVersionValue(fetched);
  if (savedVersion !== null && fetchedVersion !== null) {
    return fetchedVersion < savedVersion;
  }
  if (savedVersion !== null && fetchedVersion === null) return true;
  return false;
}
