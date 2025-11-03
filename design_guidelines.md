# SIKA TEXTE BUSINESS - Design Guidelines

## Design Approach

**Selected Framework:** Hybrid Financial-Tech System (inspired by Stripe's clarity + Revolut's modern interface + Linear's typography precision)

**Core Principle:** Professional financial trust meets productivity elegance. Clean, modern interface that radiates security while maintaining approachability for text correction workflows.

## Color System

### Primary Palette (Dark & Light Modes)
- **Primary Blue:** 215 85% 45% (trust, professional, CTAs)
- **Deep Navy:** 220 40% 20% (headers, emphasis in light mode)
- **Light Background:** 210 20% 98% (light mode base)
- **Dark Background:** 220 25% 12% (dark mode base)
- **Surface Light:** 210 15% 95% (cards in light mode)
- **Surface Dark:** 220 20% 16% (cards in dark mode)
- **Success Green:** 145 65% 45% (transactions, confirmations)
- **Text Primary:** 220 15% 15% (light) / 210 10% 92% (dark)
- **Text Secondary:** 220 10% 45% (light) / 210 8% 65% (dark)

### Accent (Minimal Use)
- **Alert Orange:** 25 90% 55% (warnings only)

## Typography

**Font Stack:** Inter (via Google Fonts CDN) for interface, JetBrains Mono for financial data/numbers

**Hierarchy:**
- Display: text-5xl md:text-6xl font-bold (hero headings)
- H1: text-4xl font-semibold (section titles)
- H2: text-2xl font-semibold (subsections)
- H3: text-xl font-medium (card titles)
- Body: text-base leading-relaxed (main content)
- Financial Data: font-mono text-lg font-medium (amounts, stats)
- Small: text-sm (metadata, helper text)

## Layout System

**Spacing Units:** Tailwind 2, 4, 6, 8, 12, 16 (consistent rhythm: p-8, gap-6, mt-12, etc.)

**Containers:** max-w-7xl for sections, max-w-4xl for text content, full-width for hero and dashboards

**Grid Patterns:**
- Features: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Dashboard cards: grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4
- Stats: grid-cols-2 md:grid-cols-4 gap-8

## Component Library

### Navigation
Fixed header with logo left, nav center, wallet balance + profile right. Glass morphism effect (backdrop-blur-lg bg-opacity-90). Mobile: hamburger with slide-out drawer.

### Hero Section
Full-width container (h-[85vh]) with two-column split. Left: headline, subheading (text correction + financial services value prop), dual CTAs (primary "Commencer" + outline "Voir Démo"). Right: Hero image showing app interface on mobile device with wallet/transaction UI visible. Gradient overlay from primary blue to transparent. Include trust indicators below (users count, transactions processed, uptime).

### Feature Cards
Elevated cards (shadow-lg) with icon top-left, title, description, and "En savoir plus" link. Icons from Heroicons. Cards have subtle border (border-2) in primary blue on hover. Three-column grid showcasing: Text Correction Engine, E-Wallet Management, Referral System, Admin Dashboard, Real-time Analytics, Security Features.

### E-Wallet Display
Dashboard-style section with balance card (large prominent display using mono font), recent transactions list (card-based, alternating sender/receiver icons), and quick actions (transfer, deposit, withdraw buttons). Use success green for incoming, primary blue for outgoing.

### Referral System Section
Two-column: Left shows referral link generator with copy button, referral stats dashboard. Right displays tiered rewards structure as progressive cards (Bronze, Silver, Gold tiers with benefits).

### Administrative Panel Preview
Multi-card layout showcasing: user management table, transaction monitoring graph (use placeholder for chart), document queue for text corrections, analytics overview. Dark mode optimized with high contrast.

### Trust & Security Bar
Full-width strip with icons + text displaying: Bank-grade encryption, 99.9% uptime, GDPR compliant, 24/7 support. Use subtle background differentiation.

### Pricing Cards
Three-tier cards (Starter, Professional, Enterprise) with feature comparison checkmarks. Primary blue for recommended plan with "Populaire" badge.

### Footer
Four-column grid: Product links, Company info, Resources, Legal. Newsletter signup with input + button. Social icons bottom. Include security badges and payment method icons for trust.

## Visual Elements

### Buttons
- Primary: bg-primary blue, white text, rounded-lg px-6 py-3, font-medium
- Outline (on images): border-2 border-white text-white backdrop-blur-md bg-white/10
- Text links: primary blue with underline on hover

### Cards
Rounded-xl with subtle shadows (shadow-md default, shadow-xl on hover). Border option for financial data cards (border border-gray-200 dark:border-gray-700).

### Form Inputs
Full-width, rounded-lg, border-2, focus:border-primary, consistent padding p-3. Dark mode: bg-gray-800 with lighter borders.

### Icons
Heroicons via CDN. Financial: currency, wallet, chart icons. Text correction: document, check, edit icons. Admin: users, settings, analytics icons.

## Animations
Minimal and purposeful only: subtle fade-in for cards on scroll, smooth transitions for hover states (transition-all duration-200), loading spinners for transactions.

## Images

### Hero Image (Primary)
Polished mockup of SIKA app on mobile device showing wallet dashboard with balance, recent transactions, and text correction interface. Modern smartphone frame, slight perspective tilt (15°), floating with subtle shadow. Background: abstract financial/text pattern blur or gradient mesh.

### Feature Section Images
Three supporting images:
1. Text correction interface screenshot (showing before/after correction)
2. E-wallet transaction flow visualization
3. Referral dashboard with growth graph

### Trust Section
Icon-based, no photography. Use illustrated icons for encryption, compliance, support.

**Large Hero Image:** Yes - prominent mobile app mockup with financial UI visible, positioned right side of hero section.