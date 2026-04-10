# Orders Service Refactoring: Go to TypeScript

## Executive Summary

The Orders service has been successfully refactored from Go to TypeScript/NestJS as part of the monolith consolidation effort. This refactoring maintains all existing functionality while aligning the service with the architecture and patterns used in the loyalty, products, and users services.

## Refactoring Objectives ✅ Complete

- ✅ Convert Go HTTP service to NestJS/TypeScript
- ✅ Maintain all existing APIs and functionality
- ✅ Align with existing monorepo architecture patterns
- ✅ Integrate service clients for Product and Loyalty services
- ✅ Implement comprehensive tests
- ✅ Update deployment configuration

## Architecture Changes

### Before (Go-based)

- Standalone Go service on port 8080
- Separate Docker container
- Separate module in `go.work`
- Custom HTTP routing and middleware
- Direct authentication using external middleware

### After (TypeScript/NestJS)

- Integrated into main NestJS application on port 3000
- Unified Docker build
- Single application module
- NestJS routing and middleware
- Authentication via `@bitovi-training/auth-middleware`

## File Structure

```
src/orders/
├── clients/
│   ├── product-client.ts       # Product Service HTTP client
│   └── loyalty-client.ts       # Loyalty Service HTTP client
├── dto/
│   ├── create-order.dto.ts     # POST /orders request DTO
│   ├── update-order.dto.ts     # PATCH /orders/{id} request DTO
│   └── order-response.dto.ts   # Order response DTO and enums
├── entities/
│   └── order.entity.ts         # Order domain model
├── repositories/
│   └── order.repository.ts     # In-memory order storage
├── orders.controller.ts        # HTTP request handling
├── orders.controller.spec.ts   # Controller tests
├── orders.service.ts           # Business logic
├── orders.service.spec.ts      # Service tests
├── orders.module.ts            # NestJS module definition
├── dto/
├── entities/
└── repositories/
```

## API Endpoints

### Health Check

- **GET** `/health` - Server health (no auth required)

### Order Management (all require admin role)

- **GET** `/orders` - List all orders
- **POST** `/orders` - Create new order
  - Request: `{ userId: UUID, products: [{ productId: UUID, quantity: int }] }`
  - Response: 201 Created with order details
- **GET** `/orders/{orderId}` - Get specific order
- **PATCH** `/orders/{orderId}` - Update pending order products
  - Only PENDING orders can be modified
  - Products array uses additive/subtractive quantities
  - New products are validated against Product Service
- **POST** `/orders/{orderId}/submit` - Submit order for processing
  - Changes order status from PENDING to PROCESSING

## DTOs and Validation

### CreateOrderDto

```typescript
{
  userId: UUID (required),
  products: [
    {
      productId: UUID (required),
      quantity: int >= 1 (required)
    }
  ] (required, min 1)
}
```

### UpdateOrderDto

```typescript
{
  products: [
    {
      productId: string(required),
      quantity: int(required), // positive=add, negative=subtract, 0=skip
    },
  ](optional);
}
```

### Order Status

- `PENDING` - Initial state, can be modified
- `PROCESSING` - Order submitted, no longer modifiable
- `SHIPPED` - Order in transit
- `DELIVERED` - Order received
- `CANCELED` - Order cancelled

## Key Implementation Details

### 1. Product Service Integration

- Validates products during order creation and updates
- Retrieves actual prices for total calculation
- Returns 400 BAD_REQUEST for invalid products
- Returns 503 SERVICE_UNAVAILABLE if Product Service fails

### 2. Loyalty Integration

- Calculates loyalty points (1 point per dollar)
- Accrues points to user's loyalty account (non-blocking)
- Points calculation based on final order total

### 3. In-Memory Storage

- Uses OrderRepository with Map-based storage
- Includes mock data for testing/development:
  - 3 sample orders with different statuses
  - Mix of single and multi-product orders
- `resetMockData()` method for test isolation

### 4. Error Handling

- 400 BAD_REQUEST: Invalid input, validation errors
- 401 UNAUTHORIZED: Missing/invalid authentication
- 403 FORBIDDEN: Insufficient permissions (non-admin users)
- 404 NOT_FOUND: Order not found
- 503 SERVICE_UNAVAILABLE: External service failure

### 5. Authentication & Authorization

- Uses JWT authentication via `@bitovi-training/auth-middleware`
- Requires `admin` role for all endpoints
- Authentication header: `Authorization: Bearer {token}`

## Database & Persistence

### Current Implementation

The Orders service uses in-memory storage via OrderRepository for MVP/demo purposes. This provides:

- Rapid development and testing
- No database setup required
- Full transactional capability with in-memory operations
- Easy state reset for testing

### Future Enhancements

When moving to production, replace OrderRepository implementation with:

- PostgreSQL with TypeORM
- MongoDB with Mongoose
- Any supported data persistence layer

The repository interface remains unchanged, allowing drop-in replacement of the storage layer.

## Testing

### Unit Tests

