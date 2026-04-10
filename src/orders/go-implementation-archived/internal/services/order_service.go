package services

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/Bitovi/example-go-server/internal/models"
	"github.com/google/uuid"
)

var (
	// ErrOrderNotFound is returned when an order is not found
	ErrOrderNotFound = errors.New("order not found")
	// ErrProductServiceUnavailable is returned when product service is unavailable
	ErrProductServiceUnavailable = errors.New("product service unavailable")
	// ErrProductNotFound is returned when a product is not found
	ErrProductNotFound = errors.New("product not found")

	// Mock order data
	mockOrders = []models.Order{
		{
			ID:     "650e8400-e29b-41d4-a716-446655440000",
			UserID: "750e8400-e29b-41d4-a716-446655440000",
			Products: []models.OrderProduct{
				{
					ProductID: "550e8400-e29b-41d4-a716-446655440000", // Laptop
					Quantity:  1,
				},
				{
					ProductID: "550e8400-e29b-41d4-a716-446655440001", // Wireless Mouse
					Quantity:  2,
				},
			},
			TotalPrice: 1359.97,
			OrderDate:  time.Now().AddDate(0, 0, -5),
			Status:     models.OrderStatusPending,
		},
		{
			ID:     "650e8400-e29b-41d4-a716-446655440001",
			UserID: "750e8400-e29b-41d4-a716-446655440000",
			Products: []models.OrderProduct{
				{
					ProductID: "550e8400-e29b-41d4-a716-446655440002", // Desk Lamp
					Quantity:  3,
				},
			},
			TotalPrice: 149.97,
			OrderDate:  time.Now().AddDate(0, 0, -3),
			Status:     models.OrderStatusShipped,
		},
		{
			ID:     "650e8400-e29b-41d4-a716-446655440002",
			UserID: "750e8400-e29b-41d4-a716-446655440001",
			Products: []models.OrderProduct{
				{
					ProductID: "550e8400-e29b-41d4-a716-446655440003", // Notebook
					Quantity:  5,
				},
				{
					ProductID: "550e8400-e29b-41d4-a716-446655440004", // Coffee Maker
					Quantity:  1,
				},
			},
			TotalPrice: 179.94,
			OrderDate:  time.Now().AddDate(0, 0, -1),
			Status:     models.OrderStatusProcessing,
		},
	}
)

// ResetOrderMockData resets the mock order data to its initial state
// This should be called in test setup to ensure test isolation
func ResetOrderMockData() {
	mockOrders = []models.Order{
		{
			ID:     "650e8400-e29b-41d4-a716-446655440000",
			UserID: "750e8400-e29b-41d4-a716-446655440000",
			Products: []models.OrderProduct{
				{
					ProductID: "550e8400-e29b-41d4-a716-446655440000", // Laptop
					Quantity:  1,
				},
				{
					ProductID: "550e8400-e29b-41d4-a716-446655440001", // Wireless Mouse
					Quantity:  2,
				},
			},
			TotalPrice: 1359.97,
			OrderDate:  time.Now().AddDate(0, 0, -5),
			Status:     models.OrderStatusPending,
		},
		{
			ID:     "650e8400-e29b-41d4-a716-446655440001",
			UserID: "750e8400-e29b-41d4-a716-446655440000",
			Products: []models.OrderProduct{
				{
					ProductID: "550e8400-e29b-41d4-a716-446655440002", // Desk Lamp
					Quantity:  3,
				},
			},
			TotalPrice: 149.97,
			OrderDate:  time.Now().AddDate(0, 0, -3),
			Status:     models.OrderStatusShipped,
		},
		{
			ID:     "650e8400-e29b-41d4-a716-446655440002",
			UserID: "750e8400-e29b-41d4-a716-446655440001",
			Products: []models.OrderProduct{
				{
					ProductID: "550e8400-e29b-41d4-a716-446655440003", // Notebook
					Quantity:  5,
				},
				{
					ProductID: "550e8400-e29b-41d4-a716-446655440004", // Coffee Maker
					Quantity:  1,
				},
			},
			TotalPrice: 179.94,
			OrderDate:  time.Now().AddDate(0, 0, -1),
			Status:     models.OrderStatusProcessing,
		},
	}
}

// GetMockOrders returns a copy of mock orders for cross-service access
func GetMockOrders() []models.Order {
	orders := make([]models.Order, len(mockOrders))
	copy(orders, mockOrders)
	return orders
}

// OrderService handles business logic for orders
type OrderService struct {
	productClient ProductClient
	loyaltyClient LoyaltyClient
}

// NewOrderService creates a new OrderService with a product client
func NewOrderService(productClient ProductClient, loyaltyClient LoyaltyClient) *OrderService {
	return &OrderService{
		productClient: productClient,
		loyaltyClient: loyaltyClient,
	}
}

// ListOrders returns a list of all orders
func (s *OrderService) ListOrders() ([]models.Order, int) {
	total := len(mockOrders)

	// Return a copy to prevent modification
	orders := make([]models.Order, len(mockOrders))
	copy(orders, mockOrders)

	return orders, total
}

