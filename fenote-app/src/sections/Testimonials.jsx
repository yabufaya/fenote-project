import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { usePublicRealtime } from '../hooks/usePublicRealtime';
import { revealItem } from '../utils/scrollFlow';

// ✅ Helper function to ensure the image URL points to the root directory
const resolveImageUrl = (url) => {
  if (!url) return '';
  // If the URL is already absolute (starts with http), return it as is
  if (url.startsWith('http')) return url;
  // If it's missing the leading slash, add it so it resolves from the domain root
  return url.startsWith('/') ? url : `/${url}`;
};

export default function Testimonials() {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  usePublicRealtime(['testimonial'], () => setRefreshKey((k) => k + 1));
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.getTestimonials();
        if (response.success && Array.isArray(response.data)) {
          setTestimonials(response.data);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching testimonials:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, [refreshKey]);

  return (
    <section id="testimonials" className="py-20 bg-glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-14" {...revealItem(0)}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-mint-50 text-mint-500">
            <Icon icon="solar:chat-round-like-bold" /> {t('testimonials.badge')}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-primary">
            {t('testimonials.title1')} <span className="font-serif italic text-accent">{t('testimonials.title2')}</span>
          </h2>
          <p className="max-w-2xl mx-auto text-secondary">{t('testimonials.desc')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-3 text-center py-12" data-reveal="fade">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
              <p className="mt-4 text-muted">{t('testimonials.loading')}</p>
            </div>
          ) : error ? (
            <div className="col-span-3 text-center py-12" data-reveal="fade">
              <p className="text-red-500">{t('common.errorLoading', { section: t('testimonials.badge'), message: error })}</p>
            </div>
          ) : testimonials.length === 0 ? (
            <div className="col-span-3 text-center py-12" data-reveal="fade">
              <p className="text-muted">{t('testimonials.empty')}</p>
            </div>
          ) : (
            testimonials.map((testimonial, i) => (
              <div
                key={testimonial.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col"
                {...revealItem(i)}
              >
                {/* Dynamic Star Rating */}
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Icon
                      key={i}
                      icon="solar:star-bold"
                      className={`w-4 h-4 ${i < testimonial.rate ? 'text-yellow-400' : 'text-gray-200'}`}
                    />
                  ))}
                </div>

                <p className="text-sm leading-relaxed text-secondary flex-grow mb-5">
                  "{testimonial.quote}"
                </p>

                <div className="flex items-center gap-3 mt-auto border-t border-gray-100 pt-4">
                  <img
                    // ✅ FIX: Use the exact lowercase key from JSON and resolve the URL path
                    src={resolveImageUrl(testimonial.imageurl) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop'}
                    alt={testimonial.name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-accent/20"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop';
                    }}
                  />
                  <div>
                    <p className="font-semibold text-sm text-primary">{testimonial.name}</p>
                    <p className="text-xs text-muted">{testimonial.title}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </section>
  );
}