# Order Workflow Integration Test Specification

## Test: Complete Order Flow with Loyalty Points

### Description
This test validates the complete order creation workflow including order management and loyalty points calculation via loyalty-service.

### Prerequisites
- Server running on localhost:8080
- Database seeded with product catalog
- Authentication system configured

### Test Steps

#### 1. Create a new user
- **Action**: Create a user via user-service
- **Expected Response**: 201 Created
- **Capture**: `userId` from response

#### 2. Create a new order for the new user
- **Action**: POST /orders
- **Request Body**:
  ```json
  {
    "userId": "{userId from step 1}",
    "products": [
      {
        "productId": "550e8400-e29b-41d4-a716-446655440000",
        "quantity": 1
      },
      {
        "productId": "550e8400-e29b-41d4-a716-446655440003",
        "quantity": 3
      }
    ]
  }
  ```
- **Expected Response**: 201 Created
- **Capture**: `orderId` from response

#### 3. Add 1 wireless mouse to the order
- **Action**: PATCH /orders/{orderId}
- **Request Body**:
  ```json
  {
    "products": [
      {"productId": "550e8400-e29b-41d4-a716-446655440001", "quantity": 1}
    ]
  }
  ```
- **Expected Response**: 200 OK
- **Expected**: Order should now contain 3 distinct items
#### 4. Check loyalty points (should be 0 before order submission)
- **Action**: GET /loyalty/{userId}/balance
- **Expected Response**: 200 OK
  ```json
  {
    "balance": 0,
    "earnedPoints": 0,
    "redeemedPoints": 0
  }
  ```

#### 5. Submit the order
- **Action**: POST /orders/{orderId}/submit
- **Request Body**:
  ```json
  {
    "action": "SUBMIT"
  }
  ```
- **Expected Response**: 200 OK
- **Expected**: Order status changes to "PROCESSING"

#### 6. Check the status of the order
- **Action**: GET /orders/{orderId}
- **Expected Response**: 200 OK
- **Expected Body**:
  ```json
  {
    "id": "{order ID}",
    "status": "PROCESSING",
    "products": [...],
    "totalPrice": {calculated amount}
  }
  ```
- **Validation**: `status` field must equal "PROCESSING"

#### 7. Check the loyalty points for the order
- **Action**: GET /loyalty/{userId}/balance
- **Expected Response**: 200 OK
- **Calculation Logic**:
  - Laptop: $1299.99 × 1 = $1299.99
  - Notebook: $19.99 × 3 = $59.97
  - Wireless Mouse: $29.99 × 1 = $29.99
  - **Total**: $1,389.95
  - **Loyalty Points**: 1 point per $10 spent = 138 points (rounded down)
- **Expected Body**:
  ```json
  {
    "balance": 138,
    "earnedPoints": 138,
    "redeemedPoints": 0
  }
  ```

#### 8. Create a new order for the new user
- **Action**: POST /orders
- **Request Body**:
  ```json
  {
    "userId": "{userId from step 1}",
    "products": [
      {
        "productId": "550e8400-e29b-41d4-a716-446655440000",
        "quantity": 1
      },
      {
        "productId": "550e8400-e29b-41d4-a716-446655440003",
        "quantity": 3
      }
    ]
  }
  ```
- **Expected Response**: 201 Created
- **Capture**: `orderId` from response
### Cleanup
- Verify the first order that was submitted is still being processed
- Product prices must match the calculation above

### Notes
- This test requires authentication token (use test auth middleware)
- Product prices must match the calculation above
- Loyalty points calculation: floor(total_amount / 10) (performed in loyalty-service)
- Test should be idempotent and clean up after itself