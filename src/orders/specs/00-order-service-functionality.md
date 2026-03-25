# Feature Specification: Order Service Core Functionality

**Feature Branch**: `00-order-service-functionality`  
**Created**: 2026-01-14  
**Status**: Documentation  
**Purpose**: Document existing order service functionality including order workflow and external integrations

**Project Context:**
- Technology: Go 1.25.5
- Service Name: order-service
- Architecture: Standard Go project layout with HTTP API
- External Dependencies: 
  - Product Service (via PRODUCT_SERVICE_URL)
  - Loyalty Service (via LOYALTY_SERVICE_URL)

## Overview

This specification documents the existing functionality of the Order Service, a Go HTTP API server demonstrating e-commerce order management. The service follows a contract-first approach with OpenAPI specification and implements order workflow features with integration to external Product Service and Loyalty Service.

**Current Implementation Status**: 
- Order CRUD operations: ✅ Implemented
- Product Service integration: ✅ Implemented (2026-01-14)

## User Scenarios & Testing

### User Story 1 - List All Orders (Priority: P1)

As an admin user, I need to retrieve a list of all orders in the system so that I can monitor order activity and status.

**Acceptance Scenarios**:

1. **Given** the system has multiple orders, **When** requesting GET /orders with valid authentication, **Then** the system returns all orders with total count
2. **Given** the system has no orders, **When** requesting GET /orders, **Then** the system returns an empty orders array with total count of 0
3. **Given** no authentication token is provided, **When** requesting GET /orders, **Then** the system returns 401 Unauthorized
4. **Given** an invalid authentication token, **When** requesting GET /orders, **Then** the system returns 401 Unauthorized

---

### User Story 2 - Retrieve Order by ID (Priority: P1)

As an admin user, I need to retrieve a specific order by its ID so that I can view detailed order information.

**Acceptance Scenarios**:

1. **Given** a valid orderId exists, **When** requesting GET /orders/{orderId} with valid authentication, **Then** the system returns the complete order details including products, prices, and status
2. **Given** an orderId does not exist, **When** requesting GET /orders/{orderId}, **Then** the system returns 404 ORDER_NOT_FOUND
3. **Given** an invalid UUID format for orderId, **When** requesting GET /orders/{orderId}, **Then** the system returns 400 INVALID_ORDER_ID with validation error
4. **Given** no authentication token is provided, **When** requesting GET /orders/{orderId}, **Then** the system returns 401 Unauthorized

---

### User Story 3 - Create Order with Product Validation (Priority: P1)

As a user, I want to create an order with products from the catalog so that I can purchase items, and the system should validate that all products exist in the Product Service.

**Acceptance Scenarios**:

1. **Given** a valid userId and valid productIds from Product Service, **When** creating an order via POST /orders, **Then** the system validates products with Product Service, calculates total price using actual product prices, and creates the order in PENDING status
2. **Given** a valid userId but one or more invalid productIds, **When** creating an order, **Then** the system queries Product Service, detects invalid products, and returns 400 BAD_REQUEST with details about which products are invalid
3. **Given** missing or empty userId, **When** creating an order, **Then** the system returns 400 MISSING_USER_ID
4. **Given** invalid userId format (not a UUID), **When** creating an order, **Then** the system returns 400 INVALID_USER_ID
5. **Given** empty products array, **When** creating an order, **Then** the system returns 400 EMPTY_PRODUCTS
6. **Given** products with quantity < 1, **When** creating an order, **Then** the system returns 400 with validation error
7. **Given** Product Service is unavailable, **When** creating an order, **Then** the system returns 503 SERVICE_UNAVAILABLE with details about Product Service unavailability
8. **Given** no authentication token is provided, **When** creating an order, **Then** the system returns 401 Unauthorized

**Product Service Integration**:
- System MUST call Product Service GET /products/{id} for each productId to validate existence
- System MUST use actual product prices from Product Service for total price calculation
- System MUST handle Product Service failures gracefully (timeouts, 404s, 500s)

---

### User Story 4 - Order Modification with Product Revalidation (Priority: P2)

As a user with a pending order, I want to update the products and quantities in my order so that I can adjust my purchase before submission, and the system should validate any new products against the Product Service.

