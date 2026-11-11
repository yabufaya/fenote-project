import ContentManager from '../components/ContentManager';
import { contentConfigs } from '../config/contentConfigs';

export default function Testimonials() {
  return <ContentManager config={contentConfigs.testimonial} />;
}
