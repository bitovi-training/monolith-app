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

// DEPRECATED: This file has been archived and moved from an active test location.
// The Orders service has been refactored to TypeScript/NestJS.
//
// For active e2e tests, see: order.e2e.ts

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
	})
}
