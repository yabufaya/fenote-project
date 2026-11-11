import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { SolidCard } from '../components/common/Cards';
import { api } from '../services/api';
import { usePublicRealtime } from '../hooks/usePublicRealtime';

const CopyableField = ({ label, value }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="flex justify-between items-center bg-gray-900 rounded-xl px-4 py-3 group cursor-pointer" onClick={handleCopy}>
      <span className="text-xs text-gray-400">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-white tracking-wider">{value}</span>
        <Icon icon={copied ? 'solar:check-circle-bold' : 'solar:copy-bold'} className={`text-lg transition-colors ${copied ? 'text-green-400' : 'text-gray-500 hover:text-white'}`} />
      </div>
    </div>
  );
};

const packageStyles = {
  individual: { icon: 'solar:user-bold', color: 'text-blue-500', bg: 'bg-blue-50', gradient: 'from-blue-500 to-blue-600' },
  couple: { icon: 'solar:users-group-rounded-bold', color: 'text-pink-500', bg: 'bg-pink-50', gradient: 'from-pink-500 to-rose-500' },
  family: { icon: 'solar:home-smile-bold', color: 'text-purple-500', bg: 'bg-purple-50', gradient: 'from-purple-500 to-indigo-500' },
  training: { icon: 'solar:presentation-graph-bold', color: 'text-amber-500', bg: 'bg-amber-50', gradient: 'from-amber-500 to-orange-500' },
  phone: { icon: 'solar:phone-calling-bold', color: 'text-cyan-500', bg: 'bg-cyan-50', gradient: 'from-cyan-500 to-teal-500' },
};

