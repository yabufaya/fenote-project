import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Edit2, Languages, Loader2, Plus, RefreshCw, Save, Search, Trash2, X,
} from 'lucide-react';
import Modal from './Modal';
import { contentAPI } from '../services/api';
import { useSupabaseRealtime } from '../hooks/useSupabaseRealtime';
import { publishContentChange } from '../hooks/useContentVersion';
import { LOCAL_PROTECTION_MS, rowSignature, fetchedRowIsStale } from '../utils/contentFreshness.mjs';

const emptyTranslations = () => ({ en: {}, am: {} });

function LanguageTabs({ lang, setLang }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-5 rounded-2xl border border-gray-100 bg-gray-50/70 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        <Languages className="w-4 h-4" /> Content language
      </div>
      <div className="inline-flex rounded-xl bg-white border border-gray-200 p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setLang('en')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${lang === 'en' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'}`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLang('am')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${lang === 'am' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'}`}
        >
          አማ
        </button>
      </div>
    </div>
  );
}

function FieldControl({ field, value, placeholder, onChange, onFile, currentUrl }) {
  const common = 'input-field text-sm';
  if (field.type === 'file') {
    return (
      <div className="space-y-1.5">
        <input
          type="file"
          accept={field.accept}
          onChange={(e) => onFile(field.name, e.target.files?.[0] || null)}
          className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-900 file:text-white file:text-xs file:font-semibold hover:file:bg-slate-800"
        />
        {currentUrl && <p className="text-[10px] text-gray-400 break-all">Current: {currentUrl}</p>}
      </div>
    );
  }
  if (field.type === 'textarea') {
    return <textarea rows={field.rows || 4} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(field.name, e.target.value)} className={common} />;
  }
  if (field.type === 'select') {
    return (
      <select value={value ?? ''} onChange={(e) => onChange(field.name, e.target.value)} className={common}>
        {(field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    );
  }
  return (
    <input
      type={field.type === 'number' ? 'number' : 'text'}
      inputMode={field.inputMode}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(field.name, e.target.value)}
      className={common}
    />
  );
}

