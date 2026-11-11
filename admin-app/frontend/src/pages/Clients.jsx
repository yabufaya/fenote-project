import ImageOnlyManager from '../components/ImageOnlyManager';

export default function Clients() {
  return (
    <ImageOnlyManager
      table="client"
      title="Trusted Companies"
      description="Upload company images only. The public section heading and assurance text are fixed EN/AM labels."
    />
  );
}
