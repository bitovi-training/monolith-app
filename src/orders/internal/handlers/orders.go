package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/Bitovi/example-go-server/internal/models"
	"github.com/Bitovi/example-go-server/internal/services"
	"github.com/google/uuid"
)

var (
	orderService *services.OrderService
)

// InitializeOrderService sets up the order service with dependencies
func InitializeOrderService(productClient services.ProductClient, loyaltyClient services.LoyaltyClient) {
	orderService = services.NewOrderService(productClient, loyaltyClient)
}

// writeErrorResponse writes a standardized error response
func writeErrorResponse(w http.ResponseWriter, statusCode int, code, message, details string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	errorResp := models.ErrorResponse{
		Code:    code,
		Message: message,
		Details: details,
	}

	if err := json.NewEncoder(w).Encode(errorResp); err != nil {
		log.Printf("Error encoding error response: %v", err)
	}
}

// isValidUUID performs UUID format validation using google/uuid
func isValidUUID(uuidStr string) bool {
	_, err := uuid.Parse(uuidStr)
	return err == nil
}

// ListOrders implements GET /orders endpoint as defined in api/openapi.yaml
func ListOrders(w http.ResponseWriter, r *http.Request) {
	// Only allow GET method
	if r.Method != http.MethodGet {
		writeErrorResponse(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	// Get orders from service
	orders, total := orderService.ListOrders()

	// Prepare response
	response := models.OrderListResponse{
		Orders: orders,
		Total:  total,
	}

	// Send response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding orders list response: %v", err)
	}
}

// CreateOrder implements POST /orders endpoint as defined in api/openapi.yaml
func CreateOrder(w http.ResponseWriter, r *http.Request) {
	// Only allow POST method
	if r.Method != http.MethodPost {
		writeErrorResponse(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	// Parse request body
	var requestBody struct {
		UserID   string                `json:"userId"`
		Products []models.OrderProduct `json:"products"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
		writeErrorResponse(w, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Invalid request body", err.Error())
		return
	}

	// Validate userId is required
	if requestBody.UserID == "" {
		writeErrorResponse(w, http.StatusBadRequest, "MISSING_USER_ID", "User ID is required", "")
		return
	}

	// Validate userId format
	if _, err := uuid.Parse(requestBody.UserID); err != nil {
		writeErrorResponse(w, http.StatusBadRequest, "INVALID_USER_ID", "Invalid user ID format", "User ID must be a valid UUID")
		return
	}

	// Validate products
	if len(requestBody.Products) == 0 {
		writeErrorResponse(w, http.StatusBadRequest, "EMPTY_PRODUCTS", "Order must contain at least one product", "")
		return
	}

	// Extract auth token from request
	authToken := r.Header.Get("Authorization")

	// Create order
	order, err := orderService.CreateOrder(requestBody.UserID, requestBody.Products, authToken)
	if err != nil {
		log.Printf("Error creating order: %v", err)
		// Handle specific errors from Product Service
		if errors.Is(err, services.ErrProductServiceUnavailable) {
			writeErrorResponse(w, http.StatusServiceUnavailable, "PRODUCT_SERVICE_UNAVAILABLE", "Product validation service is currently unavailable", err.Error())
			return
		}
		if errors.Is(err, services.ErrProductNotFound) {
			writeErrorResponse(w, http.StatusBadRequest, "INVALID_PRODUCT", "One or more products are invalid", err.Error())
			return
		}
		writeErrorResponse(w, http.StatusInternalServerError, "ORDER_CREATION_FAILED", "Failed to create order", err.Error())
		return
	}

	// Send response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(order); err != nil {
		log.Printf("Error encoding order response: %v", err)
	}
}

// GetOrderByID implements GET /orders/{orderId} endpoint as defined in api/openapi.yaml
func GetOrderByID(w http.ResponseWriter, r *http.Request) {
	// Only allow GET method
	if r.Method != http.MethodGet {
		writeErrorResponse(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	// Extract order ID from URL path
	path := strings.TrimPrefix(r.URL.Path, "/orders/")
	orderID := strings.Split(path, "/")[0]

	if orderID == "" {
		writeErrorResponse(w, http.StatusBadRequest, "INVALID_ORDER_ID", "Order ID is required", "")
		return
	}

	// UUID format validation using google/uuid
	if _, err := uuid.Parse(orderID); err != nil {
		writeErrorResponse(w, http.StatusBadRequest, "INVALID_ORDER_ID", "Invalid order ID format", "Order ID must be a valid UUID")
		return
	}

	// Get order from service
	order, err := orderService.GetOrderByID(orderID)
	if err != nil {
		if errors.Is(err, services.ErrOrderNotFound) {
			writeErrorResponse(w, http.StatusNotFound, "ORDER_NOT_FOUND", "The requested order could not be found", "")
			return
		}
		log.Printf("Error retrieving order: %v", err)
		writeErrorResponse(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", "")
		return
	}

	// Send response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(order); err != nil {
		log.Printf("Error encoding order response: %v", err)
	}
}

// UpdateOrder implements PATCH /orders/{orderId} endpoint as defined in api/openapi.yaml
func UpdateOrder(w http.ResponseWriter, r *http.Request) {
	// Only allow PATCH method
	if r.Method != http.MethodPatch {
		writeErrorResponse(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	// Extract order ID from URL path
	path := strings.TrimPrefix(r.URL.Path, "/orders/")
	orderID := strings.Split(path, "/")[0]

	if orderID == "" {
		writeErrorResponse(w, http.StatusBadRequest, "INVALID_ORDER_ID", "Order ID is required", "")
		return
	}

	// UUID format validation using google/uuid
	if _, err := uuid.Parse(orderID); err != nil {
		writeErrorResponse(w, http.StatusBadRequest, "INVALID_ORDER_ID", "Invalid order ID format", "")
		return
	}

	// Parse request body
	var requestBody struct {
		Products []models.OrderProduct `json:"products"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
		writeErrorResponse(w, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Invalid request body", err.Error())
		return
	}

	// Validate products
	if len(requestBody.Products) == 0 {
		writeErrorResponse(w, http.StatusBadRequest, "EMPTY_PRODUCTS", "Order must contain at least one product", "")
		return
	}

	// Validate each product has required fields
	for i, product := range requestBody.Products {
		if product.ProductID == "" {
			writeErrorResponse(w, http.StatusBadRequest, "INVALID_PRODUCT", "Product ID is required", fmt.Sprintf("Product at index %d is missing productId", i))
			return
		}
		if _, err := uuid.Parse(product.ProductID); err != nil {
			writeErrorResponse(w, http.StatusBadRequest, "INVALID_PRODUCT_ID", "Invalid product ID format", fmt.Sprintf("Product at index %d has invalid UUID", i))
			return
		}
		// Note: quantity can be positive (add), negative (remove), or 0 (no-op)
	}

	// Extract auth token from request
	authToken := r.Header.Get("Authorization")

	// Update order products
	order, err := orderService.UpdateOrderProducts(orderID, requestBody.Products, authToken)
	if err != nil {
		if errors.Is(err, services.ErrOrderNotFound) {
			writeErrorResponse(w, http.StatusNotFound, "ORDER_NOT_FOUND", "The requested order could not be found", "")
			return
		}
		// Handle specific errors from Product Service
		if errors.Is(err, services.ErrProductServiceUnavailable) {
			writeErrorResponse(w, http.StatusServiceUnavailable, "PRODUCT_SERVICE_UNAVAILABLE", "Product validation service is currently unavailable", err.Error())
			return
		}
		if errors.Is(err, services.ErrProductNotFound) {
			writeErrorResponse(w, http.StatusBadRequest, "INVALID_PRODUCT", "One or more products are invalid", err.Error())
			return
		}
		log.Printf("Error updating order: %v", err)
		writeErrorResponse(w, http.StatusBadRequest, "UPDATE_FAILED", err.Error(), "")
		return
	}

	// Send response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(order); err != nil {
		log.Printf("Error encoding order response: %v", err)
	}
}

// CancelOrSubmitOrder implements POST /orders/{orderId}/submit endpoint as defined in api/openapi.yaml
func CancelOrSubmitOrder(w http.ResponseWriter, r *http.Request) {
	// Only allow POST method
	if r.Method != http.MethodPost {
		writeErrorResponse(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	// Extract order ID from URL path: /orders/{orderId}/submit
	path := strings.TrimPrefix(r.URL.Path, "/orders/")
	path = strings.TrimSuffix(path, "/submit")
	orderID := strings.Split(path, "/")[0]

	if orderID == "" {
		writeErrorResponse(w, http.StatusBadRequest, "INVALID_ORDER_ID", "Order ID is required", "")
		return
	}

	// UUID format validation using google/uuid
	if _, err := uuid.Parse(orderID); err != nil {
		writeErrorResponse(w, http.StatusBadRequest, "INVALID_ORDER_ID", "Invalid order ID format", "")
		return
	}

	// Parse request body
	var requestBody struct {
		Action string `json:"action"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
		writeErrorResponse(w, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Invalid request body", err.Error())
		return
	}

	var order *models.Order
	var err error

	// Perform action
	switch requestBody.Action {
	case "CANCEL":
		order, err = orderService.CancelOrder(orderID)
	case "SUBMIT":
		authToken := r.Header.Get("Authorization")
		order, err = orderService.SubmitOrder(orderID, authToken)
	default:
		writeErrorResponse(w, http.StatusBadRequest, "INVALID_ACTION", "Invalid action. Must be CANCEL or SUBMIT", "")
		return
	}

	if err != nil {
		if errors.Is(err, services.ErrOrderNotFound) {
			writeErrorResponse(w, http.StatusNotFound, "ORDER_NOT_FOUND", "The requested order could not be found", "")
			return
		}
		writeErrorResponse(w, http.StatusBadRequest, "ACTION_FAILED", err.Error(), "")
		return
	}

	// Send response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(order); err != nil {
		log.Printf("Error encoding order response: %v", err)
	}
}