export default function ContentManager({ config }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [lang, setLang] = useState('en');
  const [values, setValues] = useState(config.defaultValues || {});
  const [translations, setTranslations] = useState(emptyTranslations());
  const [files, setFiles] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const requestIdRef = useRef(0);
  const writeRevisionRef = useRef(0);
  const savedRowsRef = useRef(new Map());
  const deletedIdsRef = useRef(new Map());
  const initialized = useRef(false);
  const dirtyRef = useRef(false);
  const syncedRowRef = useRef('');
  const warnedRowRef = useRef('');

  // Ignore an older GET that finishes after a newer save/refresh. Without this
  // guard, a slow pre-save request can overwrite the committed row in React.
  const pruneLocalProtection = useCallback(() => {
    const now = Date.now();
    for (const [id, entry] of savedRowsRef.current) {
      if (now - entry.at > LOCAL_PROTECTION_MS) savedRowsRef.current.delete(id);
    }
    for (const [id, at] of deletedIdsRef.current) {
      if (now - at > LOCAL_PROTECTION_MS) deletedIdsRef.current.delete(id);
    }
  }, []);

  const fetchRows = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const writeRevision = writeRevisionRef.current;
    try {
      const response = await contentAPI.list(config.table);
      // Invalidate any GET that began before a local write, and ignore an
      // older GET that finishes after a newer refresh.
      if (requestId !== requestIdRef.current || writeRevision !== writeRevisionRef.current) return;
      pruneLocalProtection();
      const now = Date.now();
      const incoming = response.data.data || [];
      const protectedRows = incoming
        .map((row) => {
          const savedEntry = savedRowsRef.current.get(row.id);
          // Keep the committed row for the full protection window. A later
          // cached GET must not be able to revert it after one good GET.
          if (fetchedRowIsStale(row, savedEntry, now)) return savedEntry.row;
          return row;
        })
        .filter((row) => {
          const deletedAt = deletedIdsRef.current.get(row.id);
          return !deletedAt || now - deletedAt > LOCAL_PROTECTION_MS;
        });
      setRows(protectedRows);
    } catch (error) {
      if (requestId !== requestIdRef.current || writeRevision !== writeRevisionRef.current) return;
      console.error(`Load ${config.table} error:`, error);
      toast.error(`Could not load ${config.title}`);
    } finally {
      if (requestId === requestIdRef.current && writeRevision === writeRevisionRef.current) {
        setLoading(false);
      }
    }
  }, [config.table, config.title, pruneLocalProtection]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useSupabaseRealtime([config.table], fetchRows);

  const formFromRow = useCallback((row, options = {}) => {
    const nextValues = { ...(config.defaultValues || {}) };
    for (const field of config.fields) {
      if (field.type !== 'file' && row?.[field.name] !== undefined) nextValues[field.name] = row[field.name] ?? '';
      if (field.type === 'file') nextValues[field.name] = row?.[field.name] || '';
    }
    setValues(nextValues);
    setTranslations({
      en: row?.translations?.en && typeof row.translations.en === 'object' ? row.translations.en : {},
      am: row?.translations?.am && typeof row.translations.am === 'object' ? row.translations.am : {},
    });
    setFiles({});
    if (options.resetLang !== false) setLang('en');
    dirtyRef.current = false;
  }, [config.defaultValues, config.fields]);

  // Singleton forms are also kept in sync with committed rows, but never while
  // the editor has unsaved changes. Otherwise a live event could erase typing.
  useEffect(() => {
    if (!config.singleton || loading || !rows[0]) return;
    const signature = rowSignature(rows[0]);
    if (signature === syncedRowRef.current) return;
    if (!initialized.current) {
      initialized.current = true;
      syncedRowRef.current = signature;
      formFromRow(rows[0]);
      return;
    }
    if (dirtyRef.current) {
      if (warnedRowRef.current !== signature) {
        warnedRowRef.current = signature;
        toast('This section changed elsewhere. Save or Refresh to load it.', { icon: '↻' });
      }
      return;
    }
    syncedRowRef.current = signature;
    warnedRowRef.current = '';
    formFromRow(rows[0], { resetLang: false });
  }, [rows, loading, config.singleton, formFromRow]);

  const openCreate = () => {
    setEditing(null);
    formFromRow(null);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    formFromRow(row);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const setValue = (name, value) => {
    dirtyRef.current = true;
    setValues((prev) => ({ ...prev, [name]: value }));
  };
  const setFile = (name, file) => {
    dirtyRef.current = true;
    setFiles((prev) => ({ ...prev, [name]: file }));
  };
  const setAmValue = (name, value) => {
    dirtyRef.current = true;
    setTranslations((prev) => ({
      ...prev,
      am: { ...(prev.am || {}), [name]: value },
    }));
  };

  // The write endpoint returns `UPDATE ... RETURNING *`. Apply that committed
  // row immediately instead of trusting a later GET to deliver the same data.
  const applySavedRow = useCallback((saved) => {
    if (!saved || saved.id === undefined || saved.id === null) return;
    // Bump both guards BEFORE changing state. Any pre-save or early-Realtime
    // GET now becomes stale and cannot overwrite this committed row.
    requestIdRef.current += 1;
    writeRevisionRef.current += 1;
    savedRowsRef.current.set(saved.id, { row: saved, at: Date.now() });
    deletedIdsRef.current.delete(saved.id);
    setRows((prev) => {
      let found = false;
      const next = prev.map((row) => {
        if (row.id !== saved.id) return row;
        found = true;
        return saved;
      });
      if (!found) next.unshift(saved);
      return next;
    });
    syncedRowRef.current = rowSignature(saved);
    warnedRowRef.current = '';
    formFromRow(saved, { resetLang: false });
  }, [formFromRow]);

  const fieldValue = (field) => {
    if (lang === 'am' && field.translatable) return translations.am?.[field.name] ?? '';
    return values[field.name] ?? '';
  };
  const fieldPlaceholder = (field) => {
    if (lang === 'am' && field.translatable) return String(values[field.name] || 'English fallback');
    return field.placeholder || '';
  };
  const changeField = (name, value) => {
    const field = config.fields.find((f) => f.name === name);
    if (lang === 'am' && field?.translatable) setAmValue(name, value);
    else setValue(name, value);
  };

  const visibleFields = useMemo(
    () => (lang === 'am' ? config.fields.filter((f) => f.translatable) : config.fields),
    [config.fields, lang]
  );

  const buildPayload = () => {
    const baseValues = {};
    for (const field of config.fields) {
      if (field.type === 'file') continue;
      baseValues[field.name] = values[field.name] ?? '';
    }
    const en = { ...(translations.en || {}) };
    const am = { ...(translations.am || {}) };
    for (const field of config.fields.filter((f) => f.translatable)) {
      en[field.name] = values[field.name] ?? '';
      if (!(field.name in am)) am[field.name] = '';
    }
    return { baseValues, translationsPayload: { en, am } };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    for (const field of config.fields.filter((f) => f.required)) {
      const current = field.type === 'file' ? (files[field.name] || values[field.name]) : values[field.name];
      if (!current || String(current).trim() === '') {
        toast.error(`${field.label} is required`);
        return;
      }
    }
    const { baseValues, translationsPayload } = buildPayload();
    setSaving(true);
    try {
      const response = await contentAPI.save(
        config.table,
        editing?.id || null,
        baseValues,
        translationsPayload,
        files
      );
      const saved = response?.data?.data || response?.data;
      if (saved?.id !== undefined && saved?.id !== null) applySavedRow(saved);
      // Other admin/public tabs on this origin refresh immediately rather than
      // waiting for Realtime or the next version poll.
      publishContentChange(config.table);
      toast.success(`${config.title} saved in EN / አማ`);
      if (!config.singleton) closeModal();
      // A final fresh GET restores the server's ordering. Its request id is
      // newer than any in-flight pre-save GET, so stale responses are ignored.
      await fetchRows();
    } catch (error) {
      console.error(`Save ${config.table} error:`, error);
      toast.error(error.response?.data?.message || 'Could not save content');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete this ${config.title.replace(/s$/, '').toLowerCase()} entry?`)) return;
    try {
      await contentAPI.remove(config.table, row.id);
      requestIdRef.current += 1;
      writeRevisionRef.current += 1;
      deletedIdsRef.current.set(row.id, Date.now());
      savedRowsRef.current.delete(row.id);
      setRows((prev) => prev.filter((entry) => entry.id !== row.id));
      publishContentChange(config.table);
      toast.success('Deleted');
      await fetchRows();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete');
    }
  };

  const filteredRows = rows.filter((row) => {
    if (!searchTerm) return true;
    const needle = searchTerm.toLowerCase();
    return (config.searchFields || []).some((field) => String(row[field] || '').toLowerCase().includes(needle));
  });

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-5">
      <LanguageTabs lang={lang} setLang={setLang} />
      {lang === 'am' && (
        <p className="text-xs text-gray-500 rounded-xl bg-blue-50/60 border border-blue-100 p-3">
          Only display text appears here. Images, links, categories, numbers and internal keys stay shared on the EN tab. Empty Amharic fields fall back to English on the public site.
        </p>
      )}
      {visibleFields.length === 0 ? (
        <p className="text-sm text-gray-500">This section has no translatable display text; its shared settings are edited on the EN tab.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleFields.map((field) => (
            <div key={field.name} className={field.type === 'textarea' && field.rows >= 6 ? 'md:col-span-2' : ''}>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                {field.label}{field.translatable && <span className="ml-1 text-[10px] font-medium text-blue-500">EN / AM</span>}
              </label>
              <FieldControl
                field={field}
                value={fieldValue(field)}
                placeholder={fieldPlaceholder(field)}
                onChange={changeField}
                onFile={setFile}
                currentUrl={field.type === 'file' ? values[field.name] : ''}
              />
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        {!config.singleton && <button type="button" onClick={closeModal} className="btn-secondary text-sm">Cancel</button>}
        <button type="submit" disabled={saving} className="btn-primary text-sm flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save both languages
        </button>
      </div>
    </form>
  );

  if (loading) return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{config.title}</h1>
          <p className="text-xs text-gray-400 font-medium mt-1">{config.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={fetchRows} className="btn-secondary text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
          {!config.singleton && <button type="button" onClick={openCreate} className="btn-primary text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Add new</button>}
        </div>
      </div>

      {config.singleton ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">{renderForm()}</div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search…" className="input-field pl-10" />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {filteredRows.length === 0 ? (
              <div className="text-center py-14 text-gray-400 text-sm">No entries yet. Add your own content.</div>
            ) : filteredRows.map((row) => (
              <div key={row.id} className="p-4 lg:p-5 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{row[config.titleField] || `Entry #${row.id}`}</p>
                  {config.subtitleField && <p className="text-xs text-gray-400 mt-0.5">{row[config.subtitleField] || '—'}</p>}
                  {config.metaField && <p className="text-[10px] text-gray-300 mt-1 truncate">{row[config.metaField] || ''}</p>}
                  <p className="text-[10px] text-gray-400 mt-1.5">EN / አማ ready · updated {row.updated_at ? new Date(row.updated_at).toLocaleDateString() : '—'}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button type="button" onClick={() => openEdit(row)} className="btn-icon text-blue-500 hover:bg-blue-50" title="Edit"><Edit2 className="w-4 h-4" /></button>
                  <button type="button" onClick={() => handleDelete(row)} className="btn-icon text-gray-300 hover:text-red-500 hover:bg-red-50" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
          <Modal isOpen={showModal} onClose={closeModal} title={`${editing ? 'Edit' : 'Add'} ${config.title}`} size="lg">
            {renderForm()}
          </Modal>
        </>
      )}
    </div>
  );
}
