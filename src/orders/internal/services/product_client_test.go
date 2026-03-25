package services

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestGetProduct_Success(t *testing.T) {
	// Create a test server that returns a successful product response
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify the request
		if r.Method != http.MethodGet {
			t.Errorf("Expected GET request, got %s", r.Method)
		}
		if r.URL.Path != "/products/123" {
			t.Errorf("Expected path /products/123, got %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer test-token" {
			t.Errorf("Expected Authorization header with Bearer test-token")
		}

		// Return successful response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		response := ProductResponse{
			ID:           123,
			Name:         "Test Product",
			Description:  "A test product",
			Price:        99.99,
			Availability: true,
		}
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	// Create client with test server URL
	client := NewProductServiceClient(server.URL, "test-token")

	// Call GetProduct
	product, err := client.GetProduct("123", "")

	// Verify results
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if product.ID != 123 {
		t.Errorf("Expected ID 123, got %d", product.ID)
	}
	if product.Name != "Test Product" {
		t.Errorf("Expected name 'Test Product', got %s", product.Name)
	}
	if product.Price != 99.99 {
		t.Errorf("Expected price 99.99, got %f", product.Price)
	}
	if !product.Availability {
		t.Errorf("Expected availability true, got false")
	}
}

func TestGetProduct_NotFound(t *testing.T) {
	// Create a test server that returns 404
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Product not found",
		})
	}))
	defer server.Close()

	client := NewProductServiceClient(server.URL, "test-token")

	// Call GetProduct
	product, err := client.GetProduct("999", "")

	// Verify results
	if !errors.Is(err, ErrProductNotFound) {
		t.Errorf("Expected wrapped ErrProductNotFound, got %v", err)
	}
	if product != nil {
		t.Errorf("Expected nil product, got %+v", product)
	}
}

func TestGetProduct_Unauthorized(t *testing.T) {
	// Create a test server that returns 401
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Unauthorized",
		})
	}))
	defer server.Close()

	client := NewProductServiceClient(server.URL, "invalid-token")

	// Call GetProduct
	product, err := client.GetProduct("123", "")

	// Verify results
	if !errors.Is(err, ErrProductServiceUnavailable) {
		t.Errorf("Expected wrapped ErrProductServiceUnavailable, got %v", err)
	}
	if product != nil {
		t.Errorf("Expected nil product, got %+v", product)
	}
}

func TestGetProduct_ServerError(t *testing.T) {
	// Create a test server that returns 500
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Internal server error",
		})
	}))
	defer server.Close()

	client := NewProductServiceClient(server.URL, "test-token")

	// Call GetProduct
	product, err := client.GetProduct("123", "")

	// Verify results
	if !errors.Is(err, ErrProductServiceUnavailable) {
		t.Errorf("Expected wrapped ErrProductServiceUnavailable, got %v", err)
	}
	if product != nil {
		t.Errorf("Expected nil product, got %+v", product)
	}
}

func TestGetProduct_ServiceUnavailable(t *testing.T) {
	// Create a test server that returns 503
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Service unavailable",
		})
	}))
	defer server.Close()

	client := NewProductServiceClient(server.URL, "test-token")

	// Call GetProduct
	product, err := client.GetProduct("123", "")

	// Verify results
	if !errors.Is(err, ErrProductServiceUnavailable) {
		t.Errorf("Expected wrapped ErrProductServiceUnavailable, got %v", err)
	}
	if product != nil {
		t.Errorf("Expected nil product, got %+v", product)
	}
}

func TestValidateProduct_Success(t *testing.T) {
	// Create a test server that returns a successful product response
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		response := ProductResponse{
			ID:           456,
			Name:         "Validated Product",
			Description:  "A validated product",
			Price:        49.99,
			Availability: true,
		}
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	client := NewProductServiceClient(server.URL, "test-token")

	// Call ValidateProduct
	price, name, err := client.ValidateProduct("456", "")

	// Verify results
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if price != 49.99 {
		t.Errorf("Expected price 49.99, got %f", price)
	}
	if name != "Validated Product" {
		t.Errorf("Expected name 'Validated Product', got %s", name)
	}
}

func TestValidateProduct_NotFound(t *testing.T) {
	// Create a test server that returns 404
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	client := NewProductServiceClient(server.URL, "test-token")

	// Call ValidateProduct
	price, name, err := client.ValidateProduct("999", "")

	// Verify results
	if !errors.Is(err, ErrProductNotFound) {
		t.Errorf("Expected wrapped ErrProductNotFound, got %v", err)
	}
	if price != 0 {
		t.Errorf("Expected price 0, got %f", price)
	}
	if name != "" {
		t.Errorf("Expected empty name, got %s", name)
	}
}

func TestValidateProduct_Unavailable(t *testing.T) {
	// Create a test server that returns an unavailable product
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		response := ProductResponse{
			ID:           789,
			Name:         "Unavailable Product",
			Description:  "An unavailable product",
			Price:        29.99,
			Availability: false,
		}
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	client := NewProductServiceClient(server.URL, "test-token")

	// Call ValidateProduct
	price, name, err := client.ValidateProduct("789", "")

	// Verify results
	if err == nil {
		t.Fatal("Expected error for unavailable product, got nil")
	}
	if err.Error() != "product '789' (Unavailable Product) is not available" {
		t.Errorf("Expected unavailable error message, got %v", err)
	}
	if price != 0 {
		t.Errorf("Expected price 0, got %f", price)
	}
	if name != "" {
		t.Errorf("Expected empty name, got %s", name)
	}
}

func TestValidateProduct_ServerError(t *testing.T) {
	// Create a test server that returns 500
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	client := NewProductServiceClient(server.URL, "test-token")

	// Call ValidateProduct
	price, name, err := client.ValidateProduct("123", "")

	// Verify results
	if !errors.Is(err, ErrProductServiceUnavailable) {
		t.Errorf("Expected wrapped ErrProductServiceUnavailable, got %v", err)
	}
	if price != 0 {
		t.Errorf("Expected price 0, got %f", price)
	}
	if name != "" {
		t.Errorf("Expected empty name, got %s", name)
	}
}
