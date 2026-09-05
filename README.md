# Vinayak Plastics

A modern, performance-focused website for Vinayak Plastics - suppliers of industrial material handling and packaging products including plastic crates, pallets, waste bins, and hand pallet trucks.

## Stack

- **Astro** - Static site generator for optimal performance
- **TypeScript** - Type safety and better developer experience
- **CSS** - Custom CSS with design system (preserved from original prototype)
- **Minimal JavaScript** - Only where necessary for interactions

## Project Structure

```
vinayak-plastics/
├── public/
│   └── images/          # Product images and logos
├── src/
│   ├── components/      # Reusable Astro components
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   └── ProductCard.astro
│   ├── layouts/
│   │   └── Layout.astro # Base HTML layout
│   ├── pages/           # File-based routing
│   │   ├── index.astro  # Home page
│   │   ├── about.astro
│   │   ├── contact.astro
│   │   └── products/
│   │       ├── index.astro
│   │       └── [slug].astro
│   └── styles/
│       └── style.css    # Global styles
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Features

- **Static Generation** - Pre-rendered for maximum performance
- **SEO Optimized** - Structured data, meta tags, and semantic HTML
- **Responsive Design** - Mobile-first approach with clean breakpoints
- **Performance First** - Minimal JavaScript, optimized images, efficient CSS
- **Accessibility** - WCAG compliant with proper semantic structure

## Products

- Plastic Crates (HDPE/PP) - Dairy, bakery, warehouse storage
- Plastic Pallets - Heavy-duty warehouse racking solutions
- Waste Bins / Dustbins - Municipal and commercial use
- Hand Pallet Trucks - Manual material handling equipment

## Phase 1 - Static Website

This is Phase 1 of the project focusing on migrating the HTML/CSS prototype to a clean, maintainable Astro codebase while preserving the existing design and content.

Future phases will add:
- Database integration (Supabase)
- Admin panel for content management
- Enhanced performance optimizations
- Advanced SEO features