**Acceptance Scenarios**:

1. **Given** a PENDING order, **When** patching with positive quantities for existing products, **Then** the system adds to existing quantities (additive) and recalculates total price
2. **Given** a PENDING order, **When** patching with positive quantities for new productIds, **Then** the system validates the new products with Product Service, adds them to the order, and recalculates total price
3. **Given** a PENDING order, **When** patching with negative quantities, **Then** the system subtracts from existing quantities (subtractive), removes products if result ≤ 0, and recalculates total price
4. **Given** a PENDING order, **When** patching with quantity 0, **Then** no change is made to that product
5. **Given** a PENDING order, **When** patching with invalid productIds, **Then** the system validates with Product Service and returns 400 BAD_REQUEST for invalid products
6. **Given** a non-PENDING order (processing, shipped, delivered), **When** attempting to patch, **Then** the system returns 400 error with code "ORDER_NOT_PENDING"
7. **Given** Product Service is unavailable, **When** patching an order with new products, **Then** the system returns 503 SERVICE_UNAVAILABLE

**Product Service Integration**:
- System MUST validate any new productIds added via PATCH against Product Service
- System MUST recalculate order total using actual Product Service prices
- System MUST NOT allow adding products that don't exist in Product Service

---

### User Story 5 - Order Submission (Priority: P1)

As a user, I want to submit my order for processing so that it can be fulfilled.

**Acceptance Scenarios**:

1. **Given** a PENDING order, **When** submitting the order via POST /orders/{orderId}/submit, **Then** the system changes status to PROCESSING and triggers loyalty-service accrual
2. **Given** a PENDING order, **When** submitting with action=cancel, **Then** the system changes status to CANCELLED
3. **Given** a non-PENDING order, **When** attempting to submit, **Then** the system returns 400 error with code "ORDER_NOT_PENDING"

---

### User Story 6 - Authentication and Security (Priority: P1)

As a system, I need to authenticate all API requests to ensure secure access.

**Acceptance Scenarios**:

1. **Given** a valid Bearer token (20+ characters for development), **When** making an API request, **Then** the request is processed
2. **Given** no Bearer token, **When** making an API request to protected endpoint, **Then** the system returns 401 Unauthorized
3. **Given** an invalid or short token, **When** making an API request, **Then** the system returns 401 Unauthorized

---

### Edge Cases

- What happens when concurrent updates are made to the same order?
- How does the system handle product price changes after an order is created but before submission?
- What happens if Product Service is unavailable during order creation?
- What happens if Product Service is unavailable during order modification?
- How does the system handle extremely large order quantities?
- What happens if Product Service returns inconsistent pricing between order creation and modification?
- What happens if a product becomes unavailable after being added to an order?
- How does the system handle timeouts when calling Product Service?
- What happens if Product Service returns a product price change while calculating order totals?

## Requirements

### Functional Requirements

#### Order Management
- **FR-001**: System MUST retrieve all orders via GET /orders with authentication
- **FR-002**: System MUST retrieve individual order by ID via GET /orders/{orderId} with UUID validation
- **FR-003**: System MUST create orders with userId, product list, and quantities via POST /orders
- **FR-004**: System MUST validate orderId format as valid UUID for all order operations
- **FR-005**: System MUST initialize all new orders with PENDING status
- **FR-006**: System MUST support order modification via PATCH /orders/{orderId} for PENDING orders only
- **FR-007**: System MUST prevent modifications to non-PENDING orders
- **FR-008**: System MUST support order submission via POST /orders/{orderId}/submit
- **FR-009**: System MUST support order cancellation via POST /orders/{orderId}/submit with action=cancel
- **FR-010**: System MUST track order status transitions (PENDING → PROCESSING → SHIPPED → DELIVERED, CANCELLED)

