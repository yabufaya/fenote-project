import ContentManager from '../components/ContentManager';
import { contentConfigs } from '../config/contentConfigs';

export default function Resources() {
  return <ContentManager config={contentConfigs.resource} />;
}
