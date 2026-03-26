package integration

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/Bitovi/example-go-server/internal/handlers"
	"github.com/Bitovi/example-go-server/internal/middleware"
	"github.com/Bitovi/example-go-server/internal/services"
	authmiddleware "github.com/bitovi-corp/auth-middleware-go/middleware"
)

func TestMain(m *testing.M) {
	// Reset mock data before running tests
	services.ResetOrderMockData()

	// Run tests
	code := m.Run()

	os.Exit(code)
}

// createMockJWT creates a mock JWT token with the given claims for testing
func createMockJWT(subject, email string, roles []string) string {
	// Create header
	header := map[string]string{"alg": "HS256", "typ": "JWT"}
	headerJSON, _ := json.Marshal(header)
	headerB64 := base64.RawURLEncoding.EncodeToString(headerJSON)

	// Create payload
	claims := map[string]interface{}{
		"sub":   subject,
		"email": email,
		"roles": roles,
	}
	payloadJSON, _ := json.Marshal(claims)
	payloadB64 := base64.RawURLEncoding.EncodeToString(payloadJSON)

	// Create mock signature (not verified in mock mode)
	signature := base64.RawURLEncoding.EncodeToString([]byte("mock-signature-for-integration-tests"))

	return headerB64 + "." + payloadB64 + "." + signature
}

