import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { SolidCard } from '../components/common/Cards';
import { api } from '../services/api';
import { usePublicRealtime } from '../hooks/usePublicRealtime';
import { revealItem } from '../utils/scrollFlow';

const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return url.startsWith('/') ? url : `/${url}`;
};


export default function Team() {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  usePublicRealtime(['team', 'team_members'], () => setRefreshKey((k) => k + 1));
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.getTeam();
        if (response.success && Array.isArray(response.data)) {
          // Sort by the 'order' field if it exists
          const sorted = [...response.data].sort((a, b) => (a.order || 0) - (b.order || 0));
          setTeam(sorted);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching team:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [refreshKey]);

  const handleSeeMore = (member) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMember(null);
  };

  return (
    <>
      <section id="team" className="py-20 bg-glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-14" {...revealItem(0)}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-purple-50 text-purple-500">
              <Icon icon="solar:users-group-rounded-bold" /> {t('team.badge')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-primary">
              {t('team.title1')} <span className="font-serif italic text-accent">{t('team.title2')}</span>
            </h2>
            <p className="max-w-xl mx-auto text-secondary">{t('team.desc')}</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {loading ? (
              <div className="col-span-3 text-center py-12" data-reveal="fade">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                <p className="mt-4 text-muted">{t('team.loading')}</p>
              </div>
            ) : error ? (
              <div className="col-span-3 text-center py-12" data-reveal="fade">
                <p className="text-red-500">{t('common.errorLoading', { section: t('nav.team'), message: error })}</p>
              </div>
            ) : team.length === 0 ? (
              <div className="col-span-3 text-center py-12" data-reveal="fade">
                <p className="text-muted">{t('team.empty')}</p>
              </div>
            ) : (
              team.map((member, i) => (
                <SolidCard key={member.id} className="p-8 text-center" {...revealItem(i)}>
                  <img
                    src={resolveImageUrl(member.image_url || member.imageurl || member.imageUrl)}
                    alt={member.name}
                    className={`w-28 h-28 rounded-full mx-auto mb-4 object-cover border-4 ${member.bordercolor || member.borderColor || 'border-gray-200'}`}
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop';
                    }}
                  />
                  <h3 className="font-semibold text-lg text-primary">{member.name}</h3>
                  <p className={`text-sm mb-3 font-medium ${member.textcolor || member.textColor || 'text-accent'}`}>{member.role}</p>
                  <p className="text-xs leading-relaxed text-muted line-clamp-3">{member.description}</p>
                  <button
                    onClick={() => handleSeeMore(member)}
                    className="mt-4 text-sm font-medium flex items-center gap-1 text-accent hover:gap-2 transition-all mx-auto"
                  >
                    {t('team.seeMore')} <Icon icon="solar:arrow-right-linear" />
                  </button>
                </SolidCard>
              ))
            )}
          </div>

        </div>
      </section>

      {/* Modal for team member details - Fixed Image Size */}
      {isModalOpen && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 bg-white/90 rounded-full p-2 hover:bg-white transition-colors z-10 shadow-sm"
            >
              <Icon icon="solar:close-circle-bold" className="text-xl text-gray-700" />
            </button>

            <div className="p-8 text-center">
              <img
                src={resolveImageUrl(selectedMember.image_url || selectedMember.imageurl || selectedMember.imageUrl)}
                alt={selectedMember.name}
                className={`w-32 h-32 rounded-full mx-auto object-cover border-4 ${selectedMember.bordercolor || selectedMember.borderColor || 'border-gray-200'} shadow-md mb-6`}
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop';
                }}
              />
              <h3 className="text-2xl font-bold text-primary mb-2">{selectedMember.name}</h3>
              <p className={`text-lg font-medium mb-4 ${selectedMember.textcolor || selectedMember.textColor || 'text-accent'}`}>
                {selectedMember.role}
              </p>
              <p className="text-secondary leading-relaxed text-left">
                {selectedMember.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
