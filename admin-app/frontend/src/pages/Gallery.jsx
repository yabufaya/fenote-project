import ContentManager from '../components/ContentManager';
import { contentConfigs } from '../config/contentConfigs';

export default function Gallery() {
  return <ContentManager config={contentConfigs.gallery} />;
}
