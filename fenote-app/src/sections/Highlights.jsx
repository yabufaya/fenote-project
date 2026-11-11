import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { SolidCard } from '../components/common/Cards';
import { api } from '../services/api';
import { usePublicRealtime } from '../hooks/usePublicRealtime';
import { revealItem } from '../utils/scrollFlow';

const SITE_URL = import.meta.env.VITE_PUBLIC_SITE_URL || 'https://fenotepsych.com';

const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return url.startsWith('/') ? url : `/${url}`;
};


export default function Highlights() {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  usePublicRealtime(['highlight'], () => setRefreshKey((k) => k + 1));
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHighlight, setSelectedHighlight] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchHighlights = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.getHighlight();

        if (response.success && response.data) {
          // The API returns a single object, so we wrap it in an array for the grid.
          // If you later update the API to return an array, this handles that too.
          const data = Array.isArray(response.data) ? response.data : [response.data];
          setHighlights(data);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching highlights:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHighlights();
  }, [refreshKey]);

  const handleReadMore = (highlight) => {
    setSelectedHighlight(highlight);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedHighlight(null);
  };

  return (
    <>
      <section id="highlights" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-14" {...revealItem(0)}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-amber-50 text-amber-500">
              <Icon icon="solar:star-bold" /> {t('highlights.badge')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-primary">
              {t('highlights.title1')} <span className="font-serif italic text-accent">{t('highlights.title2')}</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {loading ? (
              <div className="col-span-2 text-center py-12" data-reveal="fade">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                <p className="mt-4 text-muted">{t('highlights.loading')}</p>
              </div>
            ) : error ? (
              <div className="col-span-2 text-center py-12" data-reveal="fade">
                <p className="text-red-500">{t('common.errorLoading', { section: t('highlights.badge'), message: error })}</p>
              </div>
            ) : highlights.length === 0 ? (
              <div className="col-span-2 text-center py-12" data-reveal="fade">
                <p className="text-muted">{t('highlights.empty')}</p>
              </div>
            ) : (
              highlights.map((highlight, i) => (
                <SolidCard key={highlight.id} className="overflow-hidden group" {...revealItem(i)}>
                  <div className="overflow-hidden">
                    <img
                      src={resolveImageUrl(highlight.image_url || highlight.imageUrl || highlight.img)}
                      alt={highlight.title}
                      className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=500&fit=crop';
                      }}
                    />
                  </div>
                  <div className="p-6">
                    {highlight.category && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-fenote-50 text-accent">{highlight.category}</span>
                    )}
                    <h3 className="font-semibold mt-3 mb-2 text-lg text-primary">{highlight.title}</h3>
                    <p className="text-sm mb-4 text-muted line-clamp-3">{highlight.description}</p>

                    <button
                      onClick={() => handleReadMore(highlight)}
                      className="text-sm font-medium flex items-center gap-1 text-accent group-hover:gap-2 transition-all"
                    >
                      {t('highlights.readMore')} <Icon icon="solar:arrow-right-linear" />
                    </button>
                  </div>
                </SolidCard>
              ))
            )}
          </div>

        </div>
      </section>

      {/* Highlight Pop-up Modal */}
      {isModalOpen && selectedHighlight && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 bg-white/90 rounded-full p-2 hover:bg-white transition-colors z-10 shadow-sm"
            >
              <Icon icon="solar:close-circle-bold" className="text-xl text-gray-700" />
            </button>

            <img
              src={resolveImageUrl(selectedHighlight.image_url || selectedHighlight.imageUrl || selectedHighlight.img)}
              alt={selectedHighlight.title}
              className="w-full aspect-video object-cover rounded-t-2xl"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=500&fit=crop';
              }}
            />

            <div className="p-6">
              {selectedHighlight.category && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-fenote-50 text-accent">{selectedHighlight.category}</span>
              )}
              <h3 className="font-semibold mt-3 mb-3 text-2xl text-primary">{selectedHighlight.title}</h3>
              <p className="text-secondary leading-relaxed">{selectedHighlight.description}</p>

              {/* Added the read_more_link button from your API data */}
              {selectedHighlight.read_more_link && (
                <a
                  href={selectedHighlight.read_more_link.startsWith('http') ? selectedHighlight.read_more_link : `${SITE_URL}${selectedHighlight.read_more_link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-full font-medium hover:bg-opacity-90 transition-all text-sm"
                >
                  {t('highlights.visitPage')} <Icon icon="solar:arrow-right-linear" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
