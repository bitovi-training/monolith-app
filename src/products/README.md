# Product Service

NestJS service that exposes a minimal catalog API for products. This service is intentionally in-memory (no database) to keep integration demos lightweight.

## Endpoints

| Method | Path | Description | Auth |
| --- | --- | --- | --- |
| GET | `/products` | List products | None |
| GET | `/products/:id` | Get a product by ID | `AuthGuard` |
| POST | `/products` | Create a product | `AuthGuard` + `RequireRolesGuard` (`admin`) |

## Auth

Authentication and role enforcement is handled via `@bitovi-training/auth-middleware`.

## Running locally

```bash
npm install
npm run start:dev
```

## Tests

```bash
npm run test
npm run test:e2e
```