#### Product Service Integration
#### Loyalty Service Integration
- System MUST call Loyalty Service POST /loyalty/orders on order submission
- System MUST pass orderId, userId, and totalPrice to loyalty-service
- System MUST store the returned accruedLoyaltyPoints on the order
- **FR-011**: System MUST validate all productIds against Product Service during order creation
- **FR-012**: System MUST call Product Service GET /products/{id} to validate each product exists
- **FR-013**: System MUST retrieve actual product prices from Product Service for total price calculation
- **FR-014**: System MUST validate new productIds against Product Service during order modification (PATCH)
- **FR-015**: System MUST recalculate order total using Product Service prices after any modification
- **FR-016**: System MUST return 400 BAD_REQUEST with details when productIds don't exist in Product Service
- **FR-017**: System MUST return 503 SERVICE_UNAVAILABLE when Product Service is unreachable
- **FR-018**: System MUST handle Product Service timeouts gracefully (suggest: 5 second timeout)

#### Order Product Updates (PATCH Logic)
- **FR-024**: System MUST support additive updates (positive quantity adds to existing quantity)
- **FR-025**: System MUST support subtractive updates (negative quantity subtracts from existing quantity)
- **FR-026**: System MUST remove products from order when quantity becomes ≤ 0
- **FR-027**: System MUST ignore zero quantity updates (no change)
- **FR-028**: System MUST validate quantity values are integers

#### Validation & Error Handling
- **FR-029**: System MUST validate userId is provided and not empty during order creation
- **FR-030**: System MUST validate userId is a valid UUID format
- **FR-031**: System MUST validate products array is not empty during order creation
- **FR-032**: System MUST validate each product has productId and quantity
- **FR-033**: System MUST validate quantity is positive (> 0) during order creation
- **FR-034**: System MUST return standardized error responses with code, message, and details
- **FR-035**: System MUST return appropriate HTTP status codes per OpenAPI specification

#### Authentication
- **FR-036**: System MUST authenticate all endpoints using Bearer token
- **FR-037**: System MUST accept Bearer tokens with 20+ characters (development mode)
- **FR-038**: System MUST return 401 Unauthorized for missing or invalid tokens

### Non-Functional Requirements

- **NFR-001**: System MUST use standardized error response format with code, message, and details fields
- **NFR-002**: System MUST follow OpenAPI specification as source of truth for all API contracts
- **NFR-003**: System MUST use standard Go project layout with clear separation of concerns
- **NFR-004**: System MUST support concurrent request handling
- **NFR-005**: System MUST validate all input parameters before processing
- **NFR-006**: System MUST log all requests and responses via middleware
- **NFR-007**: System MUST implement request/response logging with details
- **NFR-008**: System MUST handle Product Service failures gracefully
- **NFR-009**: System MUST implement timeout handling for Product Service calls (recommend 5s)
- **NFR-010**: System SHOULD implement retry logic for transient Product Service failures
- **NFR-011**: System MUST return clear error messages when Product Service is unavailable

### API Requirements

- **API-001**: All endpoints require Bearer token authentication
- **API-002**: Development tokens must be 20+ characters
- **API-003**: All routes must use middleware composition (logging + auth)
- **API-004**: All errors must use standardized format: `{code: string, message: string, details: string}`
- **API-005**: Order status must be one of: PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED
- **API-006**: GET /orders must return: `{orders: Order[], total: number}`
- **API-007**: POST /orders must accept: `{userId: UUID, products: [{productId: UUID, quantity: number}]}`
- **API-008**: POST /orders must return 201 Created with order object on success
- **API-009**: GET /orders/{orderId} must return single order object or 404
- **API-010**: PATCH /orders/{orderId} must accept: `{products: [{productId: UUID, quantity: number}]}`
- **API-011**: POST /orders/{orderId}/submit must accept optional: `{action: "cancel"}`
- **API-012**: All UUID parameters must be validated for proper format

### External Service API Contracts

#### Product Service (PRODUCT_SERVICE_URL)
- **EXT-001**: Endpoint: GET /products - Returns all products `{data: Product[], count: number}`
- **EXT-002**: Endpoint: GET /products/{id} - Returns single product or 404 NotFoundException
- **EXT-003**: Product schema: `{id: number, name: string, description: string, price: number, availability: boolean}`
- **EXT-004**: Authentication: GET /products requires no auth, GET /products/{id} requires Bearer token
- **EXT-005**: Service runs on port 8200 in Docker Compose environment



## Technical Architecture

### Technology Stack

