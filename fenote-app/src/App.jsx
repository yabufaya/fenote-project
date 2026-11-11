import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Scene from './components/three/Scene';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import GalleryOverlay from './pages/GalleryOverlay';
import ResourcesOverlay from './pages/ResourcesOverlay';
import PaymentOverlay from './pages/PaymentOverlay';
import { Toaster } from 'react-hot-toast';
import BookOverlay from './pages/BookOverlay';
import useContentVersion from './hooks/useContentVersion';
import useScrollFlow from './hooks/useScrollFlow';

export default function App() {
  // Public SPA only: reveal blocks as they enter the viewport and start number
  // counters at zero. Admin SPA is a separate build and is untouched.
  useScrollFlow();
  // One visible tab watches the PII-free content version; all mounted sections
  // receive a targeted refresh event when a table changes.
  useContentVersion();
  const { t } = useTranslation();
  const [activeOverlay, setActiveOverlay] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const openLightbox = (src) => setLightboxSrc(src);
  const closeLightbox = () => setLightboxSrc(null);

  return (
    <div className="relative">
      <Toaster position="top-center" toastOptions={{ duration: 5000, style: { background: '#1E293B', color: '#fff', borderRadius: '12px' } }} />
      <Scene />

      <div className="relative z-[1]">
        <Header setOverlay={setActiveOverlay} />
        <Home openLightbox={openLightbox} setOverlay={setActiveOverlay} />
        <Footer setOverlay={setActiveOverlay} />
      </div>

      <div className={`overlay-page ${activeOverlay === 'gallery' ? 'active' : ''}`}>
        {activeOverlay === 'gallery' && <GalleryOverlay onClose={() => setActiveOverlay(null)} openLightbox={openLightbox} />}
      </div>
      <div className={`overlay-page ${activeOverlay === 'resources' ? 'active' : ''}`}>
        {activeOverlay === 'resources' && <ResourcesOverlay onClose={() => setActiveOverlay(null)} />}
      </div>
      <div className={`overlay-page ${activeOverlay === 'payment' ? 'active' : ''}`}>
        {activeOverlay === 'payment' && <PaymentOverlay onClose={() => setActiveOverlay(null)} />}
      </div>
      <div className={`overlay-page ${activeOverlay === 'book' ? 'active' : ''}`}>
        {activeOverlay === 'book' && <BookOverlay onClose={() => setActiveOverlay(null)} />}
      </div>

      <div className={`lightbox-overlay ${lightboxSrc ? 'open' : ''}`} onClick={closeLightbox}>
        <button type="button" aria-label={t('common.close')} className="absolute top-6 right-6 text-white text-4xl z-10 hover:opacity-70 transition" onClick={closeLightbox}>&times;</button>
        {lightboxSrc && <img src={lightboxSrc} alt={t('common.gallery')} className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl" />}
      </div>

      <button
        type="button"
        onClick={() => setActiveOverlay('book')}
        className="chat-btn fixed bottom-6 right-6 z-[1400] w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl bg-gradient-to-r from-fenote-500 to-mint-500 hover:scale-110 transition border-none cursor-pointer"
        aria-label={t('common.bookAppointment')}
      >
        <span className="text-2xl">📅</span>
      </button>
    </div>
  );
}
