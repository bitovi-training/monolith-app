# Go Implementation - Archived

This directory contains the archived Go implementation of the Orders Service, originally implemented in Go 1.25.5 with a standard HTTP server.

## ⚠️ DEPRECATED

**Status**: Archived  
**Reason**: Refactored to TypeScript/NestJS for monorepo consolidation  
**Replacement**: See [../README.md](../README.md)

## Contents

- `cmd/server/main.go` - Original application entry point
- `internal/handlers/` - HTTP request handlers
- `internal/services/` - Business logic layer
- `internal/models/` - Data structures
- `internal/config/` - Configuration management
- `internal/middleware/` - Logging middleware
- `Dockerfile` - Original Docker build configuration
- `go.mod` - Go module definition

## Rationale for Archiving

1. **Monorepo Consolidation**: All services now run as NestJS modules in a single application
2. **Unified Technology Stack**: Eliminated Go in favor of TypeScript/Node.js
3. **Operational Simplification**: Single Docker container, unified logging, shared infrastructure
4. **Feature Parity**: All functionality has been replicated in TypeScript

## How to Use This Archive

### For Reference

```bash
cd go-implementation-archived
cat cmd/server/main.go        # See original entry point
cat internal/services/order_service.go  # See original business logic
```

### For Rollback (if needed)

If issues arise with the TypeScript implementation:

1. Restore this directory to `src/orders/`
2. Remove TypeScript files from `src/orders/`
3. Update `docker-compose.yml` to run orders service separately
4. Change `go.work` to include `./src/orders`

### API Parity

The original API specification (`../api/openapi.yaml`) is still valid. The TypeScript implementation maintains 100% API compatibility with this archive.

## Key Implementation Details (Historical Reference)

### Service Clients

- **ProductClient**: HTTP calls to Product Service for product validation and pricing
- **LoyaltyClient**: HTTP calls to Loyalty Service for point accrual

### Mock Data

- 3 sample orders with different statuses
- Products use UUID format matching TypeScript implementation
- Sample data resets available for test isolation

### Error Handling

- Standardized error response format (`ErrorResponse`)
- Service-to-service error propagation
- Non-blocking loyalty points accrual

## Migration Notes

**What Changed**:

- HTTP framework: Standard library → NestJS
- Language: Go → TypeScript
- Port: 8080 → 3000 (integrated into main app)
- Deployment: Separate container → Single monolith container

**What Stayed the Same**:

- API endpoints and contracts
- Business logic and validation rules
- Product/Loyalty service integration patterns
- Error response formats
- Mock data structure

## Testing the Archive

```bash
# Compile and run tests
cd go-implementation-archived
go test ./...
go run cmd/server/main.go
```

---

**Archived**: April 9, 2026  
**Previous Active Version**: see git history for full implementation  
**Current Implementation**: [../../README.md](../../README.md) - TypeScript/NestJS
