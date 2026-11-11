import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { SolidCard } from '../components/common/Cards';
import { api } from '../services/api';
import { usePublicRealtime } from '../hooks/usePublicRealtime';
import { revealItem } from '../utils/scrollFlow';

const colorPalette = [
  'bg-blue-50 text-blue-600',
  'bg-green-50 text-green-600',
  'bg-purple-50 text-purple-600',
  'bg-cyan-50 text-cyan-600',
  'bg-amber-50 text-amber-600',
  'bg-red-50 text-red-600',
  'bg-pink-50 text-pink-600',
  'bg-orange-50 text-orange-600',
];

const categoryBadges = {
  therapy: 'bg-indigo-50 text-indigo-600',
  coaching: 'bg-teal-50 text-teal-600',
  training: 'bg-purple-50 text-purple-600',
  corporate: 'bg-amber-50 text-amber-600',
};

const categoryIcons = {
  training: 'solar:notebook-bold',
};

export default function Services() {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  usePublicRealtime(['services'], () => setRefreshKey((k) => k + 1));
  const [servicesData, setServicesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await api.getServices();
        const data = Array.isArray(response?.data) ? response.data : [];
        setServicesData(data);
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, [refreshKey]);

  const filteredServices = filter === 'all' 
    ? servicesData 
    : servicesData.filter(s => s && s.category === filter);

  const handleReadMore = (service) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedService(null);
  };

  if (loading) {
    return <div className="text-center py-20"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <>
      <section id="services" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-8" {...revealItem(0)}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-teal-50 text-teal-600">
              <Icon icon="solar:stethoscope-bold" /> {t('services.badge')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-gray-900">
              {t('services.title1')} <span className="font-serif italic text-blue-600">{t('services.title2')}</span>
            </h2>
            <p className="max-w-2xl mx-auto text-gray-500">{t('services.desc')}</p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-10" {...revealItem(1, 'fade')}>
            {['all', 'therapy', 'coaching', 'training', 'corporate'].map(f => (
              <button 
                key={f} 
                onClick={() => setFilter(f)} 
                className={`px-5 py-2 rounded-full text-sm font-medium border transition ${
                  filter === f 
                    ? 'bg-blue-600 text-white border-transparent' 
                    : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'
                }`}
              >
                 {t(f === 'all' ? 'services.filterAll' : `services.filter${f.charAt(0).toUpperCase() + f.slice(1)}`)}
              </button>
            ))}
          </div>

          {/* Cards reveal individually as they enter the viewport. */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service, i) => {
              const color = colorPalette[i % colorPalette.length];
              const badgeColor = categoryBadges[service.category] || 'bg-gray-50 text-gray-600';
              const icon = categoryIcons[service.category] || null;
              const letter = service.title ? service.title.charAt(0).toUpperCase() : '?';
              const desc = service.description || '';

              return (
                <SolidCard key={service.id || i} className="p-6 cursor-pointer group" {...revealItem(i)}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl flex-shrink-0 ${color}`}>
                      {icon ? <Icon icon={icon} /> : letter}
                    </div>
                    <div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeColor}`}>{service.category}</span>
                      {/* ✅ Changed text-primary to text-gray-900 */}
                      <h3 className="font-semibold text-lg mt-1 text-gray-900">{service.title || t('common.untitled')}</h3>
                    </div>
                  </div>
                  {/* ✅ Changed text-secondary to text-gray-500 */}
                  <p className="text-sm mb-4 text-gray-500 line-clamp-3">{desc}</p>
                  
                  <button 
                    onClick={() => handleReadMore(service)}
                    className="text-sm font-medium flex items-center gap-1 text-blue-600 group-hover:gap-2 transition-all"
                  >
                    {t('services.learnMore')} <Icon icon="solar:arrow-right-linear" />
                  </button>
                </SolidCard>
              );
            })}
          </div>

        </div>
      </section>

      {/* Modal */}
      {isModalOpen && selectedService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative p-8" onClick={(e) => e.stopPropagation()}>
            <button onClick={closeModal} className="absolute top-4 right-4 bg-white/90 rounded-full p-2 hover:bg-white z-10">
              <Icon icon="solar:close-circle-bold" className="text-xl text-gray-700" />
            </button>
            <div className="flex items-start gap-5 mb-6">
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center font-bold text-3xl flex-shrink-0 ${colorPalette[0]}`}>
                {categoryIcons[selectedService.category] ? <Icon icon={categoryIcons[selectedService.category]} className="w-8 h-8" /> : (selectedService.title ? selectedService.title.charAt(0).toUpperCase() : '?')}
              </div>
              <div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${categoryBadges[selectedService.category] || 'bg-gray-50 text-gray-600'}`}>{selectedService.category}</span>
                <h3 className="font-bold text-2xl md:text-3xl text-gray-900 mt-2">{selectedService.title}</h3>
              </div>
            </div>
            <div className="text-gray-600 leading-relaxed whitespace-pre-line text-base">{selectedService.description || ''}</div>
          </div>
        </div>
      )}
    </>
  );
}