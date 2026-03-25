package integration

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"testing"
	"time"

	"github.com/Bitovi/example-go-server/internal/config"
	"github.com/Bitovi/example-go-server/internal/handlers"
	"github.com/Bitovi/example-go-server/internal/services"
)

// TestProductServiceIntegration tests the integration with the real Product Service
// This test requires the Product Service to be running (via docker-compose)
func TestProductServiceIntegration(t *testing.T) {
	// Check if Product Service is available
	productServiceURL := os.Getenv("PRODUCT_SERVICE_URL")
	if productServiceURL == "" {
		productServiceURL = "http://localhost:8200"
	}

	// Ping the Product Service
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(productServiceURL + "/products")
	if err != nil {
		t.Skipf("Product Service not available at %s: %v. Run 'docker-compose up product-service' first.", productServiceURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Skipf("Product Service returned status %d, expected 200", resp.StatusCode)
	}

	t.Logf("Product Service is available at %s", productServiceURL)

	// Initialize Product Service client
	productClient := services.NewProductServiceClient(productServiceURL, "")
	handlers.InitializeOrderService(productClient, nil)
	services.ResetOrderMockData()

	t.Run("CreateOrderWithValidProducts", func(t *testing.T) {
		// Get available products from Product Service
		resp, err := client.Get(productServiceURL + "/products")
		if err != nil {
			t.Fatalf("Failed to get products: %v", err)
		}
		defer resp.Body.Close()

		var productList struct {
			Data []struct {
				ID           int     `json:"id"`
				Name         string  `json:"name"`
				Price        float64 `json:"price"`
				Availability bool    `json:"availability"`
			} `json:"data"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&productList); err != nil {
			t.Fatalf("Failed to decode product list: %v", err)
		}

		if len(productList.Data) == 0 {
			t.Fatal("No products available in Product Service")
		}

		// Use the first available product
		firstProduct := productList.Data[0]
		t.Logf("Using product ID %d: %s (price: $%.2f)", firstProduct.ID, firstProduct.Name, firstProduct.Price)

		// Create order with this product
		// Note: Product Service uses numeric IDs, but Order Service uses UUID strings for productId
		orderData := map[string]interface{}{
			"userId": "550e8400-e29b-41d4-a716-446655440000",
			"products": []map[string]interface{}{
				{
					"productId": fmt.Sprintf("%d", firstProduct.ID),
					"quantity":  2,
				},
			},
		}

		orderJSON, _ := json.Marshal(orderData)
		orderResp, err := http.Post("http://localhost:8100/orders", "application/json", bytes.NewReader(orderJSON))
		if err != nil {
			t.Fatalf("Failed to create order: %v", err)
		}
		defer orderResp.Body.Close()

		if orderResp.StatusCode != http.StatusCreated {
			body, _ := io.ReadAll(orderResp.Body)
			t.Logf("Response body: %s", string(body))
			t.Fatalf("Expected status 201, got %d", orderResp.StatusCode)
		}

		var order map[string]interface{}
		if err := json.NewDecoder(orderResp.Body).Decode(&order); err != nil {
			t.Fatalf("Failed to decode order response: %v", err)
		}

		// Verify order total price is calculated correctly
		expectedTotal := firstProduct.Price * 2
		actualTotal := order["totalPrice"].(float64)
		if actualTotal != expectedTotal {
			t.Errorf("Expected total price %.2f, got %.2f", expectedTotal, actualTotal)
		}

		t.Logf("Order created successfully with ID: %s, Total: $%.2f", order["id"], actualTotal)
	})

	t.Run("CreateOrderWithInvalidProduct", func(t *testing.T) {
		// Try to create order with non-existent product
		orderData := map[string]interface{}{
			"userId": "550e8400-e29b-41d4-a716-446655440000",
			"products": []map[string]interface{}{
				{
					"productId": "999999", // Non-existent product
					"quantity":  1,
				},
			},
		}

		orderJSON, _ := json.Marshal(orderData)
		orderResp, err := http.Post("http://localhost:8100/orders", "application/json", bytes.NewReader(orderJSON))
		if err != nil {
			t.Fatalf("Failed to make request: %v", err)
		}
		defer orderResp.Body.Close()

		// Should return 400 Bad Request for invalid product
		if orderResp.StatusCode != http.StatusBadRequest {
			t.Errorf("Expected status 400, got %d", orderResp.StatusCode)
		}

		var errorResp map[string]interface{}
		if err := json.NewDecoder(orderResp.Body).Decode(&errorResp); err != nil {
			t.Fatalf("Failed to decode error response: %v", err)
		}

		if errorResp["code"] != "INVALID_PRODUCT" {
			t.Errorf("Expected error code INVALID_PRODUCT, got %v", errorResp["code"])
		}

		t.Logf("Invalid product correctly rejected: %v", errorResp["message"])
	})

	t.Run("ProductServiceUnavailable", func(t *testing.T) {
		// Initialize with a non-existent Product Service URL
		badClient := services.NewProductServiceClient("http://localhost:9999", "")
		handlers.InitializeOrderService(badClient, nil)

		orderData := map[string]interface{}{
			"userId": "550e8400-e29b-41d4-a716-446655440000",
			"products": []map[string]interface{}{
				{
					"productId": "1",
					"quantity":  1,
				},
			},
		}

		orderJSON, _ := json.Marshal(orderData)
		orderResp, err := http.Post("http://localhost:8100/orders", "application/json", bytes.NewReader(orderJSON))
		if err != nil {
			t.Fatalf("Failed to make request: %v", err)
		}
		defer orderResp.Body.Close()

		// Should return 503 Service Unavailable when Product Service is down
		if orderResp.StatusCode != http.StatusServiceUnavailable {
			body, _ := io.ReadAll(orderResp.Body)
			t.Logf("Response body: %s", string(body))
			t.Errorf("Expected status 503, got %d", orderResp.StatusCode)
		}

		var errorResp map[string]interface{}
		if err := json.NewDecoder(orderResp.Body).Decode(&errorResp); err != nil {
			t.Fatalf("Failed to decode error response: %v", err)
		}

		if errorResp["code"] != "PRODUCT_SERVICE_UNAVAILABLE" {
			t.Errorf("Expected error code PRODUCT_SERVICE_UNAVAILABLE, got %v", errorResp["code"])
		}

		t.Logf("Product Service unavailable correctly handled: %v", errorResp["message"])

		// Restore the good client
		goodClient := services.NewProductServiceClient(productServiceURL, "")
		handlers.InitializeOrderService(goodClient, nil)
	})
}

// TestCompleteOrderWorkflow tests the full order lifecycle with Product Service integration
func TestCompleteOrderWorkflow(t *testing.T) {
	// Check if services are available
	productServiceURL := os.Getenv("PRODUCT_SERVICE_URL")
	if productServiceURL == "" {
		productServiceURL = "http://localhost:8200"
	}

	cfg := config.LoadConfig()
	t.Logf("Product Service URL from config: %s", cfg.ProductServiceURL)

	// Skip if Product Service is not available
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(productServiceURL + "/products")
	if err != nil {
		t.Skipf("Product Service not available: %v", err)
	}
	defer resp.Body.Close()

	// Initialize
	productClient := services.NewProductServiceClient(productServiceURL, "")
	handlers.InitializeOrderService(productClient, nil)
	services.ResetOrderMockData()

	var orderID string

	t.Run("Step1_CreateOrder", func(t *testing.T) {
		orderData := map[string]interface{}{
			"userId": "550e8400-e29b-41d4-a716-446655440000",
			"products": []map[string]interface{}{
				{"productId": "1", "quantity": 2},
			},
		}

		orderJSON, _ := json.Marshal(orderData)
		orderResp, err := http.Post("http://localhost:8100/orders", "application/json", bytes.NewReader(orderJSON))
		if err != nil {
			t.Fatalf("Failed to create order: %v", err)
		}
		defer orderResp.Body.Close()

		if orderResp.StatusCode != http.StatusCreated {
			body, _ := io.ReadAll(orderResp.Body)
			t.Fatalf("Expected status 201, got %d. Body: %s", orderResp.StatusCode, string(body))
		}

		var order map[string]interface{}
		json.NewDecoder(orderResp.Body).Decode(&order)
		orderID = order["id"].(string)
		t.Logf("Created order: %s", orderID)
	})

	t.Run("Step2_ModifyOrder", func(t *testing.T) {
		// Add another product
		updateData := map[string]interface{}{
			"products": []map[string]interface{}{
				{"productId": "2", "quantity": 1},
			},
		}

		updateJSON, _ := json.Marshal(updateData)
		req, _ := http.NewRequest("PATCH", fmt.Sprintf("http://localhost:8100/orders/%s", orderID), bytes.NewReader(updateJSON))
		req.Header.Set("Content-Type", "application/json")

		updateResp, err := client.Do(req)
		if err != nil {
			t.Fatalf("Failed to update order: %v", err)
		}
		defer updateResp.Body.Close()

		if updateResp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(updateResp.Body)
			t.Fatalf("Expected status 200, got %d. Body: %s", updateResp.StatusCode, string(body))
		}

		t.Logf("Updated order: %s", orderID)
	})

	t.Run("Step3_SubmitOrder", func(t *testing.T) {
		submitData := map[string]interface{}{
			"action": "SUBMIT",
		}

		submitJSON, _ := json.Marshal(submitData)
		submitResp, err := http.Post(fmt.Sprintf("http://localhost:8100/orders/%s/submit", orderID), "application/json", bytes.NewReader(submitJSON))
		if err != nil {
			t.Fatalf("Failed to submit order: %v", err)
		}
		defer submitResp.Body.Close()

		if submitResp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(submitResp.Body)
			t.Fatalf("Expected status 200, got %d. Body: %s", submitResp.StatusCode, string(body))
		}

		var order map[string]interface{}
		json.NewDecoder(submitResp.Body).Decode(&order)

		if order["status"] != "PROCESSING" {
			t.Errorf("Expected status PROCESSING, got %v", order["status"])
		}

		t.Logf("Submitted order: %s with status %v", orderID, order["status"])
	})
}
