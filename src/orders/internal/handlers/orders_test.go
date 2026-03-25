package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/Bitovi/example-go-server/internal/models"
	"github.com/Bitovi/example-go-server/internal/services"
)

// MockProductServiceClient is a test mock for ProductServiceClient
type MockProductServiceClient struct{}

func (m *MockProductServiceClient) GetProduct(productID string, authToken string) (*services.ProductResponse, error) {
	// Return mock data for known product IDs (supports both simple names and UUIDs)
	mockProducts := map[string]*services.ProductResponse{
		"product-1":                               {ID: 1, Name: "Product 1", Description: "Test product 1", Price: 10.00, Availability: true},
		"product-2":                               {ID: 2, Name: "Product 2", Description: "Test product 2", Price: 20.00, Availability: true},
		"product-3":                               {ID: 3, Name: "Product 3", Description: "Test product 3", Price: 30.00, Availability: true},
		"550e8400-e29b-41d4-a716-446655440000":   {ID: 100, Name: "UUID Product 1", Description: "Test UUID product 1", Price: 10.00, Availability: true},
		"550e8400-e29b-41d4-a716-446655440001":   {ID: 101, Name: "UUID Product 2", Description: "Test UUID product 2", Price: 10.00, Availability: true},
		"550e8400-e29b-41d4-a716-446655440003":   {ID: 103, Name: "UUID Product 3", Description: "Test UUID product 3", Price: 15.00, Availability: true},
		"999e9999-e99b-99d9-a999-999999999999":   {ID: 999, Name: "Random UUID Product", Description: "Any valid UUID product", Price: 10.00, Availability: true},
	}
	if product, ok := mockProducts[productID]; ok {
		return product, nil
	}
	return nil, services.ErrProductNotFound
}

func (m *MockProductServiceClient) ValidateProduct(productID string, authToken string) (float64, string, error) {
	product, err := m.GetProduct(productID, authToken)
	if err != nil {
		return 0, "", err
	}
	if !product.Availability {
		return 0, "", services.ErrProductNotFound
	}
	return product.Price, product.Name, nil
}

func TestMain(m *testing.M) {
	// Initialize order service with mock product client
	mockClient := &MockProductServiceClient{}
	InitializeOrderService(mockClient, nil)

	// Reset mock data before running tests
	services.ResetOrderMockData()

	// Run tests
	code := m.Run()

	os.Exit(code)
}

// resetMockData should be called at the start of each test that modifies data
func resetMockData() {
	// Re-initialize to ensure clean state
	mockClient := &MockProductServiceClient{}
	InitializeOrderService(mockClient, nil)
	services.ResetOrderMockData()
}

func TestListOrders(t *testing.T) {
	resetMockData()

	tests := []struct {
		name           string
		method         string
		expectedStatus int
		checkResponse  func(*testing.T, *httptest.ResponseRecorder)
	}{
		{
			name:           "GET request returns list of orders",
			method:         http.MethodGet,
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response models.OrderListResponse
				if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
					t.Fatalf("Failed to decode response: %v", err)
				}
				if response.Total < 3 {
					t.Errorf("Expected at least 3 orders, got %d", response.Total)
				}
				if len(response.Orders) < 3 {
					t.Errorf("Expected at least 3 orders, got %d", len(response.Orders))
				}
				// Check first order structure
				if len(response.Orders) > 0 {
					order := response.Orders[0]
					if order.ID == "" {
						t.Error("Order ID should not be empty")
					}
					if len(order.Products) == 0 {
						t.Error("Order should have products")
					}
					if order.TotalPrice <= 0 {
						t.Error("Order total price should be positive")
					}
				}
			},
		},
		{
			name:           "POST request returns 405",
			method:         http.MethodPost,
			expectedStatus: http.StatusMethodNotAllowed,
			checkResponse:  nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, "/orders", nil)
			w := httptest.NewRecorder()

			ListOrders(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.checkResponse != nil {
				tt.checkResponse(t, w)
			}
		})
	}
}