// GetOrderByID returns an order by its ID
func (s *OrderService) GetOrderByID(id string) (*models.Order, error) {
	for _, order := range mockOrders {
		if order.ID == id {
			// Return a copy to prevent modification
			o := order
			return &o, nil
		}
	}

	return nil, ErrOrderNotFound
}

// CreateOrder creates a new order with product validation from Product Service
func (s *OrderService) CreateOrder(userID string, products []models.OrderProduct, authToken string) (*models.Order, error) {
	if len(products) == 0 {
		return nil, errors.New("order must contain at least one product")
	}

	// Validate products and calculate total price using Product Service
	var invalidProducts []string
	totalPrice := 0.0

	for i := range products {
		price, name, err := s.productClient.ValidateProduct(products[i].ProductID, authToken)
		if err != nil {
			if strings.Contains(err.Error(), "product not found") {
				invalidProducts = append(invalidProducts, products[i].ProductID)
				continue
			}
			// Product service unavailable or other error
			return nil, fmt.Errorf("%w: %v", ErrProductServiceUnavailable, err)
		}

		// Store product name for reference (optional, not in current model)
		_ = name

		// Calculate line total
		totalPrice += price * float64(products[i].Quantity)
	}

	// If any products were invalid, return error with details
	if len(invalidProducts) > 0 {
		return nil, fmt.Errorf("Invalid products: %s", strings.Join(invalidProducts, ", "))
	}

	// Create new order
	newOrder := models.Order{
		ID:         uuid.New().String(),
		UserID:     userID,
		Products:   products,
		TotalPrice: totalPrice,
		OrderDate:  time.Now(),
		Status:     models.OrderStatusPending,
	}

	// Add to mock orders
	mockOrders = append(mockOrders, newOrder)

	// Return a copy
	o := newOrder
	return &o, nil
}

// UpdateOrder updates an order with new products
func (s *OrderService) UpdateOrder(orderID string, products []models.OrderProduct, authToken string) (*models.Order, error) {
	// Find the order
	var orderIdx = -1
	for i, order := range mockOrders {
		if order.ID == orderID {
			orderIdx = i
			break
		}
	}

	if orderIdx == -1 {
		return nil, ErrOrderNotFound
	}

	order := mockOrders[orderIdx]

	// Order must be PENDING to update
	if order.Status != models.OrderStatusPending {
		return nil, errors.New("order is not PENDING")
	}

	// Validate any new products
	var invalidProducts []string
	totalPrice := 0.0

	// Build updated product list
	productMap := make(map[string]models.OrderProduct)
	for _, p := range order.Products {
		productMap[p.ProductID] = p
	}

	// Apply updates
	for _, update := range products {
		if update.Quantity == 0 {
			continue // Skip zero updates
		}

		existing, hasExisting := productMap[update.ProductID]

		if hasExisting {
			// Update existing quantity
			newQty := existing.Quantity + update.Quantity
			if newQty <= 0 {
				delete(productMap, update.ProductID)
			} else {
				existing.Quantity = newQty
				productMap[update.ProductID] = existing
			}
		} else if update.Quantity > 0 {
			// Add new product - validate it
			price, _, err := s.productClient.ValidateProduct(update.ProductID, authToken)
			if err != nil {
				invalidProducts = append(invalidProducts, update.ProductID)
				continue
			}
			productMap[update.ProductID] = models.OrderProduct{
				ProductID: update.ProductID,
				Quantity:  update.Quantity,
			}
		}
	}

	// Check for invalid products
	if len(invalidProducts) > 0 {
		return nil, fmt.Errorf("Invalid products: %s", strings.Join(invalidProducts, ", "))
	}

	// Calculate new total price
	for productID, product := range productMap {
		price, _, err := s.productClient.ValidateProduct(productID, authToken)
		if err != nil {
			return nil, fmt.Errorf("Failed to recalculate price: %v", err)
		}
		totalPrice += price * float64(product.Quantity)
	}

	// Rebuild products array
	newProducts := make([]models.OrderProduct, 0, len(productMap))
	for _, p := range productMap {
		newProducts = append(newProducts, p)
	}

	// Update order
	order.Products = newProducts
	order.TotalPrice = totalPrice
	mockOrders[orderIdx] = order

	// Return a copy
	o := order
	return &o, nil
}

// SubmitOrder changes order status from PENDING to PROCESSING
func (s *OrderService) SubmitOrder(orderID string, authToken string) (*models.Order, error) {
	// Find the order
	var orderIdx = -1
	for i, order := range mockOrders {
		if order.ID == orderID {
			orderIdx = i
			break
		}
	}

	if orderIdx == -1 {
		return nil, ErrOrderNotFound
	}

	order := mockOrders[orderIdx]

	// Order must be PENDING
	if order.Status != models.OrderStatusPending {
		return nil, errors.New("order is not PENDING")
	}

	// Change status
	order.Status = models.OrderStatusProcessing
	mockOrders[orderIdx] = order

	// Try to accrue loyalty points (non-blocking)
	loyaltyPoints := int(order.TotalPrice) // 1 point per dollar
	if loyaltyPoints > 0 {
		_ = s.loyaltyClient.AccruePoints(order.UserID, loyaltyPoints, authToken)
	}

	// Return a copy
	o := order
	return &o, nil
}
