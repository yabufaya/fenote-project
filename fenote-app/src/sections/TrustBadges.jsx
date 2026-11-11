import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../components/common/Cards';
import { revealItem } from '../utils/scrollFlow';
import CountUpText from '../components/common/CountUpText';

export default function TrustBadges() {
  const { t } = useTranslation();

  const badges = [
    { icon: 'solar:shield-check-bold', color: 'text-accent', title: t('trust.licensedTitle'), desc: t('trust.licensedDesc') },
    { icon: 'solar:lock-bold', color: 'text-mint', title: t('trust.confidentialTitle'), desc: t('trust.confidentialDesc') },
    { icon: 'solar:document-medicine-bold', color: 'text-purple-500', title: t('trust.evidenceTitle'), desc: t('trust.evidenceDesc') },
    { icon: 'solar:chat-round-like-bold', color: 'text-amber-500', title: <CountUpText text={t('trust.experienceTitle')} />, desc: t('trust.experienceDesc') }
  ];

  return (
    <section className="py-12 bg-glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {badges.map((badge, i) => (
            <GlassCard key={i} className="p-6 flex flex-col items-center text-center" {...revealItem(i)}>
              <Icon icon={badge.icon} className={`text-3xl mb-3 ${badge.color}`} />
              <h4 className="font-semibold text-sm text-primary">{badge.title}</h4>
              <p className="text-xs mt-1 text-muted">{badge.desc}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