export default function PaymentOverlay({ onClose }) {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  usePublicRealtime(['payment_packages', 'payment_settings', 'contact'], () => setRefreshKey((k) => k + 1));
  const [paymentData, setPaymentData] = useState({ packages: [], settings: {} });
  const [contactData, setContactData] = useState({}); // ✅ NEW: For Find Us

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch payments and contact info together
        const [payRes, contRes] = await Promise.all([
          api.getPayments(),
          api.getContact()
        ]);
        
        setPaymentData(payRes.data || { packages: [], settings: {} });
        setContactData(contRes.data || {});
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, [refreshKey]);

  const localPackages = paymentData.packages.filter(p => p.region === 'local');
  const internationalPackages = paymentData.packages.filter(p => p.region === 'international');

  const renderPackageCard = (item) => {
    const style = packageStyles[item.package_key] || packageStyles.individual;
    return (
      <div key={item.id} className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-500 blur-xl"></div>
        <SolidCard className="relative p-8 flex flex-col h-full border border-transparent group-hover:border-fenote-100 group-hover:shadow-2xl group-hover:-translate-y-2 transition-all duration-500 transform perspective-1000">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-lg ${style.bg} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
            <Icon icon={style.icon} className={`text-3xl ${style.color}`} />
          </div>
          <h4 className="font-bold text-xl text-primary mb-6">{t(`payments.${item.package_key}`)}</h4>
          <div className="space-y-3 mt-auto">
            <div className="flex justify-between items-center border-b border-dashed border-theme pb-2">
              <span className="text-sm text-muted">{t('payments.duration')}</span>
              {/* ✅ DYNAMIC */}
              <span className="text-sm font-semibold text-primary">{item.duration}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted">{t('payments.price')}</span>
              {/* ✅ DYNAMIC */}
              <span className={`text-2xl font-extrabold bg-gradient-to-r ${style.gradient} bg-clip-text text-transparent`}>{item.price}</span>
            </div>
            <div className="flex justify-between items-center border-t border-dashed border-theme pt-2">
              <span className="text-sm text-muted">{t('payments.registration')}</span>
              {/* ✅ DYNAMIC */}
              <span className="text-sm font-semibold text-primary">{item.registration_fee}</span>
            </div>
          </div>
        </SolidCard>
      </div>
    );
  };

  return (
    <div className="py-12">
      <div className="sticky top-0 z-10 px-4 sm:px-6 lg:px-8 py-4 bg-glass/80 backdrop-blur-xl border-b border-theme shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-fenote-500 to-mint-500 shadow-lg shadow-fenote-500/30">
              <Icon icon="solar:wallet-bold" className="text-white text-xl" />
            </div>
            <h2 className="font-bold text-xl text-primary">{t('nav.payments')}</h2>
          </div>
          <button onClick={onClose} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-white border border-theme text-primary hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <Icon icon="solar:arrow-left-linear" /> {t('nav.backHome')}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-20">
        
        {/* Local Client Fees */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-fenote-50 text-accent">
            <Icon icon="solar:map-point-bold" /> {t('payments.localBadge')}
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight text-primary">{t('payments.localTitle')}</h3>
          <p className="mb-10 text-secondary">{t('payments.pricingDesc')}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {localPackages.map(renderPackageCard)}
          </div>
        </div>

        {/* International Client Fees */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-mint-50 text-mint-500">
            <Icon icon="solar:global-bold" /> {t('payments.intBadge')}
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight text-primary">{t('payments.intTitle')}</h3>
          <p className="mb-10 text-secondary">{t('payments.pricingDesc')}</p>
          <div className="grid sm:grid-cols-3 gap-8">
            {internationalPackages.map(renderPackageCard)}
          </div>
        </div>

        {/* Payment Information & Methods */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-amber-50 text-amber-500">
            <Icon icon="solar:info-circle-bold" /> {t('payments.infoBadge')}
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold mb-8 tracking-tight text-primary">{t('payments.infoTitle')}</h3>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="relative group">
              <SolidCard className="p-8 h-full group-hover:shadow-2xl group-hover:-translate-y-1 transition-all duration-500 border border-transparent group-hover:border-amber-100">
                <h4 className="font-bold text-xl text-primary mb-6 flex items-center gap-2">
                  <Icon icon="solar:clipboard-list-bold" className="text-amber-500" /> {t('payments.howToPay')}
                </h4>
                <ol className="space-y-5">
                  {[1, 2, 3, 4].map((step) => (
                    <li key={step} className="flex gap-4 items-start">
                      <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-fenote-500 to-mint-500 text-white flex items-center justify-center text-sm font-bold shadow-md">{step}</span>
                      <span className="text-sm text-secondary pt-1">{t(`payments.step${step}`)}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-8 text-sm text-muted italic flex items-center gap-2 bg-amber-50 p-3 rounded-lg">
                  <Icon icon="solar:lightbulb-bolt-bold" className="text-amber-500 text-lg flex-shrink-0" /> {t('payments.stepNote')}
                </p>
              </SolidCard>
            </div>

            <div className="space-y-6">
              {/* CBE */}
              <div className="relative group">
                <SolidCard className="p-8 relative overflow-hidden h-full group-hover:shadow-2xl group-hover:-translate-y-1 transition-all duration-500 border border-transparent group-hover:border-blue-100">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-100 to-transparent rounded-bl-full opacity-50"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shadow-md border border-white p-2">
                        <img src="../public/cbe.png" alt={t('payments.cbeLogoAlt')} className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xl text-primary">CBE</h4>
                        <p className="text-xs text-muted">{t('payments.cbeSubtitle')}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {/* ✅ DYNAMIC */}
                      <CopyableField label={t('payments.accountNum')} value={paymentData.settings.cbe_account || t('payments.notAvailable')} />
                      <CopyableField label={t('payments.swiftCode')} value={paymentData.settings.cbe_swift || t('payments.notAvailable')} />
                    </div>
                  </div>
                </SolidCard>
              </div>

              {/* Telebirr */}
              <div className="relative group">
                <SolidCard className="p-8 relative overflow-hidden h-full group-hover:shadow-2xl group-hover:-translate-y-1 transition-all duration-500 border border-transparent group-hover:border-green-100">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-green-100 to-transparent rounded-bl-full opacity-50"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center shadow-md border border-white p-2">
                        <img src="../public/telebirr.png" alt={t('payments.telebirrLogoAlt')} className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xl text-primary">Telebirr</h4>
                        <p className="text-xs text-muted">{t('payments.telebirrSubtitle')}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {/* ✅ DYNAMIC */}
                      <CopyableField label={t('payments.accountNum')} value={paymentData.settings.telebirr_account || t('payments.notAvailable')} />
                      <div className="flex justify-between items-center bg-gray-900 rounded-xl px-4 py-3">
                        <span className="text-xs text-gray-400">{t('payments.swiftCode')}</span>
                        <span className="text-sm font-bold text-gray-500 italic">{t('payments.noSwift')}</span>
                      </div>
                    </div>
                  </div>
                </SolidCard>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ NEW: Find Us Section (Pulling from Contact Table) */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-fenote-50 text-accent">
            <Icon icon="solar:map-point-bold" /> {t('contact.findUs')}
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold mb-8 tracking-tight text-primary">{t('contact.visitOffice')}</h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            <SolidCard className="p-6 flex items-center gap-4 group hover:shadow-lg transition">
              <div className="w-12 h-12 rounded-xl bg-fenote-500/10 flex items-center justify-center flex-shrink-0">
                <Icon icon="solar:map-point-bold" className="text-xl text-accent" />
              </div>
              <div>
                <p className="font-semibold text-sm text-primary">{t('contact.addressLabel')}</p>
                <p className="text-xs text-muted mt-1 whitespace-pre-line">{contactData.full_address || t('common.loading')}</p>
              </div>
            </SolidCard>

            <SolidCard className="p-6 flex items-center gap-4 group hover:shadow-lg transition">
              <div className="w-12 h-12 rounded-xl bg-mint-500/10 flex items-center justify-center flex-shrink-0">
                <Icon icon="solar:phone-bold" className="text-xl text-mint" />
              </div>
              <div>
                <p className="font-semibold text-sm text-primary">{t('contact.phoneLabel')}</p>
                <p className="text-xs text-muted mt-1">{contactData.full_phone || t('common.loading')}</p>
              </div>
            </SolidCard>

            <SolidCard className="p-6 flex items-center gap-4 group hover:shadow-lg transition">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Icon icon="solar:letter-bold" className="text-xl text-purple-500" />
              </div>
              <div>
                <p className="font-semibold text-sm text-primary">{t('contact.emailLabel')}</p>
                <p className="text-xs text-muted mt-1">{contactData.full_email || t('common.loading')}</p>
              </div>
            </SolidCard>
          </div>
        </div>

      </div>
    </div>
  );
}