func TestCreateOrder(t *testing.T) {
	resetMockData()

	tests := []struct {
		name           string
		requestBody    interface{}
		expectedStatus int
		checkResponse  func(*testing.T, *httptest.ResponseRecorder)
	}{
		{
			name: "Valid order creation",
			requestBody: map[string]interface{}{
				"userId": "750e8400-e29b-41d4-a716-446655440001", // johndoe
				"products": []map[string]interface{}{
					{"productId": "550e8400-e29b-41d4-a716-446655440000", "quantity": 2},
				},
			},
			expectedStatus: http.StatusCreated,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var order models.Order
				if err := json.NewDecoder(w.Body).Decode(&order); err != nil {
					t.Fatalf("Failed to decode response: %v", err)
				}
				if order.ID == "" {
					t.Error("Order ID should not be empty")
				}
				if order.Status != models.OrderStatusPending {
					t.Errorf("New order should have PENDING status, got %s", order.Status)
				}
				// Verify placeholder price calculation: 2 items * $10 = $20
				expectedPrice := 20.0
				if order.TotalPrice < expectedPrice-0.01 || order.TotalPrice > expectedPrice+0.01 {
					t.Errorf("Expected total price %.2f, got %.2f", expectedPrice, order.TotalPrice)
				}
			},
		},
		{
			name: "Valid order creation with userId",
			requestBody: map[string]interface{}{
				"userId": "750e8400-e29b-41d4-a716-446655440002", // bobsmith (no existing orders)
				"products": []map[string]interface{}{
					{"productId": "550e8400-e29b-41d4-a716-446655440001", "quantity": 1},
				},
			},
			expectedStatus: http.StatusCreated,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var order models.Order
				if err := json.NewDecoder(w.Body).Decode(&order); err != nil {
					t.Fatalf("Failed to decode response: %v", err)
				}
				if order.ID == "" {
					t.Error("Order ID should not be empty")
				}
				// Verify placeholder price calculation: 1 item * $10 = $10
				expectedPrice := 10.0
				if order.TotalPrice < expectedPrice-0.01 || order.TotalPrice > expectedPrice+0.01 {
					t.Errorf("Expected total price %.2f, got %.2f", expectedPrice, order.TotalPrice)
				}
			},
		},
		{
			name: "Missing userId returns 400",
			requestBody: map[string]interface{}{
				"products": []map[string]interface{}{
					{"productId": "550e8400-e29b-41d4-a716-446655440000", "quantity": 1},
				},
			},
			expectedStatus: http.StatusBadRequest,
			checkResponse:  nil,
		},
		{
			name: "Invalid userId format returns 400",
			requestBody: map[string]interface{}{
				"userId": "invalid-uuid",
				"products": []map[string]interface{}{
					{"productId": "550e8400-e29b-41d4-a716-446655440000", "quantity": 1},
				},
			},
			expectedStatus: http.StatusBadRequest,
			checkResponse:  nil,
		},
		{
			name: "Any valid UUID productId is accepted (no product service validation)",
			requestBody: map[string]interface{}{
				"userId": "750e8400-e29b-41d4-a716-446655440001",
				"products": []map[string]interface{}{
					{"productId": "999e9999-e99b-99d9-a999-999999999999", "quantity": 1},
				},
			},
			expectedStatus: http.StatusCreated,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var order models.Order
				if err := json.NewDecoder(w.Body).Decode(&order); err != nil {
					t.Fatalf("Failed to decode response: %v", err)
				}
				// Should succeed with placeholder pricing
				if order.TotalPrice != 10.0 {
					t.Errorf("Expected total price 10.00, got %.2f", order.TotalPrice)
				}
			},
		},
		{
			name: "Empty products array returns 400",
			requestBody: map[string]interface{}{
				"userId":   "750e8400-e29b-41d4-a716-446655440001",
				"products": []interface{}{},
			},
			expectedStatus: http.StatusBadRequest,
			checkResponse:  nil,
		},
		{
			name:           "Invalid request body returns 400",
			requestBody:    "invalid json",
			expectedStatus: http.StatusBadRequest,
			checkResponse:  nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var body []byte
			var err error

			if str, ok := tt.requestBody.(string); ok {
				body = []byte(str)
			} else {
				body, err = json.Marshal(tt.requestBody)
				if err != nil {
					t.Fatalf("Failed to marshal request body: %v", err)
				}
			}

			req := httptest.NewRequest(http.MethodPost, "/orders", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			CreateOrder(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.checkResponse != nil {
				tt.checkResponse(t, w)
			}
		})
	}
}

func TestGetOrderByID(t *testing.T) {
	resetMockData()

	tests := []struct {
		name           string
		orderID        string
		expectedStatus int
		checkResponse  func(*testing.T, *httptest.ResponseRecorder)
	}{
		{
			name:           "Valid order ID returns order",
			orderID:        "650e8400-e29b-41d4-a716-446655440000",
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var order models.Order
				if err := json.NewDecoder(w.Body).Decode(&order); err != nil {
					t.Fatalf("Failed to decode response: %v", err)
				}
				if order.ID != "650e8400-e29b-41d4-a716-446655440000" {
					t.Errorf("Expected order ID 650e8400-e29b-41d4-a716-446655440000, got %s", order.ID)
				}
			},
		},
		{
			name:           "Non-existent order ID returns 404",
			orderID:        "650e8400-e29b-41d4-a716-446655440099",
			expectedStatus: http.StatusNotFound,
			checkResponse:  nil,
		},
		{
			name:           "Invalid UUID format returns 400",
			orderID:        "invalid-uuid",
			expectedStatus: http.StatusBadRequest,
			checkResponse:  nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/orders/"+tt.orderID, nil)
			w := httptest.NewRecorder()

			GetOrderByID(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.checkResponse != nil {
				tt.checkResponse(t, w)
			}
		})
	}
}

