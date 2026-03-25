package main

import (
	"log"
	"net/http"

	"github.com/Bitovi/example-go-server/internal/config"
	"github.com/Bitovi/example-go-server/internal/handlers"
	"github.com/Bitovi/example-go-server/internal/middleware"
	"github.com/Bitovi/example-go-server/internal/services"
	authmiddleware "github.com/bitovi-corp/auth-middleware-go/middleware"
)

func main() {
	// Initialize configuration
	cfg := config.LoadConfig()
	log.Printf("Configuration loaded:")
	log.Printf("  - Product Service URL: %s", cfg.ProductServiceURL)
	log.Printf("  - Loyalty Service URL: %s", cfg.LoyaltyServiceURL)

	// Initialize Product Service client
	productClient := services.NewProductServiceClient(cfg.ProductServiceURL, "")
	log.Printf("Product Service client initialized")

	// Initialize Loyalty Service client
	loyaltyClient := services.NewLoyaltyServiceClient(cfg.LoyaltyServiceURL)
	log.Printf("Loyalty Service client initialized")

	// Initialize order service with product client
	handlers.InitializeOrderService(productClient, loyaltyClient)

	// Register routes according to api/openapi.yaml
	// Health check endpoint - no auth required
	http.HandleFunc("/health", middleware.LoggingMiddleware(handlers.HealthCheck))

	// Order endpoints - auth required
	http.HandleFunc("/orders/", middleware.LoggingMiddleware(authmiddleware.RequireRoles("admin")(handleOrdersWithID)))
	http.HandleFunc("/orders", middleware.LoggingMiddleware(authmiddleware.RequireRoles("admin")(handleOrders)))

	// Start server
	port := cfg.Port
	log.Printf("Starting Example Server API v1.0.0 on port %s", port)
	log.Printf("Endpoints available:")
	log.Printf("  - GET http://localhost%s/health (no auth)", port)
	log.Printf("  - GET http://localhost%s/orders (auth required)", port)
	log.Printf("  - POST http://localhost%s/orders (auth required)", port)
	log.Printf("  - GET http://localhost%s/orders/{orderId} (auth required)", port)
	log.Printf("  - PATCH http://localhost%s/orders/{orderId} (auth required)", port)
	log.Printf("  - POST http://localhost%s/orders/{orderId}/submit (auth required)", port)
	log.Printf("")
	log.Printf("Authentication: Include 'Authorization: Bearer {token}' header")
	log.Printf("Global middlewares: Logging enabled for all requests")

	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

// handleOrders routes to the appropriate handler based on method
func handleOrders(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		handlers.ListOrders(w, r)
	case http.MethodPost:
		handlers.CreateOrder(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleOrdersWithID routes to the appropriate handler based on method for /orders/{orderId}
func handleOrdersWithID(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	// Check if it's the submit endpoint: /orders/{orderId}/submit
	if len(path) > 7 && path[len(path)-7:] == "/submit" {
		if r.Method == http.MethodPost {
			handlers.CancelOrSubmitOrder(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// Regular /orders/{orderId} endpoints
	switch r.Method {
	case http.MethodGet:
		handlers.GetOrderByID(w, r)
	case http.MethodPatch:
		handlers.UpdateOrder(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
