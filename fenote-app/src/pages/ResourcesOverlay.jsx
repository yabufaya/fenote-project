import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { SolidCard } from '../components/common/Cards';
import { api } from '../services/api';
import { usePublicRealtime } from '../hooks/usePublicRealtime';

// ✅ Helper function to ensure the image/file URL points to the root directory
const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return url.startsWith('/') ? url : `/${url}`;
};

export default function ResourcesOverlay({ onClose }) {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  usePublicRealtime(['resource'], () => setRefreshKey((k) => k + 1));
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const data = await api.getResources();
        setResources(data.data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching resources:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
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
            <h2 className="font-bold text-xl text-primary">{t('nav.resources')}</h2>
          </div>
          <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-card border border-theme text-primary hover:shadow-lg transition">
            <Icon icon="solar:arrow-left-linear" /> {t('nav.backHome')}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Introductory Paragraph */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-mint-50 text-mint-500">
          <Icon icon="solar:library-bold" /> {t('resources.badge')}
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight text-primary">
          {t('resources.title1')} <span className="font-serif italic text-accent">{t('resources.title2')}</span>
        </h3>
        <p className="mb-10 max-w-2xl text-secondary">{t('resources.desc')}</p>
        
        {/* Resource Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-3 text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
              <p className="mt-4 text-muted">{t('resources.loading')}</p>
            </div>
          ) : error ? (
            <div className="col-span-3 text-center py-12">
              <p className="text-red-500">{t('common.errorLoading', { section: t('nav.resources'), message: error })}</p>
            </div>
          ) : resources.length === 0 ? (
            <div className="col-span-3 text-center py-12">
              <p className="text-muted">{t('resources.empty')}</p>
            </div>
          ) : (
            resources.map((resource) => {
              // ✅ FIX: Use the exact lowercase keys from JSON and resolve URLs
              const imgUrl = resolveImageUrl(resource.imageurl);
              const downloadUrl = resolveImageUrl(resource.downloadurl);
              
              return (
                <SolidCard key={resource.id} className="overflow-hidden group flex flex-col">
                  {/* Image Section */}
                  <div className="overflow-hidden">
                    <img 
                      src={imgUrl || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=500&fit=crop'} 
                      alt={resource.title} 
                      className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500" 
                      loading="lazy" 
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=500&fit=crop';
                      }}
                    />
                  </div>
                  
                  {/* Content Section */}
                  <div className="p-6 flex flex-col flex-grow">
                    {resource.category && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-fenote-50 text-accent w-fit">{resource.category}</span>
                    )}
                    <h4 className="font-semibold mt-3 mb-2 text-primary">{resource.title}</h4>
                    <p className="text-sm mb-6 text-muted line-clamp-3 flex-grow">{resource.description || resource.desc}</p>
                    
                    {/* Download Button pushed to the bottom */}
                    <div className="mt-auto">
                      {downloadUrl ? (
                        <a 
                          href={downloadUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          download // ✅ Instructs the browser to download the file instead of navigating
                          className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-fenote-500 to-mint-500 text-white hover:shadow-lg transition-all"
                        >
                          <Icon icon="solar:download-minimalistic-bold" className="text-base" /> {t('resources.download')}
                        </a>
                      ) : (
                        <span className="text-xs text-muted italic">{t('resources.noFile')}</span>
                      )}
                    </div>
                  </div>
                </SolidCard>
              );
            })
          )}
        </div>
        
        {/* Disclaimer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted">
            <Icon icon="solar:info-circle-bold" className="inline text-accent" /> {t('resources.disclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
}