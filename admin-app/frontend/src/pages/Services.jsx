import ContentManager from '../components/ContentManager';
import { contentConfigs } from '../config/contentConfigs';

export default function Services() {
  return <ContentManager config={contentConfigs.services} />;
}
