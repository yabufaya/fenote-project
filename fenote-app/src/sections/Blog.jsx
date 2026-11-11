import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { SolidCard } from '../components/common/Cards';
import { api } from '../services/api';
import { usePublicRealtime } from '../hooks/usePublicRealtime';
import { revealItem } from '../utils/scrollFlow';

// ✅ Helper function to ensure the image URL points to the root directory
// Add this right above your component
const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url; // Already a full URL
  return url.startsWith('/') ? url : `/${url}`; // Add missing slash
};

export default function Blog() {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  usePublicRealtime(['blog'], () => setRefreshKey((k) => k + 1));
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isBlogPage, setIsBlogPage] = useState(false);
  
  // Modal states
  const [selectedPost, setSelectedPost] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (isBlogPage) {
          const response = await api.getAllBlogs(page, 10);
          setPosts(response.data);
          setHasMore(response.pagination.page < response.pagination.totalPages);
        } else {
          const response = await api.getRecentBlogs();
          setPosts(response.data);
          setHasMore(false);
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching blogs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [page, isBlogPage, refreshKey]);

  const handleSeeMore = () => {
    setPage(prev => prev + 1);
  };

  const handleReadMore = (post) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPost(null);
  };

  return (
    <>
      <section id="blog" className="py-20 bg-glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-14" {...revealItem(0)}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-amber-50 text-amber-500">
              <Icon icon="solar:pen-new-square-bold" /> {t('blog.badge')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-primary">
              {t('blog.title1')} <span className="font-serif italic text-accent">{t('blog.title2')}</span>
            </h2>
            <p className="max-w-xl mx-auto text-secondary">{t('blog.desc')}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-3 text-center py-12" data-reveal="fade">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                <p className="mt-4 text-muted">{t('blog.loading')}</p>
              </div>
            ) : error ? (
              <div className="col-span-3 text-center py-12" data-reveal="fade">
                <p className="text-red-500">{t('common.errorLoading', { section: t('nav.blog'), message: error })}</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="col-span-3 text-center py-12" data-reveal="fade">
                <p className="text-muted">{t('blog.empty')}</p>
              </div>
            ) : (
              posts.map((post, i) => {
                // ✅ FIX: Use the exact lowercase key from your JSON, and resolve the URL
                const imageUrl = resolveImageUrl(post.imageurl);

                return (
                  <SolidCard key={post.id} className="overflow-hidden group" {...revealItem(i)}>
                    <div className="overflow-hidden">
                      <img 
                        src={resolveImageUrl(post.imageurl) || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=500&fit=crop'} 
                        alt={post.title} 
                        className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500" 
                        loading="lazy" 
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=500&fit=crop';
                        }}
                      />
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        {post.category && (
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-fenote-50 text-accent">{post.category}</span>
                        )}
                        {post.issue && (
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-600">{post.issue}</span>
                        )}
                      </div>
                      <h3 className="font-semibold mt-1 mb-2 text-primary">{post.title}</h3>
                      <p className="text-sm mb-4 text-muted line-clamp-3">{post.content || post.desc || post.description}</p>
                      
                      <button 
                        onClick={() => handleReadMore(post)}
                        className="text-sm font-medium flex items-center gap-1 text-accent group-hover:gap-2 transition-all"
                      >
                        {t('blog.readMore')} <Icon icon="solar:arrow-right-linear" />
                      </button>
                    </div>
                  </SolidCard>
                );
              })
            )}
          </div>

          {!isBlogPage && hasMore && (
            <div className="text-center mt-12" {...revealItem(0, 'fade')}>
              <button 
                onClick={handleSeeMore}
                className="px-8 py-3 bg-accent text-white rounded-full font-medium hover:bg-opacity-90 transition-all flex items-center gap-2 mx-auto"
              >
                {t('blog.seeMore')} <Icon icon="solar:arrow-down-linear" />
              </button>
            </div>
          )}

        </div>
      </section>

      {/* Blog Pop-up Modal */}
      {isModalOpen && selectedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div 
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={closeModal}
              className="absolute top-4 right-4 bg-white/90 rounded-full p-2 hover:bg-white transition-colors z-10 shadow-sm"
            >
              <Icon icon="solar:close-circle-bold" className="text-xl text-gray-700" />
            </button>
            
            {/* ✅ FIX: Use the exact lowercase key and resolve URL here too */}
            {resolveImageUrl(selectedPost.imageurl) && (
              <img 
                src={resolveImageUrl(selectedPost.imageurl)} 
                alt={selectedPost.title} 
                className="w-full aspect-video object-cover rounded-t-2xl" 
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=500&fit=crop';
                }}
              />
            )}
            
            <div className="p-8">
              <div className="flex items-center gap-2 mb-4">
                {selectedPost.category && (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-fenote-50 text-accent">{selectedPost.category}</span>
                )}
                {selectedPost.issue && (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-600">{selectedPost.issue}</span>
                )}
              </div>
              <h3 className="font-bold text-2xl md:text-3xl text-primary mb-4">{selectedPost.title}</h3>
              <div className="text-secondary leading-relaxed whitespace-pre-line">
                {selectedPost.content || selectedPost.desc || selectedPost.description}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}