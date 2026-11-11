import { useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';

const MENU_ITEMS = [
  { key: 'nav.home', href: '#hero', icon: 'solar:home-2-bold', accent: '#3B82F6', soft: 'rgba(59,130,246,.13)' },
  { key: 'nav.about', href: '#about', icon: 'solar:info-circle-bold', accent: '#14B8A6', soft: 'rgba(20,184,166,.13)' },
  { key: 'nav.blog', href: '#blog', icon: 'solar:notebook-bold', accent: '#6366F1', soft: 'rgba(99,102,241,.13)' },
  { key: 'nav.services', href: '#services', icon: 'solar:settings-bold', accent: '#10B981', soft: 'rgba(16,185,129,.13)' },
  { key: 'nav.team', href: '#team', icon: 'solar:users-group-rounded-bold', accent: '#06B6D4', soft: 'rgba(6,182,212,.13)' },
  { key: 'nav.gallery', overlay: 'gallery', icon: 'solar:gallery-bold', accent: '#EC4899', soft: 'rgba(236,72,153,.13)' },
  { key: 'nav.resources', overlay: 'resources', icon: 'solar:folder-bold', accent: '#8B5CF6', soft: 'rgba(139,92,246,.13)' },
  { key: 'nav.payments', overlay: 'payment', icon: 'solar:wallet-bold', accent: '#F59E0B', soft: 'rgba(245,158,11,.13)' },
  { key: 'nav.contact', href: '#contact', icon: 'solar:letter-bold', accent: '#F43F5E', soft: 'rgba(244,63,94,.13)' },
];

export default function SlideMenu({ isOpen, onClose, setOverlay, id = 'mobile-slide-menu' }) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  const itemInner = (item, label) => (
    <>
      <span className="mobile-menu-icon">
        <Icon icon={item.icon} className="text-xl" aria-hidden="true" />
      </span>
      <span className="mobile-menu-label">{label}</span>
      <Icon icon="solar:arrow-right-linear" className="mobile-menu-arrow text-lg" aria-hidden="true" />
    </>
  );

  return (
    <>
      <div
        className={`fixed inset-0 bg-slate-950/55 backdrop-blur-sm z-[999] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <nav
        id={id}
        aria-label={t('nav.menu')}
        aria-hidden={!isOpen}
        className={`fixed top-0 left-0 h-full w-[min(20rem,88vw)] bg-secondary z-[1000] shadow-2xl transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mobile-menu-panel h-full flex flex-col p-5 sm:p-6">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-theme">
            <span className="flex items-center gap-2.5 font-bold text-xl text-primary">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-fenote-500 to-mint-500">
                <Icon icon="solar:heart-pulse-bold" className="text-white text-lg" />
              </span>
              Fenote
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('nav.close')}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-primary hover:bg-fenote-50 hover:text-fenote-500 active:scale-90 transition"
            >
              <Icon icon="solar:close-circle-bold" className="text-2xl" />
            </button>
          </div>

          <ul className="space-y-1.5 flex-1 overflow-y-auto pr-1">
            {MENU_ITEMS.map((item, index) => {
              const label = t(item.key);
              const style = {
                '--item-accent': item.accent,
                '--item-soft': item.soft,
                animationDelay: `${index * 35}ms`,
              };
              const className = 'mobile-menu-link animate-scale-in';
              return (
                <li key={item.key}>
                  {item.href ? (
                    <a href={item.href} onClick={onClose} className={className} style={style} aria-label={label}>
                      {itemInner(item, label)}
                    </a>
                  ) : (
                    <button type="button" onClick={() => setOverlay(item.overlay)} className={className} style={style} aria-label={label}>
                      {itemInner(item, label)}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-5 pt-5 border-t border-theme">
            <button
              type="button"
              onClick={() => { onClose(); setTimeout(() => setOverlay('book'), 300); }}
              className="mobile-menu-cta group w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-white bg-gradient-to-r from-fenote-500 via-violet-500 to-mint-500 hover:shadow-lg active:scale-[0.98] transition"
            >
              <Icon icon="solar:calendar-bold" className="text-lg" />
              {t('nav.bookNow')}
              <Icon icon="solar:arrow-right-linear" className="text-lg group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
