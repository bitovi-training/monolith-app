# Orders Service - TypeScript/NestJS Implementation

A NestJS-based microservice managing e-commerce order operations within the monolith. Provides CRUD operations for orders, integrates with Product Service for product validation, and coordinates with Loyalty Service for loyalty points.

**Status**: ✅ Active (TypeScript/NestJS)  
**Previous Implementation**: Go 1.25.5 (archived for reference)

## Quick Links

- [API Documentation](#api-reference)
- [Getting Started](#quick-start)
- [Configuration](#configuration)
- [Integration](#integration-with-other-services)
- [Testing](#testing)
- [Migration Guide](../../ORDERS_REFACTORING.md)

## Architecture

NestJS-based modular architecture with clear separation of concerns:

```
src/orders/
├── clients/              # External service integrations
│   ├── product-client.ts
│   └── loyalty-client.ts
├── dto/                  # Request/Response validation
│   ├── create-order.dto.ts
│   ├── update-order.dto.ts
│   └── order-response.dto.ts
├── entities/             # Domain models
│   └── order.entity.ts
├── repositories/         # Data access layer
│   └── order.repository.ts
├── orders.controller.ts  # HTTP routing
├── orders.service.ts     # Business logic
└── orders.module.ts      # Module definition
```

**Architecture Principle**: Layered architecture with clear separation between HTTP, business logic, and data access layers.

## Features

### Order Management
- Create orders with product validation
- List and retrieve order details
- Update pending orders (add/remove products)
- Submit orders for processing
- Track order status lifecycle
- Compute loyalty points

### Integrations
- **Product Service**: Validate products, fetch prices
- **Loyalty Service**: Accrue loyalty points async
- **Auth Service**: JWT bearer token validation, admin role enforcement

### Data Persistence
- In-memory storage with sample mock data
- Repository pattern supports DB migration
- Transaction support through service layer

## Quick Start

### Prerequisites
- Node.js 20+
- npm 10+
- Running services: Product Service, Loyalty Service

### Installation
```bash
cd /path/to/monolith-app

# Install dependencies
npm install

# Run tests
npm test -- orders

# Start development server
npm run start

# Start in watch mode
npm run start:dev
```

### Example API Call
```bash
# Create an order
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "750e8400-e29b-41d4-a716-446655440000",
    "products": [
      {"productId": "550e8400-e29b-41d4-a716-446655440000", "quantity": 2}
    ]
  }'
```

## API Documentation

The complete API specification is defined in `api/openapi.yaml`. Key endpoints:

### Health
- `GET /health` - Server health check (no auth required)

### Users
- User endpoints have been removed from order-service; use user-service and loyalty-service.

### Products
- `GET /products` - List all products
- `GET /products/{productId}` - Get product details

### Orders
- `GET /orders` - List all orders
- `POST /orders` - Create a new order (requires userId)
- `GET /orders/{orderId}` - Get order details
- `PATCH /orders/{orderId}` - Update order products (PENDING orders only)
- `POST /orders/{orderId}/submit` - Submit or cancel an order

### Authentication

All endpoints (except `/health`) require a Bearer token in the Authorization header:

```
Authorization: Bearer <your-token-here>
```

For development/testing, any token with 20+ characters is accepted.

## Project Structure

### `/api`
Contains the OpenAPI specification that defines all API contracts.

### `/cmd/server`
Application entry point with server initialization and route configuration.

### `/internal/handlers`
HTTP request handlers that:
- Validate request parameters and body
- Call service layer for business logic
- Format and return HTTP responses
- Use standardized error responses

### `/internal/middleware`
HTTP middleware components:
- **AuthMiddleware**: Validates Bearer tokens
- **LoggingMiddleware**: Logs all requests and responses

### `/internal/models`
Data structures representing:
- Products (catalog items)
- Orders (with products, status, accrued loyalty points)
- Error responses

### `/internal/services`
Business logic layer with mock data storage:
- **ProductService**: Product catalog access
- **OrderService**: Order lifecycle management, price calculation

### `/tests/integration`
End-to-end integration tests validating complete workflows.

## Development

### Adding New Endpoints

1. **Define in OpenAPI spec** (`api/openapi.yaml`)
   ```yaml
   /new-endpoint:
     get:
       summary: Description
       responses:
         '200':
           description: Success
   ```

2. **Create handler** (`internal/handlers/`)
   ```go
   func NewEndpoint(w http.ResponseWriter, r *http.Request) {
       // Implementation
   }
   ```

3. **Wire up route** (`cmd/server/main.go`)
   ```go
   http.Handle("/new-endpoint", middleware.AuthMiddleware(
       middleware.LoggingMiddleware(http.HandlerFunc(handlers.NewEndpoint))))
   ```

4. **Add business logic** (`internal/services/`) if needed

### Code Conventions

- **Error Handling**: Return errors up the call stack, handle in handlers
- **HTTP Status Codes**: Match OpenAPI response definitions
- **Handlers**: Keep thin - delegate to services
- **Models**: Define data structures, not behavior
- **Logging**: Use standard log package with prefixes

## Testing

### Run All Tests
```bash
go test ./...
```

### Run Specific Package Tests
```bash
go test ./internal/handlers
go test ./internal/middleware
go test ./tests/integration
```

### Run with Verbose Output
```bash
go test -v ./...
```

### Run Multiple Times (Test Stability)
```bash
go test ./... -count=3
```

### Clean Test Cache
```bash
go clean -testcache
```

### Test Structure

- **Unit Tests**: Located alongside source files (`*_test.go`)
- **Integration Tests**: Located in `/tests/integration`
- **Mock Data Reset**: Each test resets mock data for isolation
- **Table-Driven Tests**: Most tests use table-driven patterns

## Design Patterns

### Mock Data Reset
Tests use reset functions to ensure isolation:
```go
func TestSomething(t *testing.T) {
    resetMockData()  // Resets to initial state
    // Test implementation
}
```

### Middleware Pattern
All protected routes use middleware composition:
```go
http.HandleFunc("/endpoint", 
    middleware.LoggingMiddleware(
        middleware.AuthMiddleware(handlers.Handler)))
```

### Error Response Standardization
All errors use consistent format:
```go
writeErrorResponse(w, http.StatusBadRequest, 
    "ERROR_CODE", "Error message")
```

### Additive/Subtractive Order Updates
PATCH operations on orders use quantity arithmetic:
- `quantity > 0`: Add to existing quantity
- `quantity < 0`: Subtract from existing quantity (removes if result ≤ 0)
- `quantity = 0`: No change

### Loyalty Points
- Calculated and stored by loyalty-service on order submission
- Order-service forwards order totals to loyalty-service for accrual

### Cascade Operations
- User deletion is handled by user-service; order-service no longer exposes user endpoints

## Constitutional Principles

This project adheres to a formal constitution (v1.0.1) that defines core development principles:

1. **Contract-First Development** - OpenAPI spec is the source of truth
2. **Standard Go Project Layout** - Clear separation of concerns
3. **Test Coverage & Isolation** - Comprehensive unit and integration tests
4. **Middleware Composition** - Consistent auth and logging patterns
5. **Standard Error Handling** - Uniform error response format

**Compliance Status**: ✅ 100% Compliant  
**Documentation**: [Constitution](.specify/memory/constitution.md) | [Compliance Report](.specify/memory/constitution-compliance-report.md)

### Validation

Validate constitutional compliance:
```bash
# Validate OpenAPI specification
python3 .specify/scripts/validate-openapi.py

# Run all tests
go test ./...
```

## Dependencies

- **github.com/google/uuid** (v1.6.0) - UUID generation and validation

## Contributing

1. Follow the existing code structure and conventions
2. **Update OpenAPI spec before implementing new endpoints** (Constitutional Principle I)
3. Add tests for new functionality (Constitutional Principle III)
4. Ensure all tests pass before submitting changes
5. Validate OpenAPI spec compliance

## Contact

**Maintainer**: Bitovi Support  
**Email**: support@bitovi.com

## License

Copyright © 2026 Bitovi