- **Language**: Go 1.25.5
- **HTTP Router**: net/http (standard library)
- **UUID Generation**: github.com/google/uuid v1.6.0
- **API Specification**: OpenAPI 3.1.0
- **Testing**: Go testing package with table-driven tests
- **HTTP Client**: net/http (for external service calls)

### Project Structure

```
order-service/
├── api/                      # OpenAPI specification (source of truth)
│   └── openapi.yaml         # Complete API contract
├── cmd/server/              # Application entry point
│   └── main.go              # Server initialization and routing
├── internal/
│   ├── config/              # Configuration management
│   │   └── config.go        # Environment variables (PRODUCT_SERVICE_URL, LOYALTY_SERVICE_URL)
│   ├── handlers/            # HTTP request handlers
│   │   └── orders.go        # Order CRUD endpoints
│   ├── middleware/          # HTTP middleware
│   │   ├── logging.go       # Request/response logging
│   │   └── auth.go          # Bearer token authentication (planned)
│   ├── models/              # Data structures
│   │   ├── order.go         # Order, OrderProduct, OrderStatus
│   │   ├── error.go         # ErrorResponse
│   │   └── product.go       # Product (for external service integration)
│   └── services/            # Business logic
│       └── order_service.go # Order management, external service calls
└── tests/integration/       # End-to-end integration tests
    └── order_workflow_test.go
```

### External Service Integration

#### Product Service
- **Environment Variable**: `PRODUCT_SERVICE_URL` (e.g., `http://product-service:8200`)
- **Purpose**: Validate products and retrieve pricing information
- **Current Status**: 🔄 Placeholder logic exists, needs implementation
- **Required Calls**:
  - `GET /products` - List all products (no auth)
  - `GET /products/{id}` - Get product details with price (requires auth)
- **Implementation Location**: `internal/services/order_service.go`
- **TODOs in Code**:
  ```go
  // TODO: Integrate with PRODUCT_SERVICE_URL to fetch actual product prices
  // TODO: Integrate with PRODUCT_SERVICE_URL to validate products
  ```



### Data Models

#### Order (models.Order)
```go
type Order struct {
    ID          string         // UUID format
    UserID      string
    Products    []OrderProduct
    TotalPrice  float64
    AccruedLoyaltyPoints int
    OrderDate   time.Time
    Status      OrderStatus    // PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED
}
```

#### OrderProduct (models.OrderProduct)
```go
type OrderProduct struct {
    ProductID    string  // UUID format - must exist in Product Service
    ProductName  string  // Fetched from Product Service
    Quantity     int     // Must be > 0 for creation, can be negative for PATCH
    Price        float64 // Fetched from Product Service
}
```

#### OrderStatus (models.OrderStatus)
```go
type OrderStatus string

const (
    OrderStatusPending    OrderStatus = "PENDING"
    OrderStatusProcessing OrderStatus = "PROCESSING"
    OrderStatusShipped    OrderStatus = "SHIPPED"
    OrderStatusDelivered  OrderStatus = "DELIVERED"
    OrderStatusCanceled   OrderStatus = "CANCELLED"
)
```

#### ErrorResponse (models.ErrorResponse)
```go
type ErrorResponse struct {
    Code    string // Error code identifier (e.g., "ORDER_NOT_FOUND", "INVALID_ORDER_ID")
    Message string // Human-readable error message
    Details string // Additional context or technical details
}
```

#### Product (external - from Product Service)
```typescript
interface Product {
    id: number           // Product Service uses numeric IDs
    name: string
    description: string
    price: number
    availability: boolean
}
```

#### API Request/Response Models

**POST /orders Request Body**:
```json
{
  "userId": "750e8400-e29b-41d4-a716-446655440000",
  "products": [
    {
      "productId": "550e8400-e29b-41d4-a716-446655440000",
      "quantity": 2
    }
  ]
}
```

**GET /orders Response**:
```json
{
  "orders": [Order, Order, ...],
  "total": 10
}
```

**PATCH /orders/{orderId} Request Body**:
```json
{
  "products": [
    {
      "productId": "550e8400-e29b-41d4-a716-446655440000",
      "quantity": 2     // positive = add, negative = subtract, 0 = no change
    }
  ]
}
```

