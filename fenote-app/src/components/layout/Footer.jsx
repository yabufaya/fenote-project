import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { usePublicRealtime } from '../../hooks/usePublicRealtime';
import { getMapUrl } from '../../utils/mapUrl';
import { revealItem } from '../../utils/scrollFlow';

export default function Footer({ setOverlay }) {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  usePublicRealtime(['contact'], () => setRefreshKey((k) => k + 1));
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeError, setSubscribeError] = useState('');
  const [contactData, setContactData] = useState(null); // ✅ State for DB data

  useEffect(() => {
    const fetchContact = async () => {
      try {
        const response = await api.getContact();
        setContactData(response.data);
      } catch (err) {
        console.error('Error fetching footer data:', err);
      }
    };
    fetchContact();
  }, [refreshKey]);

  const c = contactData; // shorthand

  const isClosed = (hours) => {
    const value = (hours || '').toLowerCase();
    return value === t('footer.closed').toLowerCase() || value === 'closed';
  };

  // ✅ Dynamic Opening Hours from Database
  const openingHours = [
    { day: t('footer.mon'), hours: isClosed(c?.mon_hours) ? t('footer.closed') : (c?.mon_hours || '8:00 - 19:00'), isClosed: isClosed(c?.mon_hours) },
    { day: t('footer.tue'), hours: isClosed(c?.tue_hours) ? t('footer.closed') : (c?.tue_hours || '8:00 - 19:00'), isClosed: isClosed(c?.tue_hours) },
    { day: t('footer.wed'), hours: isClosed(c?.wed_hours) ? t('footer.closed') : (c?.wed_hours || '8:00 - 19:00'), isClosed: isClosed(c?.wed_hours) },
    { day: t('footer.thu'), hours: isClosed(c?.thu_hours) ? t('footer.closed') : (c?.thu_hours || '8:00 - 19:00'), isClosed: isClosed(c?.thu_hours) },
    { day: t('footer.fri'), hours: isClosed(c?.fri_hours) ? t('footer.closed') : (c?.fri_hours || '8:00 - 19:00'), isClosed: isClosed(c?.fri_hours) },
    { day: t('footer.sat'), hours: isClosed(c?.sat_hours) ? t('footer.closed') : (c?.sat_hours || '8:00 - 17:00'), isClosed: isClosed(c?.sat_hours) },
    { day: t('footer.sun'), hours: isClosed(c?.sun_hours) ? t('footer.closed') : (c?.sun_hours || t('footer.closed')), isClosed: true }
  ];

  // ✅ Dynamic Social Links from Database
  const socialLinks = [
    { name: 'Facebook', icon: 'mdi:facebook', href: c?.facebook_url || '#', gradient: 'from-[#1877F2] to-[#0D5BBF]', shadowColor: 'shadow-blue-500/30' },
    { name: 'Instagram', icon: 'mdi:instagram', href: c?.instagram_url || '#', gradient: 'from-[#833AB4] via-[#E4405F] to-[#FCAF45]', shadowColor: 'shadow-pink-500/30' },
    { name: 'Twitter', icon: 'ri:twitter-x-fill', href: c?.twitter_url || '#', gradient: 'from-[#14171A] to-[#657786]', shadowColor: 'shadow-gray-500/30' },
    { name: 'YouTube', icon: 'mdi:youtube', href: c?.youtube_url || '#', gradient: 'from-[#FF0000] to-[#CC0000]', shadowColor: 'shadow-red-500/30' },
    { name: 'LinkedIn', icon: 'mdi:linkedin', href: c?.linkedin_url || '#', gradient: 'from-[#0A66C2] to-[#004182]', shadowColor: 'shadow-sky-500/30' }
  ];

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email || subscribing) return;
    setSubscribing(true);
    setSubscribeError('');
    try {
      await api.subscribe(email);
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 4000);
    } catch (err) {
      setSubscribeError(t('footer.subscribeError'));
    } finally {
      setSubscribing(false);
    }
  };

  // Helper to render newlines properly
  const renderAddress = (text) => {
    if (!text) return '';
    return text.split('\\n').join('\n').split('\n').map((line, i) => (
      <span key={i}>{line}<br /></span>
    ));
  };

  return (
    <footer className="relative overflow-hidden">
      {/* ── Feedback / Newsletter Banner ── */}
      <div className="relative bg-gradient-to-r from-fenote-600 via-fenote-500 to-mint-500 py-14 px-4">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-mint-400/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Left – Text */}
          <div className="text-center lg:text-left max-w-lg" {...revealItem(0, 'left')}>
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4">
              <Icon icon="solar:letter-bold" className="text-white text-sm" />
              <span className="text-white/90 text-xs font-medium tracking-wide uppercase">{t('footer.stayConnected')}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
              {t('footer.newsletterTitle')}
            </h3>
            <p className="text-white/75 text-sm mt-2">
              {t('footer.newsletterDesc')}
            </p>
          </div>

          {/* Right – Email Form */}
          <div className="w-full lg:w-auto" {...revealItem(1, 'right')}>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Icon icon="solar:mailbox-bold" className="absolute left-4 top-1/2 -translate-y-1/2 text-fenote-300 text-lg" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('footer.emailPlaceholder')}
                  className="w-full sm:w-80 pl-12 pr-4 py-3.5 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 transition"
                  required
                />
              </div>
              <button
                type="submit"
                className="px-8 py-3.5 rounded-xl bg-white text-fenote-600 font-semibold text-sm hover:bg-white/90 hover:shadow-lg hover:shadow-white/20 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
              >
                {subscribed ? (
                  <>
                    <Icon icon="solar:check-circle-bold" className="text-lg text-green-500" />
                    {t('footer.subscribed')}
                  </>
                ) : (
                  <>
                    <Icon icon="solar:arrow-right-bold" className="text-lg" />
                    {subscribing ? t('footer.subscribing') : t('footer.subscribe')}
                  </>
                )}
              </button>
            </form>
            {subscribeError ? (
              <p className="text-red-100 text-xs mt-2 text-center sm:text-left">{subscribeError}</p>
            ) : (
              <p className="text-white/50 text-xs mt-2 text-center sm:text-left">
                {t('footer.privacyNote')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Map / Find Us Section ── */}
      <div className="relative bg-gradient-to-b from-secondary to-secondary/80 py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Map Info */}
            <div {...revealItem(0, 'left')}>
              <div className="inline-flex items-center gap-2 bg-fenote-500/10 rounded-full px-4 py-1.5 mb-4">
                <Icon icon="solar:map-point-bold" className="text-fenote-500 text-sm" />
                <span className="text-fenote-500 text-xs font-semibold tracking-wide uppercase">{t('contact.findUs')}</span>
              </div>
              <h3 className="text-xl font-bold text-primary mb-3">{t('contact.visitOffice')}</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 group">
                  <div className="w-9 h-9 rounded-lg bg-fenote-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-fenote-500/20 transition">
                    <Icon icon="solar:map-point-bold" className="text-fenote-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">{t('contact.addressLabel')}</p>
                    <p className="text-xs text-muted">{c ? renderAddress(c.full_address) : t('common.loading')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 group">
                  <div className="w-9 h-9 rounded-lg bg-mint-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-mint-500/20 transition">
                    <Icon icon="solar:phone-bold" className="text-mint-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">{t('contact.phoneLabel')}</p>
                    <p className="text-xs text-muted">{c?.full_phone || t('common.loading')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 group">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/20 transition">
                    <Icon icon="solar:letter-bold" className="text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">{t('contact.emailLabel')}</p>
                    <p className="text-xs text-muted">{c?.full_email || t('common.loading')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Single embedded map — Contact section no longer loads a second copy */}
            <div className="relative rounded-2xl overflow-hidden border border-theme shadow-lg shadow-black/5 group">
              {/* Top overlay action bar */}
              <div className="absolute top-3 right-3 z-20">
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=Bole,+Addis+Ababa,+Ethiopia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary/90 hover:bg-primary text-secondary text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md transition flex items-center gap-1.5 backdrop-blur-sm"
                >
                  <Icon icon="solar:routing-2-bold" className="text-fenote-500 text-sm" />
                  {t('contact.getDirections', 'Get Directions')}
                </a>
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-secondary/50 to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

              {c?.map_embed_url ? (
                <iframe
                  title={t('contact.mapTitle')}
                  src={getMapUrl(c.map_embed_url)}
                  className="w-full h-56 md:h-64 border-0 brightness-75 contrast-100 group-hover:brightness-100 transition-all duration-500"
                  allowFullScreen=""
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-56 md:h-64 bg-gray-100 flex items-center justify-center text-gray-400">
                  {t('common.mapLoading')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Footer Grid ── */}
      <div className="footer-dark border-t border-white/10 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">

            {/* Column 1: Logo & Desc & Socials */}
            <div {...revealItem(0)}>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-fenote-500 to-mint-500 shadow-lg shadow-fenote-500/20">
                  <Icon icon="solar:heart-pulse-bold" className="text-white text-xl" />
                </div>
                <span className="font-bold text-lg text-slate-100">Fenote</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                {t('footer.description')}
              </p>
              <div className="mt-6">
                <p className="text-xs font-semibold text-slate-300/80 uppercase tracking-wider mb-3">{t('footer.followUs')}</p>
                <div className="flex gap-2.5">
                  {socialLinks.map((social) => (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group/icon relative w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 bg-white/5 hover:border-transparent hover:shadow-lg ${social.shadowColor} transition-all duration-300 hover:-translate-y-1`}
                      aria-label={social.name}
                    >
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${social.gradient} opacity-0 group-hover/icon:opacity-100 transition-opacity duration-300`} />
                      <Icon icon={social.icon} className="text-lg text-slate-400 group-hover/icon:text-white transition-colors duration-300 relative z-10" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div {...revealItem(1)}>
              <h4 className="font-semibold text-sm mb-5 text-slate-100 flex items-center gap-2">
                <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-fenote-500 to-mint-500" />
                {t('footer.quickLinks')}
              </h4>
              <ul className="space-y-2.5 text-sm">
                {[
                  { label: t('nav.about'), href: '#about', isButton: false },
                  { label: t('nav.blog'), href: '#blog', isButton: false },
                  { label: t('nav.gallery'), overlay: 'gallery' },
                  { label: t('nav.resources'), overlay: 'resources' },
                  { label: t('nav.payments'), overlay: 'payment' },
                ].map((item, i) => (
                  <li key={i}>
                    {item.isButton !== false && item.overlay ? (
                      <button onClick={() => setOverlay(item.overlay)} className="text-slate-400 hover:text-fenote-500 transition-colors duration-200 flex items-center gap-1.5 group">
                        <span className="w-0 group-hover:w-2 h-0.5 bg-fenote-500 rounded-full transition-all duration-200" />
                        {item.label}
                      </button>
                    ) : (
                      <a href={item.href} className="text-slate-400 hover:text-fenote-500 transition-colors duration-200 flex items-center gap-1.5 group">
                        <span className="w-0 group-hover:w-2 h-0.5 bg-fenote-500 rounded-full transition-all duration-200" />
                        {item.label}
                      </a>
                    )}
                  </li>
                ))}
                <li>
                  <button onClick={() => setOverlay('book')} className="text-fenote-500 font-semibold hover:text-fenote-400 transition-colors duration-200 flex items-center gap-1.5 group">
                    <Icon icon="solar:arrow-right-bold" className="text-xs group-hover:translate-x-0.5 transition-transform" />
                    {t('nav.bookNow')}
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Services */}
            <div {...revealItem(2)}>
              <h4 className="font-semibold text-sm mb-5 text-slate-100 flex items-center gap-2">
                <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-mint-500 to-fenote-500" />
                {t('nav.services')}
              </h4>
              <ul className="space-y-2.5 text-sm">
                {[
                  { label: t('footer.individualTherapy'), icon: 'solar:user-heart-bold' },
                  { label: t('footer.groupTherapy'), icon: 'solar:users-group-rounded-bold' },
                  { label: t('footer.corporateWellness'), icon: 'solar:buildings-bold' },
                ].map((item, i) => (
                  <li key={i}>
                    <a href="#services" className="text-slate-400 hover:text-fenote-500 transition-colors duration-200 flex items-center gap-2 group">
                      <Icon icon={item.icon} className="text-sm text-fenote-500/50 group-hover:text-fenote-500 transition-colors" />
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Opening Hours (Dynamic) */}
            <div {...revealItem(3)}>
              <h4 className="font-semibold text-sm mb-5 text-slate-100 flex items-center gap-2">
                <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-amber-400 to-amber-600" />
                <Icon icon="solar:clock-circle-bold" className="text-amber-500" />
                {t('footer.hours')}
              </h4>
              <ul className="space-y-1.5 text-sm">
                {openingHours.map((item, i) => (
                  <li key={i} className="flex justify-between items-center py-1 border-b border-white/10 last:border-0">
                    <span className="text-slate-400">{item.day}</span>
                    <span className={`font-medium text-xs px-2 py-0.5 rounded-md ${item.isClosed ? 'bg-red-500/10 text-red-400' : 'bg-fenote-500/10 text-fenote-300'}`}>
                      {item.hours}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 5: Contact Card (Dynamic) */}
            <div {...revealItem(4)}>
              <h4 className="font-semibold text-sm mb-5 text-slate-100 flex items-center gap-2">
                <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-fenote-500 to-fenote-700" />
                {t('footer.contactTitle')}
              </h4>
              <div className="space-y-3">
                <a href={`mailto:${c?.full_email || '#'}`} className="flex items-center gap-3 p-2.5 rounded-xl bg-fenote-500/5 border border-fenote-500/10 hover:bg-fenote-500/10 transition group">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fenote-500 to-fenote-600 flex items-center justify-center shadow-sm shadow-fenote-500/20">
                    <Icon icon="solar:letter-bold" className="text-white text-sm" />
                  </div>
                  <span className="text-xs text-slate-400 group-hover:text-fenote-500 transition">{c?.full_email || t('common.loading')}</span>
                </a>
                <a href={`tel:${c?.full_phone || '#'}`} className="flex items-center gap-3 p-2.5 rounded-xl bg-mint-500/5 border border-mint-500/10 hover:bg-mint-500/10 transition group">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-mint-500 to-mint-600 flex items-center justify-center shadow-sm shadow-mint-500/20">
                    <Icon icon="solar:phone-bold" className="text-white text-sm" />
                  </div>
                  <span className="text-xs text-slate-400 group-hover:text-mint-500 transition">{c?.full_phone || t('common.loading')}</span>
                </a>
              </div>
            </div>
          </div>

          {/* ── Bottom Bar ── */}
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4" {...revealItem(4, 'fade')}>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md flex items-center justify-center bg-gradient-to-br from-fenote-500 to-mint-500">
                <Icon icon="solar:heart-pulse-bold" className="text-white text-[10px]" />
              </div>
              <p className="text-xs text-slate-400">
                {t('footer.copyright', { year: new Date().getFullYear() })}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <a href="#" className="hover:text-fenote-500 transition">{t('footer.privacy')}</a>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <a href="#" className="hover:text-fenote-500 transition">{t('footer.terms')}</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}