import { getSiteSetting } from '@/lib/db';
import HeroCarousel from '@/components/HeroCarousel';
import slide1 from '@/assets/images/stack-crates.jpeg';
import slide2 from '@/assets/images/plastic-pallets.jpeg';
import slide3 from '@/assets/images/truck-pallets.jpeg';
import slide4 from '@/assets/images/dustbins.jpeg';

export default async function Hero() {
  const heroSetting = (await getSiteSetting('homepage')) as Record<string, string> | null;

  const slides = [
    {
      img: slide1.src,
      alt: 'Stacked plastic crates in an industrial warehouse',
      tag: heroSetting?.hero_tag || 'Storage Solutions',
      title: heroSetting?.hero_title || 'Engineered Plastic Solutions for Industry',
      sub: heroSetting?.hero_description ||
        'Manufacturing durable crates, pallets, waste bins and material handling equipment for warehouses, logistics and municipal operations across India.'
    },
    {
      img: slide2.src,
      alt: 'Heavy-duty plastic pallets for warehouse logistics',
      tag: 'Material Handling',
      title: 'Built to Move. Built to Last.',
      sub: 'High-density polyethylene pallets engineered for racking, stacking and repeated industrial use — reducing cost per cycle.'
    },
    {
      img: slide3.src,
      alt: 'Truck loaded with plastic pallets for distribution',
      tag: 'Logistics & Supply Chain',
      title: 'Reliable Supply Chain Starts Here',
      sub: 'From factory floor to distribution centre — reusable pallets and crates that withstand the rigours of pan-India logistics.'
    },
    {
      img: slide4.src,
      alt: 'Industrial plastic dustbins for waste management',
      tag: 'Waste Management',
      title: 'Municipal & Commercial Waste Solutions',
      sub: 'Robust, UV-stabilised dustbins and waste containers designed for municipal contracts, commercial complexes and factory campuses.'
    }
  ];

  return <HeroCarousel slides={slides} />;
}