import { useState } from 'react';
import { Image as ImageIcon, Type } from 'lucide-react';
import ContentManager from '../components/ContentManager';
import ImageOnlyManager from '../components/ImageOnlyManager';
import { contentConfigs } from '../config/contentConfigs';

export default function HeroManagement() {
  const [tab, setTab] = useState('text');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Hero Management</h1>
          <p className="text-xs text-gray-400 mt-1">Edit the headline quote and below lines, then manage carousel images separately.</p>
        </div>
      </div>

      <div className="inline-flex rounded-xl bg-white border border-gray-200 p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setTab('text')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${tab === 'text' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'}`}
        >
          <Type className="w-4 h-4" /> Hero Text
        </button>
        <button
          type="button"
          onClick={() => setTab('images')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${tab === 'images' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'}`}
        >
          <ImageIcon className="w-4 h-4" /> Carousel Images
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 lg:p-6">
        {tab === 'text' ? (
          <ContentManager config={contentConfigs.hero_content} />
        ) : (
          <ImageOnlyManager
            table="hero_slide"
            title="Hero Carousel"
            description="Upload carousel images only. No titles, captions or other specifications."
          />
        )}
      </div>
    </div>
  );
}
