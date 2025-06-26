# ElizaOS Platform

A unified Next.js application providing authentication, API key management, organization management, and billing for the ElizaOS ecosystem.

## Features

- 🔐 **WorkOS SSO Integration** - Enterprise-grade authentication
- 🔑 **API Key Management** - Create and manage API keys with granular permissions
- 🏢 **Organization Management** - Multi-tenant support with role-based access
- 💳 **Stripe Billing** - Subscription management and usage-based billing
- 📚 **OpenAPI Documentation** - Interactive API documentation with Swagger UI
- 🧪 **Comprehensive Testing** - E2E tests with Cypress and API tests

## Architecture

This is a unified Next.js application that serves both the frontend and API:

```
/app
  /api/v1         # API routes
  /(dashboard)    # Dashboard pages
  /auth           # Authentication pages
/lib
  /server         # Server-side utilities
    /auth         # Authentication logic
    /database     # Database abstraction
    /middleware   # API middleware
    /types        # TypeScript types
    /utils        # Utility functions
/components       # React components
/cypress          # E2E tests
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis
- WorkOS account
- Stripe account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/elizaos/platform
cd platform
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env.local
```

4. Configure environment variables in `.env.local`

5. Run database migrations:
```bash
npm run db:migrate
```

6. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3333`

## API Documentation

### Interactive Documentation

Visit `http://localhost:3333/api/docs` for interactive API documentation powered by Swagger UI.

### Authentication

The API supports two authentication methods:

1. **Bearer Token (JWT)**
```bash
curl -H "Authorization: Bearer <access_token>" \
  http://localhost:3333/api/v1/auth/me
```

2. **API Key**
```bash
curl -H "X-API-Key: pk_live_..." \
  http://localhost:3333/api/v1/auth/me
```

### Key Endpoints

- `GET /api/v1/auth/login` - Initiate SSO login
- `POST /api/v1/auth/callback` - Handle OAuth callback
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user
- `GET /api/v1/api-keys` - List API keys
- `POST /api/v1/api-keys` - Create API key
- `GET /api/v1/organizations` - List organizations
- `GET /api/v1/billing/subscription` - Get subscription

## Testing

### Run all tests:
```bash
npm run test:all
```

### Run E2E tests:
```bash
npm run test:e2e
```

### Run API tests:
```bash
npm run test:api
```

### Run tests in CI:
```bash
npm run test:e2e:headless
```

## Development

### Project Structure

- `/app` - Next.js app router pages and API routes
- `/lib/server` - Server-side business logic
- `/components` - Reusable React components
- `/cypress` - End-to-end tests
- `/scripts` - Utility scripts

### Adding New API Routes

1. Create route file in `/app/api/v1/<resource>/route.ts`
2. Use the auth middleware for protected routes
3. Update OpenAPI spec in `/lib/openapi-spec.yaml`
4. Add tests in `/cypress/e2e`

Example:
```typescript
import { requireAuth } from '@/lib/server/middleware/auth';

export const GET = requireAuth(async (req) => {
  const user = req.user!;
  // Your logic here
});
```

### Database

The platform uses a mock in-memory database for development. For production:

1. Replace `/lib/server/database/index.ts` with Drizzle ORM implementation
2. Create proper database migrations
3. Update connection configuration

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `JWT_SECRET` - Secret for JWT signing
- `WORKOS_API_KEY` - WorkOS API key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repository to Vercel
3. Configure environment variables
4. Deploy

### Docker

```bash
docker build -t elizaos-platform .
docker run -p 3333:3333 --env-file .env elizaos-platform
```

## Security

- All API endpoints use secure authentication
- API keys are hashed before storage
- Rate limiting on all endpoints
- CORS protection
- Input validation with Zod
- SQL injection protection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details