Located in:

- `orders.service.spec.ts` - Service level tests
- `orders.controller.spec.ts` - Controller level tests

### Test Coverage

```
OrdersService:
✓ listOrders - returns all orders, handles empty case
✓ getOrderById - retrieves specific order, validates UUID, handles 404
✓ createOrder - creates orders, validates products, calculates totals
✓ updateOrder - updates pending orders, validates new products
✓ submitOrder - changes order status, validates preconditions

OrdersController:
✓ listOrders - delegates to service
✓ createOrder - delegates to service with auth token
✓ getOrderById - delegates to service with auth token
✓ submitOrder - delegates to service with auth token
```

### Running Tests

```bash
# Run all tests
npm test

# Run orders tests only
npm test -- orders

# Run with coverage
npm test -- --coverage orders
```

## Integration Points

### With Other Services

**Product Service**

- Endpoint: `GET /products/{id}`
- Purpose: Validate products and retrieve prices
- Auth: Bearer token passed through
- Failure handling: Non-critical validation failures result in 400 BAD_REQUEST

**Loyalty Service**

- Endpoint: `POST /loyalty/{userId}/accrue` (async)
- Purpose: Accrue loyalty points for orders
- Auth: Bearer token passed through
- Failure handling: Non-blocking, failures logged but don't affect order creation

**Auth Service**

- Via `@bitovi-training/auth-middleware`
- Validates JWT tokens
- Enforces admin role requirements

## Configuration

### Environment Variables

```
PRODUCT_SERVICE_URL=http://localhost:3000      # Product service endpoint
LOYALTY_SERVICE_URL=http://localhost:3000      # Loyalty service endpoint
```

### Root Configuration

- HTTP Module from `@nestjs/axios` for external HTTP calls
- Config Module from `@nestjs/config` for environment management
- Auth Module from `@bitovi-training/auth-middleware`

## Migration Notes

### Breaking Changes

- Orders API now at `/orders` on port 3000 (was port 8080)
- Environment variables structure changed (removed PORT, updated URLs)
- `ORDER_SERVICE_URL` in other services should now point to main app: `http://localhost:3000`

### Deployment Changes

**Docker Compose**

- Removed dedicated `orders` service container
- All services now run under single `nestjs-app` container
- Simplified networking configuration

**Build Process**

- Orders service now built as part of main NestJS application
- No separate Go build step required

## Performance Considerations

1. **In-Memory Storage**: Current mock data suitable for < 100K orders
2. **Product Validation**: Sequential validation - N products = N HTTP calls
3. **Loyalty Accrual**: Async (fire-and-forget) to avoid blocking response
4. **Service Timeouts**: Configured at HTTP client level with defaults

## Future Enhancements

1. **Database Integration**
   - Replace in-memory storage with persistent database
   - Add order history and analytics queries
   - Implement order status transitions

2. **Performance Optimization**
   - Batch product validation API
   - Product cache with TTL
   - Rate limiting and pagination for list endpoints

3. **Event-Driven Architecture**
   - Publish order events (OrderCreated, OrderSubmitted)
   - Async loyalty points accrual via message queue
   - Event sourcing for audit trail

4. **Advanced Features**
   - Order cancellation with refunds
   - Partial refunds and order amendments
   - Shipping integration
   - Invoice generation

## Security Considerations

1. **Authentication**: JWT validation enforced on all endpoints
2. **Authorization**: Admin role required - restrict access appropriately
3. **Input Validation**: Class validators on all DTOs
4. **Service-to-Service Auth**: Token forwarding to Product/Loyalty services
5. **Error Messages**: Generic error responses in production to avoid information leakage

## Monitoring & Observability

### Logging

- Request/response logging via NestJS Logger
- Service client errors logged with context
- Business logic errors tracked with order IDs

### Health Checks

- `/health` endpoint for container orchestration
- Service dependency checks recommended in production

## Troubleshooting

### Common Issues

**Orders endpoint returns 503**

- Check Product Service URL configuration
- Verify Product Service is running and accessible
- Check network connectivity between services

**Validation errors on create**

- Ensure userId and productIds are valid UUIDs
- Verify products exist in Product Service
- Check product prices are numeric values

**Authorization errors (403)**

- Verify JWT token is valid
- Confirm user has 'admin' role
- Check token expiration

## Rollback Plan

If issues arise:

1. Switch docker-compose to use separate orders service (restore Git state)
2. Redeploy Go-based orders service container
3. Update ORDER_SERVICE_URL in other services

## References

- [NestJS Documentation](https://docs.nestjs.com)
- [OpenAPI Specification](../src/orders/api/openapi.yaml) - Still valid, endpoints unchanged
- [Auth Middleware](https://github.com/bitovi-corp/auth-middleware-go)
- [Existing Go Implementation](../src/orders-go-backup/) - Available for reference

---

**Refactoring Completed**: April 9, 2026  
**Status**: Ready for Integration Testing  
**Maintainers**: Bitovi Development Team