func TestUpdateOrder(t *testing.T) {
	resetMockData()

	tests := []struct {
		name           string
		orderID        string
		requestBody    interface{}
		expectedStatus int
		checkResponse  func(*testing.T, *httptest.ResponseRecorder)
	}{
		{
			name:    "Add to existing product quantity",
			orderID: "650e8400-e29b-41d4-a716-446655440000",
			requestBody: map[string]interface{}{
				"products": []map[string]interface{}{
					// Order has Laptop (1) and Mouse (2)
					// Add 1 more mouse (2 + 1 = 3)
					{"productId": "550e8400-e29b-41d4-a716-446655440001", "quantity": 1},
				},
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var order models.Order
				if err := json.NewDecoder(w.Body).Decode(&order); err != nil {
					t.Fatalf("Failed to decode response: %v", err)
				}
				// Should still have 2 products (Laptop and Mouse)
				if len(order.Products) != 2 {
					t.Errorf("Expected 2 products, got %d", len(order.Products))
				}
				// Find the mouse product and verify quantity was increased
				foundMouse := false
				for _, p := range order.Products {
					if p.ProductID == "550e8400-e29b-41d4-a716-446655440001" {
						foundMouse = true
						if p.Quantity != 3 {
							t.Errorf("Expected mouse quantity to be 3 (2+1), got %d", p.Quantity)
						}
					}
				}
				if !foundMouse {
					t.Error("Mouse product not found in order")
				}
			},
		},
		{
			name:    "Add new product to existing order",
			orderID: "650e8400-e29b-41d4-a716-446655440000",
			requestBody: map[string]interface{}{
				"products": []map[string]interface{}{
					// Order already has Laptop (1) and Mouse (3 from previous test)
					// Adding 2 Notebooks should result in 3 products
					{"productId": "550e8400-e29b-41d4-a716-446655440003", "quantity": 2},
				},
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var order models.Order
				if err := json.NewDecoder(w.Body).Decode(&order); err != nil {
					t.Fatalf("Failed to decode response: %v", err)
				}
				// Should have 3 products now (Laptop, Mouse, Notebook)
				if len(order.Products) != 3 {
					t.Errorf("Expected 3 products after adding notebook, got %d", len(order.Products))
				}
				// Find the notebook and verify it was added
				foundNotebook := false
				for _, p := range order.Products {
					if p.ProductID == "550e8400-e29b-41d4-a716-446655440003" {
						foundNotebook = true
						if p.Quantity != 2 {
							t.Errorf("Expected notebook quantity to be 2, got %d", p.Quantity)
						}
					}
				}
				if !foundNotebook {
					t.Error("Notebook product not found in order")
				}
			},
		},
		{
			name:    "Remove product quantity with negative value",
			orderID: "650e8400-e29b-41d4-a716-446655440000",
			requestBody: map[string]interface{}{
				"products": []map[string]interface{}{
					// Remove all 2 notebooks (2 - 2 = 0, should be deleted)
					{"productId": "550e8400-e29b-41d4-a716-446655440003", "quantity": -2},
				},
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var order models.Order
				if err := json.NewDecoder(w.Body).Decode(&order); err != nil {
					t.Fatalf("Failed to decode response: %v", err)
				}
				// Should have 2 products now (Laptop and Mouse remain)
				if len(order.Products) != 2 {
					t.Errorf("Expected 2 products after removing notebook, got %d", len(order.Products))
				}
				// Verify notebook was removed
				for _, p := range order.Products {
					if p.ProductID == "550e8400-e29b-41d4-a716-446655440003" {
						t.Error("Notebook should have been removed but is still in order")
					}
				}
			},
		},
		{
			name:    "Quantity of 0 does nothing",
			orderID: "650e8400-e29b-41d4-a716-446655440000",
			requestBody: map[string]interface{}{
				"products": []map[string]interface{}{
					{"productId": "550e8400-e29b-41d4-a716-446655440001", "quantity": 0},
				},
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var order models.Order
				if err := json.NewDecoder(w.Body).Decode(&order); err != nil {
					t.Fatalf("Failed to decode response: %v", err)
				}
				// Should still have 2 products (no change)
				if len(order.Products) != 2 {
					t.Errorf("Expected 2 products (no change), got %d", len(order.Products))
				}
				// Mouse should still have quantity of 3
				for _, p := range order.Products {
					if p.ProductID == "550e8400-e29b-41d4-a716-446655440001" {
						if p.Quantity != 3 {
							t.Errorf("Expected mouse quantity to remain 3, got %d", p.Quantity)
						}
					}
				}
			},
		},
		{
			name:    "Empty products array returns 400",
			orderID: "650e8400-e29b-41d4-a716-446655440000",
			requestBody: map[string]interface{}{
				"products": []interface{}{},
			},
			expectedStatus: http.StatusBadRequest,
			checkResponse:  nil,
		},
		{
			name:    "Invalid product ID returns 400",
			orderID: "650e8400-e29b-41d4-a716-446655440000",
			requestBody: map[string]interface{}{
				"products": []map[string]interface{}{
					{"productId": "invalid-uuid", "quantity": 1},
				},
			},
			expectedStatus: http.StatusBadRequest,
			checkResponse:  nil,
		},
		{
			name:    "Non-existent product ID is accepted (no product service validation)",
			orderID: "650e8400-e29b-41d4-a716-446655440000",
			requestBody: map[string]interface{}{
				"products": []map[string]interface{}{
					{"productId": "999e9999-e99b-99d9-a999-999999999999", "quantity": 1},
				},
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var order models.Order
				if err := json.NewDecoder(w.Body).Decode(&order); err != nil {
					t.Fatalf("Failed to decode response: %v", err)
				}
				// Should succeed with placeholder pricing
				if len(order.Products) == 0 {
					t.Error("Order should have products")
				}
			},
		},
		{
			name:           "Non-existent order returns 404",
			orderID:        "650e8400-e29b-41d4-a716-446655440099",
			requestBody:    map[string]interface{}{"products": []map[string]interface{}{{"productId": "550e8400-e29b-41d4-a716-446655440001", "quantity": 1}}},
			expectedStatus: http.StatusNotFound,
			checkResponse:  nil,
		},
		{
			name:    "Cannot update non-pending order",
			orderID: "650e8400-e29b-41d4-a716-446655440001", // This order has SHIPPED status
			requestBody: map[string]interface{}{
				"products": []map[string]interface{}{
					{"productId": "550e8400-e29b-41d4-a716-446655440001", "quantity": 1},
				},
			},
			expectedStatus: http.StatusBadRequest,
			checkResponse:  nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, err := json.Marshal(tt.requestBody)
			if err != nil {
				t.Fatalf("Failed to marshal request body: %v", err)
			}

			req := httptest.NewRequest(http.MethodPatch, "/orders/"+tt.orderID, bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			UpdateOrder(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d. Response: %s", tt.expectedStatus, w.Code, w.Body.String())
			}

			if tt.checkResponse != nil {
				tt.checkResponse(t, w)
			}
		})
	}
}

