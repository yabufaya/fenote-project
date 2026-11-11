import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ImagePlus, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { contentAPI } from '../services/api';
import { useSupabaseRealtime } from '../hooks/useSupabaseRealtime';

const FALLBACK_IMAGE = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180'%3E%3Crect width='320' height='180' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='13' fill='%239ca3af'%3EImage%3C/text%3E%3C/svg%3E`;

function resolveImageUrl(url) {
  if (!url) return FALLBACK_IMAGE;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return url.startsWith('/') ? url : `/${url}`;
}

export default function ImageOnlyManager({ table, title, description }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  const fetchRows = useCallback(async () => {
    try {
      const response = await contentAPI.list(table);
      setRows(response.data.data || []);
    } catch (error) {
      console.error(`Load ${table} error:`, error);
      toast.error(`Could not load ${title}`);
    } finally {
      setLoading(false);
    }
  }, [table, title]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useSupabaseRealtime([table], fetchRows);

  const upload = async (event) => {
    const selected = event.target.files?.[0] || null;
    event.target.value = '';
    if (!selected) return;
    setFile(selected);
    setUploading(true);
    try {
      await contentAPI.save(table, null, {}, {}, { imageurl: selected });
      toast.success(`${title} image added`);
      setFile(null);
      await fetchRows();
    } catch (error) {
      console.error(`Save ${table} error:`, error);
      toast.error(error.response?.data?.message || 'Could not add image');
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this image?')) return;
    try {
      await contentAPI.remove(table, id);
      toast.success('Image deleted');
      await fetchRows();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete image');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-400 mt-1">{description || 'Upload images only; no titles or other fields.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400">{rows.length} image{rows.length === 1 ? '' : 's'}</span>
          <button type="button" onClick={fetchRows} className="btn-secondary text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </div>

      <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/60 p-7 cursor-pointer hover:border-blue-300 hover:bg-blue-50/40 transition">
        <ImagePlus className="w-7 h-7 text-blue-500" />
        <span className="text-sm font-semibold text-gray-700">{uploading ? 'Uploading…' : 'Choose an image to upload'}</span>
        <span className="text-[11px] text-gray-400">{file?.name || 'PNG, JPG, WEBP or other image'}</span>
        <input type="file" accept="image/*" onChange={upload} disabled={uploading} className="hidden" />
        {uploading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
      </label>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-400">No images yet. Upload the first one above.</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {rows.map((row) => (
            <div key={row.id} className="group relative rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">
              <img
                src={resolveImageUrl(row.imageurl)}
                alt=""
                className="w-full h-36 object-cover"
                onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE; }}
              />
              <button type="button" onClick={() => remove(row.id)} className="absolute top-2 right-2 p-2 rounded-lg bg-white/90 text-gray-400 hover:text-red-500 hover:bg-red-50 shadow-sm" title="Delete image">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
