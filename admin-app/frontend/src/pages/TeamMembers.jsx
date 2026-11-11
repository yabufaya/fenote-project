import ContentManager from '../components/ContentManager';
import { contentConfigs } from '../config/contentConfigs';

export default function TeamMembers() {
  return <ContentManager config={contentConfigs.team_members} />;
}
