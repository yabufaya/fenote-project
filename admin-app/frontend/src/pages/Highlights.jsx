import ContentManager from '../components/ContentManager';
import { contentConfigs } from '../config/contentConfigs';

export default function Highlights() {
  return <ContentManager config={contentConfigs.highlight} />;
}
