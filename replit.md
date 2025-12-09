# SIKA TEXTE BUSINESS

## Overview

SIKA TEXTE BUSINESS is a full-stack financial mobile web application built for digital financial services. The application provides users with wallet functionality, transaction management, referral systems, and various financial services including transfers, recharges, and payments. It features a mobile-first design with a comprehensive dashboard, user authentication, and real-time transaction processing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Framework**: Shadcn/ui components built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **Build Tool**: Vite for fast development and optimized production builds
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

### Backend Architecture
- **Runtime**: Node.js with Express.js for the REST API server
- **Language**: TypeScript for full-stack type safety
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth integration with OpenID Connect (OIDC) for secure user authentication
- **Session Management**: Express sessions with PostgreSQL storage for persistent user sessions
- **Password Hashing**: bcrypt for secure password storage
- **API Design**: RESTful endpoints with structured error handling and request/response logging

### Database Design
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **Schema Management**: Drizzle migrations for version-controlled database changes
- **Core Tables**:
  - Users table with profile information, balance, and referral codes
  - Transactions table for all financial operations (transfers, recharges, payments)
  - Sessions table for authentication state persistence
  - Referrals table for tracking user referrals and commissions

### Security & Authentication
- **Authentication Provider**: Replit Auth with OIDC for secure user identity
- **Session Security**: HTTP-only cookies with secure flags and session expiration
- **Password Security**: bcrypt hashing with salt rounds for password protection
- **Input Validation**: Zod schemas for runtime type checking and validation
- **Database Security**: Parameterized queries through Drizzle ORM to prevent SQL injection

### Mobile-First Design
- **Responsive Layout**: Mobile-optimized interface with bottom navigation and touch-friendly interactions
- **Progressive Enhancement**: Works across different screen sizes and devices
- **Performance**: Optimized bundle sizes and lazy loading for fast mobile performance

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting for scalable data storage
- **Connection Pooling**: @neondatabase/serverless for efficient database connections

### Authentication Services
- **Replit Auth**: OpenID Connect integration for user authentication and identity management
- **Session Storage**: connect-pg-simple for PostgreSQL-backed session persistence

### UI Component Libraries
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives
- **Lucide React**: Icon library for consistent iconography
- **Font Awesome**: Additional icon support for enhanced visual elements

### Development Tools
- **TypeScript**: Static type checking across the entire application stack
- **ESBuild**: Fast JavaScript bundler for production builds
- **Replit Plugins**: Development environment integration with cartographer and dev banner

### Form & Validation
- **React Hook Form**: Performant form library with minimal re-renders
- **Zod**: Runtime type validation and schema definition
- **@hookform/resolvers**: Integration between React Hook Form and Zod

### Styling & Design
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **class-variance-authority**: Type-safe component variant management
- **clsx**: Conditional class name utility for dynamic styling

### Payment Integration - BKAPay v1.3
- **Integration Type**: API-based with redirect flow and webhooks
- **Flow**: 
  1. User clicks "Payer l'activation en ligne" on Withdrawal page
  2. Frontend calls POST /api/activation/init-payment
  3. Backend creates payment record and returns BKAPay redirect URL
  4. User is redirected to BKAPay payment page
  5. After payment, user returns to /activation-success with status params
  6. BKAPay sends webhook to /api/webhook/bkapay for deposit processing
- **Webhook Actions**: Credits 3600 FCFA to user balance, creates transaction in history (as a deposit/recharge - does NOT activate account)
- **Environment Variables**:
  - BKAPAY_PUBLIC_KEY: Public API key for initiating payments
  - BKAPAY_SIGNATURE_SECRET: Secret for HMAC-SHA256 webhook signature verification
- **Webhook URL**: https://sikatexte.site/api/webhook/bkapay (configure in BKAPay dashboard)