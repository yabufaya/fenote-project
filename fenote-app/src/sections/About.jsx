import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../components/common/Cards';
import { api } from '../services/api';
import { usePublicRealtime } from '../hooks/usePublicRealtime';
import { revealDelay, revealItem } from '../utils/scrollFlow';
import CountUp from '../components/common/CountUp';

export default function About() {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  usePublicRealtime(['about'], () => setRefreshKey((k) => k + 1));
  const [aboutData, setAboutData] = useState(null);

  useEffect(() => {
    const fetchAbout = async () => {
      try {
        const response = await api.getAbout();
        setAboutData(response.data);
      } catch (err) {
        console.error('Error fetching about data:', err);
      }
    };
    fetchAbout();
  }, [refreshKey]);

  const a = aboutData || {};
  const hasContent = Boolean(a.title1 || a.title2 || a.desc1 || a.desc2);
  const titleMain = a.title1 || (!hasContent ? t('about.title1') : '');
  const titleAccent = a.title2 || (!hasContent ? t('about.title2') : '');
  const paragraphs = [
    a.desc1 || (!hasContent ? t('about.desc1_detail') : ''),
    a.desc2 || (!hasContent ? t('about.desc2_detail') : ''),
  ].filter(Boolean);

  return (
    <section id="about" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-fenote-50 text-accent" {...revealItem(0, 'left')}>
              <Icon icon="solar:info-circle-bold" /> {t('about.badge')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 tracking-tight text-primary" {...revealItem(1, 'left')}>
              {titleMain} {titleAccent && <span className="font-serif italic text-accent">{titleAccent}</span>}
            </h2>
            {paragraphs.map((p, i) => (
              <p key={i} data-reveal="left" style={revealDelay(2 + i)} className={`leading-relaxed text-secondary ${i === paragraphs.length - 1 ? 'mb-6' : 'mb-4'}`}>{p}</p>
            ))}

            <div className="flex gap-8" data-reveal="left" style={revealDelay(2 + paragraphs.length)}>
              <div>
                <div className="text-3xl font-bold text-accent"><CountUp value={a.years_experience || 12} suffix="+" /></div>
                <div className="text-xs text-muted mt-1">{t('about.stat1')}</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-mint"><CountUp value={a.clients_served || 500} suffix="+" /></div>
                <div className="text-xs text-muted mt-1">{t('about.stat2')}</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-500"><CountUp value={a.services_count ?? 9} /></div>
                <div className="text-xs text-muted mt-1">{t('about.stat3')}</div>
              </div>
            </div>
          </div>

          <div className="relative" {...revealItem(1, 'right')}>
            <img
              src={a.imageurl || '/fenote.png'}
              alt={t('about.imageAlt')}
              className="rounded-2xl w-full object-cover shadow-xl"
              style={{ aspectRatio: '4/3' }}
              loading="lazy"
            />
            <div className="absolute -bottom-4 -right-4 GlassCard p-4 rounded-xl shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-fenote-500 to-mint-500">
                  <Icon icon="solar:verified-check-bold" className="text-white text-lg" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-primary">{t('about.verified')}</div>
                  <div className="text-xs text-muted">{t('about.licensed')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
