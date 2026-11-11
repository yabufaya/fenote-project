import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { usePublicRealtime } from '../hooks/usePublicRealtime';

// ✅ Helper function to ensure the image URL points to the root directory
const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return url.startsWith('/') ? url : `/${url}`;
};

export default function GalleryOverlay({ onClose, openLightbox }) {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  usePublicRealtime(['gallery'], () => setRefreshKey((k) => k + 1));
  const [images, setImages] = useState([]);
  const videoItem = images.find((item) => item.video_url);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const data = await api.getGallery();
        setImages(data.data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching gallery:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
  }, [refreshKey]);

  return (
    <div className="py-12">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 px-4 sm:px-6 lg:px-8 py-4 bg-glass border-b border-theme">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-fenote-500 to-mint-500">
              <Icon icon="solar:heart-pulse-bold" className="text-white text-lg" />
            </div>
            <h2 className="font-bold text-xl text-primary">{t('nav.gallery')}</h2>
          </div>
          <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-card border border-theme text-primary hover:shadow-lg transition">
            <Icon icon="solar:arrow-left-linear" /> {t('nav.backHome')}
          </button>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Photos Section */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-fenote-50 text-accent">
            <Icon icon="solar:gallery-bold" /> {t('gallery.badge')}
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight text-primary">
            {t('gallery.title1')} <span className="font-serif italic text-accent">{t('gallery.title2')}</span>
          </h3>
          <p className="mb-8 max-w-lg text-secondary">{t('gallery.desc')}</p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-3 text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                <p className="mt-4 text-muted">{t('gallery.loading')}</p>
              </div>
            ) : error ? (
              <div className="col-span-3 text-center py-12">
                <p className="text-red-500">{t('common.errorLoading', { section: t('nav.gallery'), message: error })}</p>
              </div>
            ) : images.length === 0 ? (
              <div className="col-span-3 text-center py-12">
                <p className="text-muted">{t('gallery.empty')}</p>
              </div>
            ) : (
              images.map((image) => (
                <div 
                  key={image.id} 
                  className="overflow-hidden rounded-xl cursor-pointer" 
                  // ✅ FIX: Use lowercase imageurl
                  onClick={() => openLightbox(resolveImageUrl(image.imageurl))}
                >
                  <img 
                    // ✅ FIX: Use lowercase imageurl and alttext
                    src={resolveImageUrl(image.imageurl) || 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800&h=600&fit=crop'} 
                    alt={image.alttext || image.category || t('gallery.imageAlt', { id: image.id })}
                    className="w-full aspect-[4/3] object-cover rounded-xl hover:scale-105 transition-transform duration-500" 
                    loading="lazy" 
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800&h=600&fit=crop';
                    }}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Video Section */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-mint-50 text-mint-500">
            <Icon icon="solar:videocamera-record-bold" /> {t('gallery.videoBadge')}
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight text-primary">
            {t('gallery.videoTitle1')} <span className="font-serif italic text-accent">{t('gallery.videoTitle2')}</span>
          </h3>
          <p className="mb-8 max-w-lg text-secondary">{t('gallery.videoDesc')}</p>
          
          <div className="max-w-3xl mx-auto">
            {videoItem ? (
              <div className="relative pb-[56.25%] h-0 rounded-2xl overflow-hidden border border-theme shadow-theme bg-black">
                <video className="absolute top-0 left-0 w-full h-full object-contain" src={resolveImageUrl(videoItem.video_url)} poster={resolveImageUrl(videoItem.imageurl) || undefined} controls preload="metadata" playsInline>
                  {t('gallery.videoTitle')}
                </video>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-theme bg-card/60 py-14 text-center text-secondary text-sm">{t('gallery.noVideo')}</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}