**POST /orders/{orderId}/submit Request Body** (optional):
```json
{
  "action": "cancel"   // If present, cancels order instead of submitting
}
```

### Business Logic

#### Order Update Logic (PATCH /orders/{orderId})
Only PENDING orders can be modified. For each product in the PATCH request:

1. **Positive quantity** (`quantity > 0`):
   - If product exists in order: Add to existing quantity (additive)
   - If product is new: Validate against Product Service, then add to order

2. **Negative quantity** (`quantity < 0`):
   - If product exists: Subtract from existing quantity (subtractive)
   - If result ≤ 0: Remove product from order
   - If product doesn't exist: Ignore (no error)

3. **Zero quantity** (`quantity = 0`):
   - No change made (ignore)

After modifications:
- Recalculate total price using Product Service prices

#### Order Status Workflow

**Valid Status Transitions**:
```
PENDING → PROCESSING  (via submit)
PENDING → CANCELLED   (via submit with action=cancel)
PROCESSING → SHIPPED  (manual/future implementation)
SHIPPED → DELIVERED   (manual/future implementation)
```

**Business Rules**:
- Only PENDING orders can be modified (PATCH)
- Only PENDING orders can be submitted
- Orders transition to PROCESSING status on successful submission
- Cancelled orders remain in CANCELLED status

#### Product Validation Flow (Order Creation)

```
1. Receive POST /orders with userId and products[]
2. Validate userId format (UUID)
3. Validate products array not empty
4. For each product:
   a. Call Product Service GET /products/{productId}
   b. If 404: Return error "Product {id} not found"
   c. If 200: Extract price from response
   d. Calculate line total: price × quantity
5. Sum all line totals = order total price
6. Create order with PENDING status
7. Return created order
```

#### Product Validation Flow (Order Modification)

```
1. Receive PATCH /orders/{orderId} with products[]
2. Verify order exists and status is PENDING
3. For each product with positive quantity (new products):
   a. Call Product Service GET /products/{productId}
   b. If 404: Return error "Product {id} not found"
   c. If 200: Extract price from response
4. Apply additive/subtractive logic
5. Recalculate total price using Product Service
6. Return updated order
```

#### Error Handling Strategy

**Product Service Errors**:
- 404 Not Found → Return 400 BAD_REQUEST to client with "Product {id} not found"
- 500 Server Error → Return 503 SERVICE_UNAVAILABLE with "Product Service unavailable"
- Timeout → Return 503 SERVICE_UNAVAILABLE with "Product Service timeout"
- Connection Refused → Return 503 SERVICE_UNAVAILABLE with "Product Service unreachable"

**Validation Errors** → Return 400 BAD_REQUEST with specific error codes:
- MISSING_USER_ID
- INVALID_USER_ID
- EMPTY_PRODUCTS
- INVALID_ORDER_ID
- ORDER_NOT_FOUND
- ORDER_NOT_PENDING
- INVALID_PRODUCT_ID

## Implementation Status

### ✅ Completed Features (Updated 2026-01-14)
- Basic order CRUD operations (Create, Read, List)
- Order modification with additive/subtractive logic (PATCH)
- Order submission endpoint structure
- UUID validation for all ID parameters
- Bearer token authentication middleware (development mode)
- Request/response logging middleware
- Standardized error response format
- Mock data storage with reset capability for testing
- OpenAPI specification defining all contracts
- **Product Service Integration**:
  - ProductServiceClient with HTTP communication (`internal/services/product_client.go`)
  - Product validation on order creation
  - Product validation on order modification (new products only)
  - Real-time price fetching from Product Service
  - Error handling for unavailable products (404 → 400)
  - Error handling for unavailable service (500/503 → 503)
  - 5-second timeout for external service calls
  - Bearer token authentication support (optional)
- **Comprehensive Test Coverage**:
  - Unit tests for ProductServiceClient (8 test cases)
  - Unit tests for OrderService with mocked client (12 test cases)
  - Handler tests with mock integration (all passing)
  - Integration tests for Product Service communication
  - Complete order workflow integration test

### 🔄 Future Enhancements

