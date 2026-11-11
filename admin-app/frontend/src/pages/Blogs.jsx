import ContentManager from '../components/ContentManager';
import { contentConfigs } from '../config/contentConfigs';

export default function Blogs() {
  return <ContentManager config={contentConfigs.blog} />;
}