// TestOrderWorkflow implements the complete order workflow integration test
// as specified in order_workflow_test.md
func TestOrderWorkflow(t *testing.T) {
	// Reset mock data at the start of the test
	services.ResetOrderMockData()

	t.Skip("Integration test requires loyalty-service and user-service to be running")

	// Create a mock JWT token for testing
	mockToken := createMockJWT("test-user-123", "test@example.com", []string{"user", "admin"})

	// Helper function to make authenticated requests
	makeRequest := func(method, path string, body interface{}) *httptest.ResponseRecorder {
		var reqBody io.Reader
		if body != nil {
			jsonBytes, err := json.Marshal(body)
			if err != nil {
				t.Fatalf("Failed to marshal request body: %v", err)
			}
			reqBody = bytes.NewReader(jsonBytes)
		}

		req := httptest.NewRequest(method, path, reqBody)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+mockToken)

		rr := httptest.NewRecorder()

		// Route to appropriate handler with middleware
		switch {
		case method == "POST" && len(path) > 7 && path[:7] == "/orders" && path[len(path)-7:] == "/submit":
			middleware.LoggingMiddleware(authmiddleware.AuthMiddleware(handlers.CancelOrSubmitOrder))(rr, req)
		case method == "POST" && path == "/orders":
			middleware.LoggingMiddleware(authmiddleware.AuthMiddleware(handlers.CreateOrder))(rr, req)
		case method == "GET" && len(path) > 8 && path[:8] == "/orders/":
			middleware.LoggingMiddleware(authmiddleware.AuthMiddleware(handlers.GetOrderByID))(rr, req)
		case method == "PATCH" && len(path) > 8 && path[:8] == "/orders/":
			middleware.LoggingMiddleware(authmiddleware.AuthMiddleware(handlers.UpdateOrder))(rr, req)
		default:
			t.Fatalf("No handler found for %s %s", method, path)
		}

		return rr
	}

	// Step 1: Use a known user from user-service or fixtures
	t.Log("Step 1: Use a known user ID")
	userID := "750e8400-e29b-41d4-a716-446655440000"
	var resp *httptest.ResponseRecorder

	// Step 2: Create a new order for the new user
	t.Log("Step 2: Create a new order")
	createOrderBody := map[string]interface{}{
		"userId": userID,
		"products": []map[string]interface{}{
			{"productId": "550e8400-e29b-41d4-a716-446655440000", "quantity": 1}, // Laptop
			{"productId": "550e8400-e29b-41d4-a716-446655440003", "quantity": 3}, // Notebook
		},
	}
	resp = makeRequest("POST", "/orders", createOrderBody)
	if resp.Code != http.StatusCreated {
		t.Fatalf("Step 2 failed: Expected 201, got %d. Body: %s", resp.Code, resp.Body.String())
	}

	var order map[string]interface{}
	if err := json.Unmarshal(resp.Body.Bytes(), &order); err != nil {
		t.Fatalf("Step 2: Failed to parse order response: %v", err)
	}
	orderID, ok := order["id"].(string)
	if !ok || orderID == "" {
		t.Fatalf("Step 2: No order ID in response")
	}
	t.Logf("Created order with ID: %s", orderID)

	// Step 3: Add 1 wireless mouse to the order
	t.Log("Step 3: Add wireless mouse to order")
	updateOrderBody := map[string]interface{}{
		"products": []map[string]interface{}{
			{"productId": "550e8400-e29b-41d4-a716-446655440001", "quantity": 1}, // Wireless Mouse
		},
	}
	resp = makeRequest("PATCH", "/orders/"+orderID, updateOrderBody)
	if resp.Code != http.StatusOK {
		t.Fatalf("Step 3 failed: Expected 200, got %d. Body: %s", resp.Code, resp.Body.String())
	}

	if err := json.Unmarshal(resp.Body.Bytes(), &order); err != nil {
		t.Fatalf("Step 3: Failed to parse order response: %v", err)
	}
	products, ok := order["products"].([]interface{})
	if !ok {
		t.Fatalf("Step 3: No products array in response")
	}
	if len(products) != 3 {
		t.Fatalf("Step 3: Expected 3 products, got %d", len(products))
	}
	t.Logf("Order now has %d products", len(products))

	// Step 4: Check loyalty points (should be 0 before order submission)
	t.Log("Step 4: Check loyalty points before submission")
	resp = makeRequest("GET", "/loyalty/"+userID+"/balance", nil)
	if resp.Code != http.StatusOK {
		t.Fatalf("Step 4 failed: Expected 200, got %d. Body: %s", resp.Code, resp.Body.String())
	}

	var pointsResp map[string]interface{}
	if err := json.Unmarshal(resp.Body.Bytes(), &pointsResp); err != nil {
		t.Fatalf("Step 4: Failed to parse points response: %v", err)
	}
	balance, ok := pointsResp["balance"].(float64)
	if !ok {
		t.Fatalf("Step 4: No balance in response")
	}
	if balance != 0 {
		t.Fatalf("Step 4: Expected 0 loyalty points, got %.0f", balance)
	}
	t.Log("Loyalty points correctly at 0 before submission")

	// Step 5: Submit the order
	t.Log("Step 5: Submit the order")
	submitBody := map[string]string{
		"action": "SUBMIT",
	}
	resp = makeRequest("POST", "/orders/"+orderID+"/submit", submitBody)
	if resp.Code != http.StatusOK {
		t.Fatalf("Step 5 failed: Expected 200, got %d. Body: %s", resp.Code, resp.Body.String())
	}

	if err := json.Unmarshal(resp.Body.Bytes(), &order); err != nil {
		t.Fatalf("Step 5: Failed to parse order response: %v", err)
	}
	status, ok := order["status"].(string)
	if !ok || status != "PROCESSING" {
		t.Fatalf("Step 5: Expected status PROCESSING, got %v", status)
	}
	t.Log("Order status changed to PROCESSING")

	// Step 6: Check the status of the order
	t.Log("Step 6: Verify order status")
	resp = makeRequest("GET", "/orders/"+orderID, nil)
	if resp.Code != http.StatusOK {
		t.Fatalf("Step 6 failed: Expected 200, got %d. Body: %s", resp.Code, resp.Body.String())
	}

	if err := json.Unmarshal(resp.Body.Bytes(), &order); err != nil {
		t.Fatalf("Step 6: Failed to parse order response: %v", err)
	}
	status, ok = order["status"].(string)
	if !ok || status != "PROCESSING" {
		t.Fatalf("Step 6: Expected status PROCESSING, got %v", status)
	}
	totalPrice, ok := order["totalPrice"].(float64)
	if !ok {
		t.Fatalf("Step 6: No totalPrice in response")
	}
	t.Logf("Order status: %s, Total price: $%.2f", status, totalPrice)

	// Step 7: Check the loyalty points after submission
	t.Log("Step 7: Check loyalty points after submission")
	resp = makeRequest("GET", "/loyalty/"+userID+"/balance", nil)
	if resp.Code != http.StatusOK {
		t.Fatalf("Step 7 failed: Expected 200, got %d. Body: %s", resp.Code, resp.Body.String())
	}

	if err := json.Unmarshal(resp.Body.Bytes(), &pointsResp); err != nil {
		t.Fatalf("Step 7: Failed to parse points response: %v", err)
	}
	balance, ok = pointsResp["balance"].(float64)
	if !ok {
		t.Fatalf("Step 7: No balance in response")
	}

	// Expected: Laptop ($1299.99) + Notebook ($19.99 × 3 = $59.97) + Mouse ($29.99) = $1389.95
	// Loyalty points: floor(1389.95 / 10) = 138
	expectedPoints := 138.0
	if balance != expectedPoints {
		t.Fatalf("Step 7: Expected %v loyalty points, got %.0f", expectedPoints, balance)
	}
	t.Logf("Loyalty points correctly awarded: %.0f points", balance)

	// Step 8: Create a second order (PENDING, not submitted)
	t.Log("Step 8: Create a second order")
	createOrder2Body := map[string]interface{}{
		"userId": userID,
		"products": []map[string]interface{}{
			{"productId": "550e8400-e29b-41d4-a716-446655440000", "quantity": 1}, // Laptop
			{"productId": "550e8400-e29b-41d4-a716-446655440003", "quantity": 3}, // Notebook
		},
	}
	resp = makeRequest("POST", "/orders", createOrder2Body)
	if resp.Code != http.StatusCreated {
		t.Fatalf("Step 8 failed: Expected 201, got %d. Body: %s", resp.Code, resp.Body.String())
	}

	var order2 map[string]interface{}
	if err := json.Unmarshal(resp.Body.Bytes(), &order2); err != nil {
		t.Fatalf("Step 8: Failed to parse order response: %v", err)
	}
	order2ID, ok := order2["id"].(string)
	if !ok || order2ID == "" {
		t.Fatalf("Step 8: No order ID in response")
	}
	t.Logf("Created second order with ID: %s", order2ID)

	// Verify first order (PROCESSING) is still PROCESSING
	t.Log("Cleanup verification: Check first order status")
	resp = makeRequest("GET", "/orders/"+orderID, nil)
	if resp.Code != http.StatusOK {
		t.Fatalf("Cleanup verification failed: Expected 200, got %d", resp.Code)
	}
	if err := json.Unmarshal(resp.Body.Bytes(), &order); err != nil {
		t.Fatalf("Cleanup verification: Failed to parse order response: %v", err)
	}
	status, _ = order["status"].(string)
	if status != "PROCESSING" {
		t.Fatalf("Cleanup verification: Expected first order to remain PROCESSING, got %s", status)
	}
	t.Log("First order (submitted) correctly remains PROCESSING")

	t.Log("✅ Integration test completed successfully!")
}

func TestOrderWorkflowPlaceholder(t *testing.T) {
	t.Skip("Integration tests not yet implemented - see specification")
}
