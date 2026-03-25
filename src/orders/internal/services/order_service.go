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
		return nil, fmt.Errorf("%w: %s", ErrProductNotFound, strings.Join(invalidProducts, ", "))
	}

	// Generate new order with proper UUID
	orderID := uuid.New().String()
	newOrder := models.Order{
		ID:                   orderID,
		UserID:               userID,
		Products:             products,
		TotalPrice:           totalPrice,
		AccruedLoyaltyPoints: 0,
		OrderDate:            time.Now(),
		Status:               models.OrderStatusPending,
	}

	// Add to mock orders
	mockOrders = append(mockOrders, newOrder)

	return &newOrder, nil
}

// UpdateOrderStatus updates the status of an order
func (s *OrderService) UpdateOrderStatus(orderID string, status models.OrderStatus) (*models.Order, error) {
	for i, order := range mockOrders {
		if order.ID == orderID {
			mockOrders[i].Status = status
			return &mockOrders[i], nil
		}
	}

	return nil, ErrOrderNotFound
}

// UpdateOrderProducts updates the products in an order (only for PENDING orders)
// For each product in the input:
// - If quantity > 0: adds the quantity to existing product (or creates new product)
// - If quantity < 0: subtracts the quantity from existing product (removes if result <= 0)
// - If quantity = 0: does nothing
func (s *OrderService) UpdateOrderProducts(orderID string, products []models.OrderProduct, authToken string) (*models.Order, error) {
	for i, order := range mockOrders {
		if order.ID == orderID {
			// Only allow updating products for pending orders
			if order.Status != models.OrderStatusPending {
				return nil, errors.New("can only update products for pending orders")
			}

			// Create a map of existing products for quick lookup
			existingProducts := make(map[string]models.OrderProduct)
			for _, product := range order.Products {
				existingProducts[product.ProductID] = product
			}

			// Track new products that need validation
			var newProductIDs []string

			// Process each product in the request
			for _, product := range products {
				if product.Quantity == 0 {
					// Do nothing
					continue
				}

				existing, exists := existingProducts[product.ProductID]
				if exists {
					// Product already exists - add or subtract quantity
					newQuantity := existing.Quantity + product.Quantity
					if newQuantity <= 0 {
						// Remove the product if quantity becomes 0 or negative
						delete(existingProducts, product.ProductID)
					} else {
						// Update the quantity
						existing.Quantity = newQuantity
						existingProducts[product.ProductID] = existing
					}
				} else if product.Quantity > 0 {
					// New product with positive quantity - validate it first
					newProductIDs = append(newProductIDs, product.ProductID)
					existingProducts[product.ProductID] = product
				}
				// If product doesn't exist and quantity is negative, ignore it
			}

			// Validate new products with Product Service
			var invalidProducts []string
			for _, productID := range newProductIDs {
				_, _, err := s.productClient.ValidateProduct(productID, authToken)
				if err != nil {
					if strings.Contains(err.Error(), "product not found") {
						invalidProducts = append(invalidProducts, productID)
						// Remove the invalid product from existingProducts
						delete(existingProducts, productID)
						continue
					}
					// Product service unavailable or other error
					return nil, fmt.Errorf("%w: %v", ErrProductServiceUnavailable, err)
				}
			}

			// If any products were invalid, return error with details
			if len(invalidProducts) > 0 {
				return nil, fmt.Errorf("%w: %s", ErrProductNotFound, strings.Join(invalidProducts, ", "))
			}

			// Convert map back to slice
			updatedProducts := make([]models.OrderProduct, 0, len(existingProducts))
			for _, product := range existingProducts {
				updatedProducts = append(updatedProducts, product)
			}

			// Recalculate total price using Product Service
			totalPrice := 0.0
			for _, orderProduct := range updatedProducts {
				price, _, err := s.productClient.ValidateProduct(orderProduct.ProductID, authToken)
				if err != nil {
					return nil, fmt.Errorf("%w: %v", ErrProductServiceUnavailable, err)
				}
				totalPrice += price * float64(orderProduct.Quantity)
			}

			// Update the order
			mockOrders[i].Products = updatedProducts
			mockOrders[i].TotalPrice = totalPrice

			return &mockOrders[i], nil
		}
	}

	return nil, ErrOrderNotFound
}

// CancelOrder cancels an order
func (s *OrderService) CancelOrder(orderID string) (*models.Order, error) {
	return s.UpdateOrderStatus(orderID, models.OrderStatusCanceled)
}

// SubmitOrder submits a pending order for processing
func (s *OrderService) SubmitOrder(orderID string, authToken string) (*models.Order, error) {
	for i, order := range mockOrders {
		if order.ID == orderID {
			if order.Status != models.OrderStatusPending {
				return nil, errors.New("only pending orders can be submitted")
			}
			mockOrders[i].Status = models.OrderStatusProcessing

			if s.loyaltyClient != nil {
				points, err := s.loyaltyClient.AccruePoints(order.ID, order.UserID, order.TotalPrice, authToken)
				if err != nil {
					return nil, err
				}
				mockOrders[i].AccruedLoyaltyPoints = points
			}

			return &mockOrders[i], nil
		}
	}

	return nil, ErrOrderNotFound
}
