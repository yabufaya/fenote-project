import ContentManager from '../components/ContentManager';
import { contentConfigs } from '../config/contentConfigs';

export default function Payments() {
  return (
    <div className="space-y-10">
      <ContentManager config={contentConfigs.payment_packages} />
      <ContentManager config={contentConfigs.payment_settings} />
    </div>
  );
}
