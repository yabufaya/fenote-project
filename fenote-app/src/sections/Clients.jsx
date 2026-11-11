import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { usePublicRealtime } from '../hooks/usePublicRealtime';
import { revealItem } from '../utils/scrollFlow';

const resolveImageUrl = (url) => {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return url.startsWith('/') ? url : `/${url}`;
};

export default function Clients() {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  usePublicRealtime(['client'], () => setRefreshKey((k) => k + 1));
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fallbackImage = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='50' viewBox='0 0 150 50'%3E%3Crect width='150' height='50' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' fill='%239ca3af'%3E${encodeURIComponent(t('clients.logoFallback'))}%3C/text%3E%3C/svg%3E`;

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.getClients();
        if (response.success && Array.isArray(response.data)) {
          setClients(response.data);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching clients:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, [refreshKey]);

  const renderLogo = (client, i, duplicate = false) => (
    <div key={`${duplicate ? 'b' : 'a'}-${client.id || i}-${i}`} className="flex-shrink-0 w-48 flex items-center justify-center">
      <img
        src={resolveImageUrl(client.imageurl) || fallbackImage}
        alt={t('clients.logoAlt', { index: (i % Math.max(clients.length, 1)) + 1 })}
        className="h-14 w-auto max-w-full object-contain opacity-100 hover:scale-105 transition-transform duration-300"
        loading="eager"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = fallbackImage;
        }}
      />
    </div>
  );

  return (
    <section id="clients" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14" {...revealItem(0)}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-fenote-50 text-accent">
            <Icon icon="solar:buildings-bold" /> {t('clients.badge')}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-primary">
            {t('clients.title1')} <span className="font-serif italic text-accent">{t('clients.title2')}</span>
          </h2>
          <p className="max-w-xl mx-auto text-secondary">{t('clients.desc')}</p>
        </div>

        {loading ? (
          <div className="text-center py-12" data-reveal="fade">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            <p className="mt-3 text-muted">{t('clients.loading')}</p>
          </div>
        ) : error ? (
          <div className="text-center py-12" data-reveal="fade">
            <p className="text-red-500">{t('common.error', { message: error })}</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12 text-muted" data-reveal="fade">{t('clients.empty')}</div>
        ) : (
          <div {...revealItem(1, 'fade')}>
            <div className="clients-marquee overflow-hidden">
              <div className="marquee-track">
                <div className="marquee-group">{clients.map((client, i) => renderLogo(client, i))}</div>
                <div className="marquee-group" aria-hidden="true">{clients.map((client, i) => renderLogo(client, i, true))}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
