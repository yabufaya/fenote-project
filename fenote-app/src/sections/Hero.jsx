import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { usePublicRealtime } from '../hooks/usePublicRealtime';
import { revealDelay, revealItem } from '../utils/scrollFlow';

function cleanLine(value) {
  return String(value || '').replace(/^\*{1,3}/, '').replace(/\*{1,3}$/, '').trim();
}

function splitLines(value) {
  return String(value || '').split(/\r?\n/).map(cleanLine).filter(Boolean);
}

export default function Hero({ setOverlay }) {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  usePublicRealtime(['hero_content', 'hero_slide'], () => setRefreshKey((k) => k + 1));
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroData, setHeroData] = useState({ content: {}, slides: [] });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.getHeroData();
        setHeroData(response.data || { content: {}, slides: [] });
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, [refreshKey]);

  const images = heroData.slides || [];

  useEffect(() => {
    if (images.length === 0) return;
    const timer = setInterval(() => setCurrentSlide(prev => (prev + 1) % images.length), 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  const c = heroData.content || {};
  const hasContent = Boolean(c.title_quote || c.below_lines);
  const titleQuote = c.title_quote || (!hasContent ? [t('hero.title1'), t('hero.title2')].join('\n') : '');
  const belowLines = c.below_lines || (!hasContent ? [t('hero.desc1'), t('hero.desc2'), t('hero.desc3')].join('\n') : '');
  const titleParts = splitLines(titleQuote);
  const lines = splitLines(belowLines);

  useEffect(() => { setCurrentSlide(0); }, [images.length]);

  return (
    <section id="hero" className="min-h-screen flex items-center pt-24 pb-16 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-6 bg-card border border-theme text-accent" {...revealItem(0, 'left')}>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> {t('hero.tag')}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-6 text-primary" {...revealItem(1, 'left')}>
              {titleParts[0] || ''}
              {titleParts.slice(1).map((line, i) => (
                <span key={i}>
                  <br />
                  <span className={i === 0 ? 'font-serif italic bg-gradient-to-r from-fenote-500 to-mint-500 bg-clip-text text-transparent' : ''}>{line}</span>
                </span>
              ))}
            </h1>
            {lines.map((line, i) => (
              <p key={i} data-reveal="left" style={revealDelay(2 + i)} className={`max-w-lg text-secondary ${i === 0 ? 'text-lg mb-4' : 'text-base mb-2'} ${i === lines.length - 1 ? 'mb-8 font-semibold text-accent' : ''}`}>{line}</p>
            ))}

            <div className="flex flex-wrap gap-4" data-reveal="left" style={revealDelay(2 + lines.length)}>
              <button
                onClick={() => setOverlay('book')}
                className="px-8 py-4 rounded-2xl font-medium text-white inline-flex items-center gap-2 bg-gradient-to-r from-fenote-500 to-mint-500 hover:shadow-xl hover:scale-105 transition shadow-lg border-none cursor-pointer"
              >
                <Icon icon="solar:calendar-bold" /> {t('hero.cta')}
              </button>
              <a href="#services" className="px-8 py-4 rounded-2xl font-medium flex items-center gap-2 bg-card border border-theme text-primary hover:shadow-lg transition no-underline">
                {t('hero.ctaSecondary')} <Icon icon="solar:arrow-right-linear" />
              </a>
            </div>
          </div>

          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-xl bg-gray-100" {...revealItem(1, 'right')}>
            {images.length > 0 ? (
              <>
                {images.map((slide, i) => (
                  <img
                    key={slide.id}
                    src={slide.imageurl}
                    alt={t('hero.slideAlt', { number: i + 1 })}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${currentSlide === i ? 'opacity-100' : 'opacity-0'}`}
                  />
                ))}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {images.map((_, i) => (
                    <button key={i} onClick={() => setCurrentSlide(i)} aria-label={t('hero.slideAlt', { number: i + 1 })} className={`w-3 h-3 rounded-full transition border-none cursor-pointer ${currentSlide === i ? 'bg-white scale-125' : 'bg-white/50'}`} />
                  ))}
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">{t('hero.noSlides')}</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