#### Medium Priority - Enhanced Resilience
- Implement retry logic for transient external service failures
- Add circuit breaker pattern for external service calls
- Enhanced logging for external service interactions
- Metrics collection for external service latency
- Caching layer for frequently accessed products

### ❌ Not Implemented (Future Scope)
- User management endpoints (moved to separate User Service)
- Product catalog endpoints (handled by Product Service)
- Database integration (currently using in-memory mock storage)
- Production-grade authentication (currently simplified for demo)
- Order history analytics
- Payment processing integration
- Inventory management
- Shipping tracking integration
- Order notifications (email, SMS)
- Multi-tenancy support
- Rate limiting
- API versioning

## Testing Strategy

### Test Levels

1. **Unit Tests**: Test individual handlers, middleware, and services
2. **Integration Tests**: Test complete workflows end-to-end with external services
3. **Contract Tests**: Verify integration with Product Service and Loyalty Service APIs
4. **Mock Data Reset**: Ensure test isolation with data reset between tests

### Testing Prerequisites

**⚠️ IMPORTANT**: Before running any tests, ensure Docker Compose services are running:

```bash
cd dev
docker-compose up -d
docker-compose ps  # verify services are up
```

The order service depends on:
- **Product Service** (port 8200) - Required for product validation and pricing

### Test Commands

```bash
# Run all tests
go test ./...

# Run specific package tests
go test ./internal/handlers
go test ./internal/middleware
go test ./tests/integration

# Run with verbose output
go test -v ./...

# Test stability (run multiple times)
go test ./... -count=3

# Clean test cache
go clean -testcache
```

### Required Test Scenarios

#### Unit Tests (internal/handlers/orders_test.go)
- ✅ List orders with empty and populated datasets
- ✅ Get order by valid ID
- ✅ Get order by invalid ID (404)
- ✅ Get order by malformed UUID (400)
- ✅ Create order with valid data
- ✅ Create order with missing userId (400)
- ✅ Create order with invalid userId format (400)
- ✅ Create order with empty products (400)
- ✅ Create order with invalid productId (mocked Product Service validation)
- ✅ Update pending order with additive quantities
- ✅ Update pending order with subtractive quantities
- ✅ Update non-pending order (400)
- ✅ Update order with new invalid productId (mocked Product Service validation)

#### Integration Tests (tests/integration/)
- ✅ Complete order workflow: create → modify → submit
- ✅ Product validation with Product Service
- ✅ Error handling when Product Service is down
- ✅ Price calculation with real Product Service data
- ✅ Invalid product rejection (404 from Product Service)
- ✅ Service unavailability handling (503 error codes)

#### Contract Tests (new)
- ✅ Product Service GET /products/{id} response structure validation
- ✅ Error response format validation (404, 500, 503)
- 🔄 Product Service schema change detection (future enhancement)

## Constitutional Compliance

This service adheres to Constitutional Principles (v1.0.1):

1. **Contract-First Development**: OpenAPI spec is source of truth
2. **Standard Go Project Layout**: Clear separation of concerns
3. **Test Coverage & Isolation**: Comprehensive unit and integration tests
4. **Middleware Composition**: Consistent auth and logging patterns
5. **Standard Error Handling**: Uniform error response format

**Compliance Status**: ✅ 100% Compliant

## Dependencies

- github.com/google/uuid (v1.6.0) - UUID generation and validation

## Deployment

### Local Development
```bash
go run cmd/server/main.go
```

### Docker
```bash
docker build -t order-service .
docker run -p 8100:8100 order-service
```

### Docker Compose (Multi-Service)
```bash
cd dev
docker-compose up -d
```

## API Endpoints Summary

### Orders
- **GET /orders** - List all orders
  - **Auth**: Required (Bearer token)
  - **Status**: ✅ Implemented
  - **Returns**: `{orders: Order[], total: number}`
  - **Errors**: 401 Unauthorized, 500 Internal Server Error

