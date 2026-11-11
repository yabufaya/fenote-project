import ContentManager from '../components/ContentManager';
import { contentConfigs } from '../config/contentConfigs';

export default function Teams() {
  return <ContentManager config={contentConfigs.team} />;
}
