# Order API Tests - TypeScript/NestJS

## Overview

This directory contains e2e and integration tests for the Orders Service, which is now part of the main NestJS monolith on port 3000.

**Previous Implementation**: Go service on port 8080 (archived in `go-tests-archived/`)  
**Current Implementation**: NestJS module (port 3000)

## Structure

```
order/
├── order.e2e.ts              # Main e2e test suite (refactored)
├── order.spec.ts             # Existing TypeScript test suite
├── order_workflow_test.md     # Test specification document
├── go-tests-archived/         # Archived Go test files
│   ├── order_workflow_test.go
│   ├── product_service_integration_test.go
│   └── go.mod
├── go.mod                     # Archived - for reference only
└── go.sum                     # Archived - for reference only
```

## Running Tests

### All Order Tests
```bash
npm test -- test/api/order
```

### Specific Test Suite
```bash
npm test -- test/api/order/order.e2e.ts
```

### Watch Mode
```bash
npm test -- test/api/order --watch
```

### With Coverage
```bash
npm test -- test/api/order --coverage
```

## Test Suites

### order.e2e.ts (NEW - TypeScript)
Comprehensive e2e tests for the NestJS Orders service:
- Health check endpoint
- List orders (GET /orders)
- Get order by ID (GET /orders/{orderId})
- Create order (POST /orders)
- Update order (PATCH /orders/{orderId})
- Submit order (POST /orders/{orderId}/submit)
- Full order workflow lifecycle

**Status**: ✅ Active

### order.spec.ts (LEGACY - TypeScript)
Original test file from the codebase.

**Status**: ⚠️ Needs review for compatibility

### go-tests-archived/ (DEPRECATED - Go)
Original Go-based tests from when Orders was a standalone service.

**Status**: ❌ Archived (reference only)

## Authentication

Tests use the same auth pattern as other e2e tests:
- `getEnvTokenOrMock()` for token generation
- Supports environment variables for real tokens
- Mock tokens for development/testing
- Admin role required for all order operations

## Fixtures

Common test data:
```typescript
fixtures = {
  validUserId: '750e8400-e29b-41d4-a716-446655440000',
  validProductId: '550e8400-e29b-41d4-a716-446655440000',
  invalidProductId: '550e8400-e29b-41d4-a716-446655440999',
  invalidUUID: 'not-a-uuid',
}
```

## Test Patterns

### HTTP Retry Pattern
```typescript
const response = await withRetry(() => client.get('/orders'));
```

### Admin Client
```typescript
const adminClient = createClient('order', true, adminToken);
```

### Assertion Examples
```typescript
expect(response.status).toBe(200);
expect(response.data.orders).toBeDefined();
expect(Array.isArray(response.data.orders)).toBe(true);
```

## Refactoring Notes

**What Changed**:
- Removed dependency on Go service implementation
- Updated URLs from port 8080 to port 3000
- Changed from httptest package to HTTP client calls
- Adapted to NestJS response format
- Uses existing test helper functions (createClient, withRetry, etc.)

**What Stayed the Same**:
- Test scenarios and workflows
- API endpoint contracts
- Request/response validation
- Authentication patterns

## Future Enhancements

1. **Database State Management**: Add fixtures/factories for test data
2. **Loyalty Service Integration**: Test points accrual workflow
3. **Product Service Integration**: Mock or real service integration
4. **Performance Tests**: Load and stress testing
5. **Contract Tests**: Test API contracts against OpenAPI spec

## Debugging

### View HTTP Responses
```typescript
console.log('Response:', response.data);
console.log('Status:', response.status);
```

### Manual API Testing
```bash
# List orders
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/orders

# Create order
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "750e8400-e29b-41d4-a716-446655440000",
    "products": [{"productId": "550e8400-e29b-41d4-a716-446655440000", "quantity": 1}]
  }'
```

## Related Documentation

- [Orders Service README](../../src/orders/README.md)
- [Orders Refactoring Guide](../../ORDERS_REFACTORING.md)
- [Test Specification](./order_workflow_test.md)
- [Archived Go Implementation](./go-tests-archived/go.mod)

---

**Last Updated**: April 9, 2026  
**Test Framework**: Jest + axios (HTTP client)  
**Node.js Version**: 20+