func TestCancelOrSubmitOrder(t *testing.T) {
	resetMockData()

	tests := []struct {
		name           string
		orderID        string
		requestBody    interface{}
		expectedStatus int
		checkResponse  func(*testing.T, *httptest.ResponseRecorder)
	}{
		{
			name:    "Cancel order",
			orderID: "650e8400-e29b-41d4-a716-446655440001",
			requestBody: map[string]interface{}{
				"action": "CANCEL",
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var order models.Order
				if err := json.NewDecoder(w.Body).Decode(&order); err != nil {
					t.Fatalf("Failed to decode response: %v", err)
				}
				if order.Status != models.OrderStatusCanceled {
					t.Errorf("Expected status CANCELED, got %s", order.Status)
				}
			},
		},
		{
			name:    "Invalid action returns 400",
			orderID: "650e8400-e29b-41d4-a716-446655440000",
			requestBody: map[string]interface{}{
				"action": "INVALID_ACTION",
			},
			expectedStatus: http.StatusBadRequest,
			checkResponse:  nil,
		},
		{
			name:           "Non-existent order returns 404",
			orderID:        "650e8400-e29b-41d4-a716-446655440099",
			requestBody:    map[string]interface{}{"action": "CANCEL"},
			expectedStatus: http.StatusNotFound,
			checkResponse:  nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, err := json.Marshal(tt.requestBody)
			if err != nil {
				t.Fatalf("Failed to marshal request body: %v", err)
			}

			req := httptest.NewRequest(http.MethodPost, "/orders/"+tt.orderID+"/submit", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			CancelOrSubmitOrder(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.checkResponse != nil {
				tt.checkResponse(t, w)
			}
		})
	}
}
