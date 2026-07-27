# MVPLAB Backend - Directory Structure

## Current Structure

```
MVPLAB_BACKEND/
├── src/
│   ├── main.ts                    # Application entry point
│   ├── app.module.ts              # Root module
│   ├── app.controller.ts          # Root controller
│   └── app.service.ts             # Root service
├── test/                          # E2E tests
├── supabase/                      # Supabase configuration & migrations
│   ├── migrations/                # SQL migration files
│   │   └── 001_initial_schema.sql
│   ├── seed.sql                   # Seed data
│   └── config.toml                # Supabase config
├── docs/                          # Documentation
│   └── ARCHITECTURE.md
├── node_modules/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── nest-cli.json
├── eslint.config.mjs
└── .prettierrc
```

## Required Directory Structure (To Build)

```
MVPLAB_BACKEND/
├── src/
│   ├── main.ts                    # Entry point
│   ├── app.module.ts              # Root module
│   │
│   ├── config/                    # Configuration
│   │   ├── index.ts
│   │   ├── database.config.ts     # DB connection
│   │   ├── redis.config.ts        # Redis connection
│   │   ├── stripe.config.ts       # Stripe keys
│   │   └── meilisearch.config.ts  # Search config
│   │
│   ├── common/                    # Shared utilities
│   │   ├── decorators/            # Custom decorators
│   │   │   ├── roles.decorator.ts
│   │   │   ├── current-user.decorator.ts
│   │   │   └── public.decorator.ts
│   │   │
│   │   ├── guards/                # Auth guards
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── throttler.guard.ts
│   │   │
│   │   ├── filters/               # Exception filters
│   │   │   └── http-exception.filter.ts
│   │   │
│   │   ├── interceptors/          # Request/Response interceptors
│   │   │   ├── logging.interceptor.ts
│   │   │   └── transform.interceptor.ts
│   │   │
│   │   ├── pipes/                 # Validation pipes
│   │   │   └── validation.pipe.ts
│   │   │
│   │   ├── dto/                   # Base DTOs
│   │   │   ├── pagination.dto.ts
│   │   │   └── response.dto.ts
│   │   │
│   │   └── interfaces/            # Shared interfaces
│   │       ├── user.interface.ts
│   │       └── response.interface.ts
│   │
│   ├── modules/                   # Feature modules
│   │   │
│   │   ├── auth/                  # Authentication module
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── local.strategy.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       ├── register.dto.ts
│   │   │       └── refresh-token.dto.ts
│   │   │
│   │   ├── users/                 # Users module
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── entities/
│   │   │   │   └── user.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-user.dto.ts
│   │   │       └── update-user.dto.ts
│   │   │
│   │   ├── apps/                  # Apps/Projects module
│   │   │   ├── apps.module.ts
│   │   │   ├── apps.controller.ts
│   │   │   ├── apps.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── app.entity.ts
│   │   │   │   ├── api-connection.entity.ts
│   │   │   │   └── app-metric.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-app.dto.ts
│   │   │       └── update-app.dto.ts
│   │   │
│   │   ├── listings/              # Marketplace listings
│   │   │   ├── listings.module.ts
│   │   │   ├── listings.controller.ts
│   │   │   ├── listings.service.ts
│   │   │   ├── entities/
│   │   │   │   └── listing.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-listing.dto.ts
│   │   │       └── search-listing.dto.ts
│   │   │
│   │   ├── offers/                # Buy offers
│   │   │   ├── offers.module.ts
│   │   │   ├── offers.controller.ts
│   │   │   ├── offers.service.ts
│   │   │   ├── entities/
│   │   │   │   └── offer.entity.ts
│   │   │   └── dto/
│   │   │       └── create-offer.dto.ts
│   │   │
│   │   ├── stakes/                # Equity/Investment stakes
│   │   │   ├── stakes.module.ts
│   │   │   ├── stakes.controller.ts
│   │   │   ├── stakes.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── stake-offering.entity.ts
│   │   │   │   └── stake-owner.entity.ts
│   │   │   └── dto/
│   │   │       └── create-stake.dto.ts
│   │   │
│   │   ├── creators/              # UGC Creators
│   │   │   ├── creators.module.ts
│   │   │   ├── creators.controller.ts
│   │   │   ├── creators.service.ts
│   │   │   ├── entities/
│   │   │   │   └── creator-profile.entity.ts
│   │   │   └── dto/
│   │   │       └── creator.dto.ts
│   │   │
│   │   ├── campaigns/             # Marketing campaigns
│   │   │   ├── campaigns.module.ts
│   │   │   ├── campaigns.controller.ts
│   │   │   ├── campaigns.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── campaign.entity.ts
│   │   │   │   └── campaign-performance.entity.ts
│   │   │   └── dto/
│   │   │       └── create-campaign.dto.ts
│   │   │
│   │   ├── analytics/             # Analytics & Metrics
│   │   │   ├── analytics.module.ts
│   │   │   ├── analytics.controller.ts
│   │   │   └── analytics.service.ts
│   │   │
│   │   ├── payments/              # Stripe payments
│   │   │   ├── payments.module.ts
│   │   │   ├── payments.controller.ts
│   │   │   ├── payments.service.ts
│   │   │   └── webhooks.controller.ts
│   │   │
│   │   ├── notifications/         # Email/Push notifications
│   │   │   ├── notifications.module.ts
│   │   │   ├── notifications.service.ts
│   │   │   └── templates/
│   │   │       ├── offer-received.html
│   │   │       └── payment-confirmation.html
│   │   │
│   │   ├── search/                # Meilisearch integration
│   │   │   ├── search.module.ts
│   │   │   ├── search.service.ts
│   │   │   └── search.controller.ts
│   │   │
│   │   └── admin/                 # Admin tools
│   │       ├── admin.module.ts
│   │       ├── admin.controller.ts
│   │       └── admin.service.ts
│   │
│   └── database/                  # Database configuration
│       ├── database.module.ts
│       └── typeorm.config.ts
│
├── supabase/                      # Supabase
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   ├── seed.sql
│   └── config.toml
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── DEPLOYMENT.md
│
├── test/                          # Tests
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
│
├── .env.example
├── .env
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── nest-cli.json
└── README.md
```

## Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/mvplab
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Auth
JWT_SECRET=your-jwt-secret
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Redis
REDIS_URL=redis://localhost:6379

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Meilisearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your-api-key

# App
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## Quick Start Commands

```bash
# Install dependencies
npm install

# Run migrations (Supabase CLI)
supabase db push

# Start development
npm run start:dev

# Build for production
npm run build

# Run tests
npm run test
```