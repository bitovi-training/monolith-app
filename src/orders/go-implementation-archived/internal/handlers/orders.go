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
		writeErrorResponse(w, http.StatusBadRequest, "EMPTY_PRODUCTS", "Products array is required and must not be empty", "")
		return
	}

	// Validate product IDs and quantities
	for _, product := range requestBody.Products {
		if product.ProductID == "" {
			writeErrorResponse(w, http.StatusBadRequest, "MISSING_PRODUCT_ID", "Product ID is required", "")
			return
		}
		if !isValidUUID(product.ProductID) {
			writeErrorResponse(w, http.StatusBadRequest, "INVALID_PRODUCT_ID", fmt.Sprintf("Invalid product ID format: %s", product.ProductID), "Product ID must be a valid UUID")
			return
		}
		if product.Quantity < 1 {
			writeErrorResponse(w, http.StatusBadRequest, "INVALID_QUANTITY", fmt.Sprintf("Invalid quantity %d for product %s", product.Quantity, product.ProductID), "Quantity must be >= 1")
			return
		}
	}

	// Attempt to create order
	authHeader := r.Header.Get("Authorization")
	authToken := strings.TrimPrefix(authHeader, "Bearer ")

	order, err := orderService.CreateOrder(requestBody.UserID, requestBody.Products, authToken)
	if err != nil {
		if strings.Contains(err.Error(), "service unavailable") || strings.Contains(err.Error(), "Product Service") {
			writeErrorResponse(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "Product Service unavailable", err.Error())
		} else if strings.Contains(err.Error(), "product not found") || strings.Contains(err.Error(), "Invalid products") {
			writeErrorResponse(w, http.StatusBadRequest, "INVALID_PRODUCTS", "One or more products are invalid", err.Error())
		} else {
			writeErrorResponse(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", err.Error())
		}
		return
	}

	// Send created response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(order); err != nil {
		log.Printf("Error encoding created order response: %v", err)
	}
}

// GetOrderByID implements GET /orders/{orderId} endpoint
func GetOrderByID(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeErrorResponse(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	// Extract order ID from URL
	orderID := extractIDFromPath(r.URL.Path, "/orders/")
	if orderID == "" {
		writeErrorResponse(w, http.StatusBadRequest, "MISSING_ORDER_ID", "Order ID is required", "")
		return
	}

	// Validate UUID format
	if !isValidUUID(orderID) {
		writeErrorResponse(w, http.StatusBadRequest, "INVALID_ORDER_ID", "Invalid order ID format", "Order ID must be a valid UUID")
		return
	}

	// Get order
	order, err := orderService.GetOrderByID(orderID)
	if err != nil {
		if errors.Is(err, services.ErrOrderNotFound) {
			writeErrorResponse(w, http.StatusNotFound, "ORDER_NOT_FOUND", fmt.Sprintf("Order %s not found", orderID), "")
		} else {
			writeErrorResponse(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", err.Error())
		}
		return
	}

	// Send response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(order); err != nil {
		log.Printf("Error encoding order response: %v", err)
	}
}

// UpdateOrder implements PATCH /orders/{orderId} endpoint
func UpdateOrder(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		writeErrorResponse(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	// Extract order ID from URL
	orderID := extractIDFromPath(r.URL.Path, "/orders/")
	if orderID == "" {
		writeErrorResponse(w, http.StatusBadRequest, "MISSING_ORDER_ID", "Order ID is required", "")
		return
	}

	// Validate UUID format
	if !isValidUUID(orderID) {
		writeErrorResponse(w, http.StatusBadRequest, "INVALID_ORDER_ID", "Invalid order ID format", "Order ID must be a valid UUID")
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

	// Get auth token
	authHeader := r.Header.Get("Authorization")
	authToken := strings.TrimPrefix(authHeader, "Bearer ")

	// Update order
	order, err := orderService.UpdateOrder(orderID, requestBody.Products, authToken)
	if err != nil {
		if errors.Is(err, services.ErrOrderNotFound) {
			writeErrorResponse(w, http.StatusNotFound, "ORDER_NOT_FOUND", fmt.Sprintf("Order %s not found", orderID), "")
		} else if strings.Contains(err.Error(), "not PENDING") {
			writeErrorResponse(w, http.StatusBadRequest, "ORDER_NOT_PENDING", "Order is not in PENDING status", err.Error())
		} else if strings.Contains(err.Error(), "product") {
			writeErrorResponse(w, http.StatusBadRequest, "INVALID_PRODUCTS", "One or more products are invalid", err.Error())
		} else {
			writeErrorResponse(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", err.Error())
		}
		return
	}

	// Send response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(order); err != nil {
		log.Printf("Error encoding updated order response: %v", err)
	}
}

// CancelOrSubmitOrder implements POST /orders/{orderId}/submit endpoint
func CancelOrSubmitOrder(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeErrorResponse(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	// Extract order ID from URL
	orderID := extractIDFromPath(r.URL.Path, "/orders/")
	if orderID == "" || strings.HasSuffix(orderID, "/submit") {
		// Handle /orders/{orderId}/submit
		parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/orders/"), "/")
		if len(parts) >= 1 {
			orderID = parts[0]
		}
	}

	if orderID == "" {
		writeErrorResponse(w, http.StatusBadRequest, "MISSING_ORDER_ID", "Order ID is required", "")
		return
	}

	// Validate UUID format
	if !isValidUUID(orderID) {
		writeErrorResponse(w, http.StatusBadRequest, "INVALID_ORDER_ID", "Invalid order ID format", "Order ID must be a valid UUID")
		return
	}

	// Get auth token
	authHeader := r.Header.Get("Authorization")
	authToken := strings.TrimPrefix(authHeader, "Bearer ")

	// Submit/cancel order
	order, err := orderService.SubmitOrder(orderID, authToken)
	if err != nil {
		if errors.Is(err, services.ErrOrderNotFound) {
			writeErrorResponse(w, http.StatusNotFound, "ORDER_NOT_FOUND", fmt.Sprintf("Order %s not found", orderID), "")
		} else if strings.Contains(err.Error(), "not PENDING") {
			writeErrorResponse(w, http.StatusBadRequest, "ORDER_NOT_PENDING", "Order is not in PENDING status", err.Error())
		} else {
			writeErrorResponse(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", err.Error())
		}
		return
	}

	// Send response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(order); err != nil {
		log.Printf("Error encoding submitted order response: %v", err)
	}
}

// extractIDFromPath extracts an ID from URL path
func extractIDFromPath(path, prefix string) string {
	if !strings.HasPrefix(path, prefix) {
		return ""
	}
	parts := strings.Split(strings.TrimPrefix(path, prefix), "/")
	if len(parts) > 0 && parts[0] != "" {
		return parts[0]
	}
	return ""
}
