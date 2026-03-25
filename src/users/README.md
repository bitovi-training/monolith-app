# User Service

A NestJS-based authentication service providing sign up, sign in, and logout functionality with JWT token generation. This service is designed to work with the auth-middleware for protecting other services in the microservices architecture.

## Features

- ✅ User registration (sign up) with email and password
- ✅ User authentication (sign in) with credential verification
- ✅ Secure logout with token invalidation
- ✅ JWT token generation compatible with auth-middleware
- ✅ Password hashing with bcrypt
- ✅ Role-based access control (RBAC) support
- ✅ In-memory user storage (easily replaceable with database)
- ✅ Input validation with class-validator
- ✅ Structured logging
- ✅ Health check endpoint
- ✅ Docker support

## Architecture

The service follows a clean architecture pattern with:

- **Controllers**: Handle HTTP requests and responses
- **Services**: Business logic for authentication
- **Repositories**: Data access layer (in-memory storage)
- **DTOs**: Data transfer objects with validation
- **Models**: Entity definitions

### JWT Token Format

The service generates JWT tokens compatible with the auth-middleware:

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "roles": ["user", "admin"],
  "iat": 1737000000,
  "exp": 1737086400
}
```

⚠️ **Note**: This is a mock implementation that does NOT sign tokens cryptographically. For production use, implement proper JWT signing.

## API Endpoints

### Sign Up

Create a new user account.

```
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "roles": ["user"]  // optional, defaults to ["user"]
}
```

**Response** (201 Created):
```json
{
  "accessToken": "eyJhbGc...",
  "user": {
    "id": "uuid-v4",
    "email": "user@example.com",
    "roles": ["user"]
  }
}
```

**Errors**:
- 409 Conflict: Email already registered
- 400 Bad Request: Invalid input data

### Sign In

Authenticate with existing credentials.

```
POST /auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response** (200 OK):
```json
{
  "accessToken": "eyJhbGc...",
  "user": {
    "id": "uuid-v4",
    "email": "user@example.com",
    "roles": ["user"]
  }
}
```

**Errors**:
- 401 Unauthorized: Invalid credentials
- 400 Bad Request: Invalid input data

### Logout

Invalidate the current user's token.

```
POST /auth/logout
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "message": "Logged out successfully"
}
```

**Errors**:
- 401 Unauthorized: Missing or invalid token

### Health Check

Check service status.

```
GET /health
```

**Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2026-01-15T12:00:00.000Z"
}
```

## Installation

```bash
npm install
```

## Running the Service

### Development Mode

```bash
npm run start:dev
```

The service will start on `http://localhost:3002`.

### Production Mode

```bash
npm run build
npm run start:prod
```

### Docker

```bash
docker build -t user-service .
docker run -p 3002:3002 user-service
```

### Docker Compose (with other services)

From the `service-infra` directory:

```bash
docker-compose up user-service
```

## Environment Variables

- `PORT`: Server port (default: 3002)

## Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Usage Example

### 1. Sign Up a New User

```bash
curl -X POST http://localhost:3002/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "strongpassword123",
    "roles": ["user", "admin"]
  }'
```

### 2. Sign In

```bash
curl -X POST http://localhost:3002/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "strongpassword123"
  }'
```

Save the `accessToken` from the response.

### 3. Use Token with Protected Services

Use the token to access protected endpoints in other services (e.g., order-service, product-service):

```bash
curl http://localhost:8100/api/orders \
  -H "Authorization: Bearer <your-access-token>"
```

### 4. Logout

```bash
curl -X POST http://localhost:3002/auth/logout \
  -H "Authorization: Bearer <your-access-token>"
```

## Integration with Auth Middleware

This service generates JWT tokens that are compatible with the `@bitovi-training/auth-middleware` middleware used in other services. The tokens include:

- `sub`: User ID
- `email`: User email
- `roles`: Array of role strings
- `iat`: Issued at timestamp
- `exp`: Expiration timestamp (24 hours)

Other services can validate these tokens using the AuthGuard:

```typescript
import { AuthGuard, User, UserClaims } from '@bitovi-training/auth-middleware';

@Controller('api')
@UseGuards(AuthGuard)
export class ProtectedController {
  @Get('data')
  getData(@User() user: UserClaims) {
    // Access user info from token
    return { userId: user.sub, email: user.email };
  }
}
```

## Security Considerations

⚠️ **Important Security Notes**:

1. **Mock Implementation**: This service does NOT use cryptographic signing for JWT tokens. In production:
   - Use a proper JWT library (e.g., `@nestjs/jwt`, `jsonwebtoken`)
   - Sign tokens with a secret key or RSA key pair
   - Verify signatures on token validation

2. **Password Storage**: Passwords are hashed with bcrypt (10 salt rounds). Consider:
   - Increasing salt rounds for production
   - Adding rate limiting to prevent brute force attacks

3. **Token Storage**: Blacklisted tokens are stored in memory:
   - In production, use Redis or a database
   - Implement token refresh mechanism
   - Consider shorter token expiration times

4. **User Storage**: Users are stored in memory:
   - In production, use a database (PostgreSQL, MongoDB, etc.)
   - Implement proper database migrations

5. **CORS**: Currently allows all origins:
   - Configure specific allowed origins for production

6. **Rate Limiting**: Not implemented:
   - Add rate limiting to prevent abuse
   - Implement account lockout after failed attempts

## Project Structure

```
user-service/
├── src/
│   ├── controllers/        # HTTP controllers
│   │   ├── auth.controller.ts
│   │   └── health.controller.ts
│   ├── dto/               # Data transfer objects
│   │   ├── sign-up.dto.ts
│   │   ├── sign-in.dto.ts
│   │   └── auth-response.dto.ts
│   ├── models/            # Entity models
│   │   └── user.entity.ts
│   ├── modules/           # NestJS modules
│   │   └── auth.module.ts
│   ├── repositories/      # Data access layer
│   │   └── user.repository.ts
│   ├── services/          # Business logic
│   │   ├── auth.service.ts
│   │   ├── jwt.service.ts
│   │   └── password.service.ts
│   ├── app.module.ts
│   └── main.ts
├── test/
├── Dockerfile
├── package.json
└── README.md
```

## Development

### Code Formatting

```bash
npm run format
```

### Linting

```bash
npm run lint
```

## License

UNLICENSED
