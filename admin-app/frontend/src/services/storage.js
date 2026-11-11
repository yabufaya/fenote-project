import { supabase } from '../lib/supabase';

const BUCKETS = {
  image: import.meta.env.VITE_STORAGE_BUCKET_IMAGES || 'fenote-images',
  video: import.meta.env.VITE_STORAGE_BUCKET_VIDEOS || 'fenote-videos',
  document: import.meta.env.VITE_STORAGE_BUCKET_DOCUMENTS || 'fenote-documents',
};
const FOLDERS = { image: 'images', video: 'videos', document: 'documents' };
const ENABLED = String(import.meta.env.VITE_SUPABASE_STORAGE_ENABLED ?? 'true') !== 'false';

export const storageEnabled = () => ENABLED && !!supabase;

export function classifyFile(file) {
  const type = (file?.type || '').toLowerCase();
  const name = (file?.name || '').toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/') || /\.(mp4|webm|mov)$/.test(name)) return 'video';
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'document';
  return null;
}

function safeName(name = 'file') {
  return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-').replace(/^-|-$/g, '').slice(-120) || 'file';
}

function uniqueId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export async function uploadAsset(file, section = 'general') {
  if (!file || !storageEnabled()) return null;
  const kind = classifyFile(file);
  if (!kind) throw new Error('Unsupported file type. Use an image, MP4/WebM/MOV video, or PDF.');
  const bucket = BUCKETS[kind];
  const path = `${FOLDERS[kind]}/${section}/${uniqueId()}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || undefined,
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
