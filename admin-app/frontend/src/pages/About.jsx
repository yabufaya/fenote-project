import ContentManager from '../components/ContentManager';
import { contentConfigs } from '../config/contentConfigs';

export default function About() {
  return <ContentManager config={contentConfigs.about} />;
}