- **POST /orders** - Create new order
  - **Auth**: Required (Bearer token)
  - **Status**: 🔄 Partially implemented (needs Product Service validation)
  - **Body**: `{userId: UUID, products: [{productId: UUID, quantity: number}]}`
  - **Returns**: 201 Created with Order object
  - **Errors**: 
    - 400 MISSING_USER_ID, INVALID_USER_ID, EMPTY_PRODUCTS, INVALID_PRODUCT_ID
    - 401 Unauthorized
    - 503 SERVICE_UNAVAILABLE (when Product Service is down)
  - **TODO**: Add Product Service integration for validation and pricing

- **GET /orders/{orderId}** - Get order by ID
  - **Auth**: Required (Bearer token)
  - **Status**: ✅ Implemented
  - **Returns**: Order object
  - **Errors**: 
    - 400 INVALID_ORDER_ID (invalid UUID format)
    - 401 Unauthorized
    - 404 ORDER_NOT_FOUND
    - 500 Internal Server Error

- **PATCH /orders/{orderId}** - Update order products (PENDING only)
  - **Auth**: Required (Bearer token)
  - **Status**: 🔄 Partially implemented (needs Product Service revalidation)
  - **Body**: `{products: [{productId: UUID, quantity: number}]}`
  - **Returns**: Updated Order object
  - **Errors**:
    - 400 INVALID_ORDER_ID, ORDER_NOT_FOUND, ORDER_NOT_PENDING, INVALID_PRODUCT_ID
    - 401 Unauthorized
    - 503 SERVICE_UNAVAILABLE (when Product Service is down)
  - **TODO**: Add Product Service validation for new products added via PATCH

- **POST /orders/{orderId}/submit** - Submit or cancel order
  - **Auth**: Required (Bearer token)
  - **Status**: ✅ Implemented
  - **Body**: `{action?: "cancel"}` (optional)
  - **Returns**: Updated Order object with new status
  - **Errors**:
    - 400 INVALID_ORDER_ID, ORDER_NOT_FOUND, ORDER_NOT_PENDING
    - 401 Unauthorized

### Authentication Format
All endpoints require:
```
Authorization: Bearer <token>
```
Development mode: Any token with 20+ characters is accepted.

## Dependencies

- **github.com/google/uuid** (v1.6.0) - UUID generation and validation

## Environment Variables

- **PORT** - Server port (default: 8100)
- **PRODUCT_SERVICE_URL** - Product Service base URL (e.g., `http://product-service:8200`)
- **LOYALTY_SERVICE_URL** - Loyalty Service base URL (e.g., `http://loyalty-service:8300`)

## Deployment

### Local Development
```bash
go run cmd/server/main.go
```

### Docker
```bash
docker build -t order-service .
docker run -p 8100:8100 \
  -e PRODUCT_SERVICE_URL=http://product-service:8200 \
  order-service
```

### Docker Compose (Multi-Service)
```bash
cd dev
docker-compose up -d
```

The docker-compose configuration:
- **order-service**: port 8100
- **product-service**: port 8200

## Future Considerations

### Immediate Next Steps (Implementation TODOs)
1. **Product Service Integration** (HIGH PRIORITY)
   - Implement product validation in CreateOrder
   - Implement product validation in UpdateOrderProducts
   - Fetch real product prices instead of placeholders
   - Add timeout and error handling
   - Add retry logic for transient failures

2. **Enhanced Testing**
   - Add Product Service mock for unit tests
   - Add contract tests for Product Service
   - Add integration tests with real Product Service

### Future Enhancements (Lower Priority)
- **Database Integration**: Replace in-memory mock storage with PostgreSQL/MySQL
- **Real Authentication**: Implement OAuth2/JWT with proper token validation
- **User Service Integration**: Validate userId against User Service
- **Inventory Management**: Check product availability before order creation
- **Payment Processing**: Integrate payment gateway for order submission
- **Order Notifications**: Email/SMS notifications for status changes
- **Order History & Analytics**: Track order metrics and trends
- **Shipping Integration**: Real-time shipping status tracking
- **Rate Limiting**: Protect API from abuse
- **API Versioning**: Support multiple API versions
- **Multi-tenancy**: Support multiple organizations/tenants
- **GraphQL API**: Alternative to REST for flexible data fetching
- **WebSocket Support**: Real-time order status updates
- **Caching Layer**: Redis for frequently accessed data
- **Event-Driven Architecture**: Publish order events for other services
