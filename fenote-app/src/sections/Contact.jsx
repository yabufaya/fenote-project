import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { SolidCard } from '../components/common/Cards';
import { api } from '../services/api';
import { usePublicRealtime } from '../hooks/usePublicRealtime';
import { revealItem } from '../utils/scrollFlow';

export default function Contact() {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  usePublicRealtime(['contact'], () => setRefreshKey((k) => k + 1));
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [contactInfo, setContactInfo] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState('');

  useEffect(() => {
    const fetchContact = async () => {
      try {
        const response = await api.getContact();
        setContactInfo(response.data);
      } catch (err) {
        console.error('Error fetching contact info:', err);
      }
    };
    fetchContact();
  }, [refreshKey]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setSendStatus('');
    try {
      await api.sendContactMessage(formData);
      setSendStatus(t('contact.success'));
      setFormData({ name: '', email: '', message: '' });
    } catch (err) {
      setSendStatus(t('contact.error'));
    } finally {
      setSending(false);
    }
  };

  const c = contactInfo;

  return (
    <section id="contact" className="py-20 bg-glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14" {...revealItem(0)}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-fenote-50 text-accent">
            <Icon icon="solar:letter-bold" /> {t('contact.badge')}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-primary">
            {t('contact.title1')} <span className="font-serif italic text-accent">{t('contact.title2')}</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-10">
          <SolidCard className="p-8" {...revealItem(0, 'left')}>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2 text-primary">{t('contact.name')}</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t('contact.namePlaceholder')}
                  className="w-full px-4 py-3 rounded-xl border border-theme bg-primary text-primary text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-primary">{t('contact.email')}</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t('contact.emailPlaceholder')}
                  className="w-full px-4 py-3 rounded-xl border border-theme bg-primary text-primary text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-primary">{t('contact.message')}</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder={t('contact.messagePlaceholder')}
                  className="w-full px-4 py-3 rounded-xl border border-theme bg-primary text-primary text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
                  rows="4"
                  required
                ></textarea>
              </div>
              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 rounded-xl font-medium text-white bg-gradient-to-r from-fenote-500 to-mint-500 hover:shadow-lg transition disabled:opacity-60"
              >
                {sending ? t('contact.sending') : t('contact.send')}
              </button>
              {sendStatus && (
                <p className={`text-sm text-center ${sendStatus === t('contact.error') ? 'text-red-500' : 'text-mint-500'}`}>
                  {sendStatus}
                </p>
              )}
            </form>
          </SolidCard>

          <div className="space-y-5">
            <div className="flex items-start gap-4" {...revealItem(1, 'right')}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-fenote-50">
                <Icon icon="solar:map-point-bold" className="text-lg text-accent" />
              </div>
              <div>
                <div className="font-medium text-sm text-primary">{c?.loc_title || t('common.loading')}</div>
                <div className="text-xs text-muted mt-0.5">{c?.loc_subtitle || ''}</div>
              </div>
            </div>

            <div className="flex items-start gap-4" {...revealItem(2, 'right')}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-mint-50">
                <Icon icon="solar:phone-bold" className="text-lg text-mint" />
              </div>
              <div>
                <div className="font-medium text-sm text-primary">{c?.phone_title || t('common.loading')}</div>
                <div className="text-xs text-muted mt-0.5">{c?.phone_subtitle || ''}</div>
              </div>
            </div>

            <div className="flex items-start gap-4" {...revealItem(3, 'right')}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-purple-50">
                <Icon icon="solar:letter-bold" className="text-lg text-purple-500" />
              </div>
              <div>
                <div className="font-medium text-sm text-primary">{c?.email_title || t('common.loading')}</div>
                <div className="text-xs text-muted mt-0.5">{c?.email_subtitle || ''}</div>
              </div>
            </div>

            <div className="flex items-start gap-4" {...revealItem(4, 'right')}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-50">
                <Icon icon="solar:clock-circle-bold" className="text-lg text-amber-500" />
              </div>
              <div>
                <div className="font-medium text-sm text-primary">{c?.hours_title || t('common.loading')}</div>
                <div className="text-xs text-muted mt-0.5">{c?.hours_subtitle || ''}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
