import { useState } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import SlideMenu from './SlideMenu';

export default function Header({ setOverlay }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();

  const isAmharic = String(i18n.language || 'en').toLowerCase().startsWith('am');
  const toggleLanguage = () => {
    i18n.changeLanguage(isAmharic ? 'en' : 'am');
  };

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 transition-all duration-300 py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 rounded-2xl px-4 sm:px-6 bg-glass shadow-theme">
            
            {/* Logo */}
            <a href="#hero" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-fenote-500 to-mint-500">
                <Icon icon="solar:heart-pulse-bold" className="text-white text-lg" />
              </div>
              <span className="font-bold text-lg tracking-tight text-primary">Fenote</span>
            </a>
            
            {/* Desktop Nav - ADDED HOME LINK HERE */}
            <nav className="hidden lg:flex items-center gap-5">
              <a href="#hero" className="text-sm font-medium hover:text-fenote-500 transition text-secondary">{t('nav.home')}</a>
              <a href="#about" className="text-sm font-medium hover:text-fenote-500 transition text-secondary">{t('nav.about')}</a>
              <a href="#blog" className="text-sm font-medium hover:text-fenote-500 transition text-secondary">{t('nav.blog')}</a>
              <a href="#services" className="text-sm font-medium hover:text-fenote-500 transition text-secondary">{t('nav.services')}</a>
              <a href="#team" className="text-sm font-medium hover:text-fenote-500 transition text-secondary">{t('nav.team')}</a>
              <button onClick={() => setOverlay('gallery')} className="text-sm font-medium hover:text-fenote-500 transition text-secondary">{t('nav.gallery')}</button>
              <button onClick={() => setOverlay('resources')} className="text-sm font-medium hover:text-fenote-500 transition text-secondary">{t('nav.resources')}</button>
              <button onClick={() => setOverlay('payment')} className="text-sm font-medium hover:text-fenote-500 transition text-secondary">{t('nav.payments')}</button> {/* ADD THIS */}
              <a href="#contact" className="text-sm font-medium hover:text-fenote-500 transition text-secondary">{t('nav.contact')}</a>
            </nav>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
              
              {/* Language Toggle */}
              <button
                type="button"
                onClick={toggleLanguage}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-card border border-theme hover:bg-fenote-50 transition text-xs font-semibold text-secondary"
                aria-label={isAmharic ? t('nav.switchToEnglish') : t('nav.switchToAmharic')}
                aria-pressed={isAmharic}
                title={t('nav.toggleLanguage')}
              >
                <Icon icon="solar:global-bold" className="text-base text-accent" />
                <span className={`px-1.5 py-0.5 rounded ${isAmharic ? 'text-muted' : 'bg-fenote-500 text-white'}`}>EN</span>
                <span className={`px-1.5 py-0.5 rounded ${isAmharic ? 'bg-fenote-500 text-white' : 'text-muted'}`}>AM</span>
              </button>

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="w-14 h-7 rounded-full p-1 cursor-pointer border-none transition-all duration-400 bg-gradient-to-r from-amber-400 to-orange-500 dark:from-indigo-500 dark:to-blue-500"
                aria-label={isDark ? t('nav.lightMode') : t('nav.darkMode')}
                title={t('nav.toggleTheme')}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center transition-transform duration-400 ${isDark ? 'translate-x-7' : 'translate-x-0'}`}>
                  <Icon icon={isDark ? "solar:moon-bold" : "solar:sun-bold"} className={`text-xs ${isDark ? 'text-indigo-400' : 'text-amber-500'}`} />
                </div>
              </button>

              {/* CTA Button */}
              
              <button onClick={() => setOverlay('book')} className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-fenote-500 to-mint-500 hover:shadow-lg transition">
                  <Icon icon="solar:calendar-bold" className="text-base" /> {t('nav.bookNow')}
              </button>

              {/* Mobile Hamburger */}
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-expanded={menuOpen}
                aria-controls="mobile-slide-menu"
                className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-fenote-500/10 to-mint-500/10 border border-theme text-primary hover:from-fenote-500 hover:to-mint-500 hover:text-white hover:shadow-lg active:scale-90 transition"
                aria-label={t('nav.openMenu')}
              >
                <Icon icon="solar:hamburger-menu-linear" className="text-xl" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <SlideMenu id="mobile-slide-menu" isOpen={menuOpen} onClose={() => setMenuOpen(false)} setOverlay={(o) => { setMenuOpen(false); setTimeout(() => setOverlay(o), 300); }} />
    </>
  );
}