import Hero from '../sections/Hero';
import TrustBadges from '../sections/TrustBadges';
import About from '../sections/About';
import Blog from '../sections/Blog';
import Services from '../sections/Services';
import Team from '../sections/Team';
import Highlights from '../sections/Highlights';
import Clients from '../sections/Clients';
import Testimonials from '../sections/Testimonials';
import Contact from '../sections/Contact';

export default function Home({ openLightbox, setOverlay }) {
  return (
    <main>
      <Hero setOverlay={setOverlay} />
      <TrustBadges />
      <About />
      <Blog />
      <Services />
      <Team />
      <Highlights />
      <Clients />
      <Testimonials />
      <Contact />
    </main>
  );
}
