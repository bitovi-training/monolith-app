package services

import (
	"errors"
	"testing"

	"github.com/Bitovi/example-go-server/internal/models"
)

// MockProductServiceClient is a mock implementation of ProductClient for testing
type MockProductServiceClient struct {
	GetProductFunc     func(productID string, authToken string) (*ProductResponse, error)
	ValidateProductFunc func(productID string, authToken string) (float64, string, error)
}

func (m *MockProductServiceClient) GetProduct(productID string, authToken string) (*ProductResponse, error) {
	if m.GetProductFunc != nil {
		return m.GetProductFunc(productID, authToken)
	}
	return nil, errors.New("GetProduct not mocked")
}

func (m *MockProductServiceClient) ValidateProduct(productID string, authToken string) (float64, string, error) {
	if m.ValidateProductFunc != nil {
		return m.ValidateProductFunc(productID, authToken)
	}
	return 0, "", errors.New("ValidateProduct not mocked")
}

func TestCreateOrder_Success(t *testing.T) {
	// Create mock product client that returns successful validation
	mockClient := &MockProductServiceClient{
		ValidateProductFunc: func(productID string, authToken string) (float64, string, error) {
			prices := map[string]float64{
				"prod-1": 25.00,
				"prod-2": 50.00,
			}
			names := map[string]string{
				"prod-1": "Product 1",
				"prod-2": "Product 2",
			}
			if price, ok := prices[productID]; ok {
				return price, names[productID], nil
			}
			return 0, "", ErrProductNotFound
		},
	}

	service := NewOrderService(mockClient, nil)

	products := []models.OrderProduct{
		{ProductID: "prod-1", Quantity: 2},
		{ProductID: "prod-2", Quantity: 1},
	}

	order, err := service.CreateOrder("user-123", products, "")

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if order == nil {
		t.Fatal("Expected order, got nil")
	}
	if len(order.Products) != 2 {
		t.Errorf("Expected 2 products, got %d", len(order.Products))
	}
	// Verify product IDs and quantities
	if order.Products[0].ProductID != "prod-1" {
		t.Errorf("Expected product 1 ID 'prod-1', got %s", order.Products[0].ProductID)
	}
	if order.Products[0].Quantity != 2 {
		t.Errorf("Expected product 1 quantity 2, got %d", order.Products[0].Quantity)
	}
	if order.Products[1].ProductID != "prod-2" {
		t.Errorf("Expected product 2 ID 'prod-2', got %s", order.Products[1].ProductID)
	}
	if order.Products[1].Quantity != 1 {
		t.Errorf("Expected product 2 quantity 1, got %d", order.Products[1].Quantity)
	}
	// Total should be (2 * 25.00) + (1 * 50.00) = 100.00
	if order.TotalPrice != 100.00 {
		t.Errorf("Expected total price 100.00, got %f", order.TotalPrice)
	}
	if order.Status != "PENDING" {
		t.Errorf("Expected status PENDING, got %s", order.Status)
	}
}

func TestCreateOrder_ProductNotFound(t *testing.T) {
	// Create mock product client that returns not found
	mockClient := &MockProductServiceClient{
		ValidateProductFunc: func(productID string, authToken string) (float64, string, error) {
			if productID == "prod-1" {
				return 25.00, "Product 1", nil
			}
			return 0, "", ErrProductNotFound
		},
	}

	service := NewOrderService(mockClient, nil)

	products := []models.OrderProduct{
		{ProductID: "prod-1", Quantity: 2},
		{ProductID: "invalid", Quantity: 1},
	}

	order, err := service.CreateOrder("user-123", products, "")

	if err == nil {
		t.Fatal("Expected error for invalid product, got nil")
	}
	if !errors.Is(err, ErrProductNotFound) {
		t.Errorf("Expected ErrProductNotFound, got %v", err)
	}
	if order != nil {
		t.Errorf("Expected nil order, got %+v", order)
	}
}

func TestCreateOrder_ProductServiceUnavailable(t *testing.T) {
	// Create mock product client that returns unavailable
	mockClient := &MockProductServiceClient{
		ValidateProductFunc: func(productID string, authToken string) (float64, string, error) {
			return 0, "", ErrProductServiceUnavailable
		},
	}

	service := NewOrderService(mockClient, nil)

	products := []models.OrderProduct{
		{ProductID: "prod-1", Quantity: 2},
	}

	order, err := service.CreateOrder("user-123", products, "")

	if err == nil {
		t.Fatal("Expected error for unavailable service, got nil")
	}
	if !errors.Is(err, ErrProductServiceUnavailable) {
		t.Errorf("Expected ErrProductServiceUnavailable, got %v", err)
	}
	if order != nil {
		t.Errorf("Expected nil order, got %+v", order)
	}
}

func TestUpdateOrderProducts_AddNewProduct(t *testing.T) {
	// Create mock product client
	mockClient := &MockProductServiceClient{
		ValidateProductFunc: func(productID string, authToken string) (float64, string, error) {
			prices := map[string]float64{
				"prod-1": 25.00,
				"prod-2": 50.00,
				"prod-3": 75.00,
			}
			names := map[string]string{
				"prod-1": "Product 1",
				"prod-2": "Product 2",
				"prod-3": "Product 3",
			}
			if price, ok := prices[productID]; ok {
				return price, names[productID], nil
			}
			return 0, "", ErrProductNotFound
		},
	}

	service := NewOrderService(mockClient, nil)

	// Create initial order
	initialProducts := []models.OrderProduct{
		{ProductID: "prod-1", Quantity: 2},
	}
	order, _ := service.CreateOrder("user-123", initialProducts, "")

	// Add new product
	updates := []models.OrderProduct{
		{ProductID: "prod-3", Quantity: 1},
	}

	updatedOrder, err := service.UpdateOrderProducts(order.ID, updates, "")

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if len(updatedOrder.Products) != 2 {
		t.Errorf("Expected 2 products, got %d", len(updatedOrder.Products))
	}
	// Find prod-3 in the order
	found := false
	for _, p := range updatedOrder.Products {
		if p.ProductID == "prod-3" {
			found = true
			if p.Quantity != 1 {
				t.Errorf("Expected prod-3 quantity 1, got %d", p.Quantity)
			}
		}
	}
	if !found {
		t.Error("Expected to find prod-3 in updated order")
	}
}

func TestUpdateOrderProducts_IncreaseQuantity(t *testing.T) {
	// Create mock product client
	mockClient := &MockProductServiceClient{
		ValidateProductFunc: func(productID string, authToken string) (float64, string, error) {
			return 25.00, "Product 1", nil
		},
	}

	service := NewOrderService(mockClient, nil)

	// Create initial order
	initialProducts := []models.OrderProduct{
		{ProductID: "prod-1", Quantity: 2},
	}
	order, _ := service.CreateOrder("user-123", initialProducts, "")

	// Increase quantity (no validation needed for existing products)
	updates := []models.OrderProduct{
		{ProductID: "prod-1", Quantity: 3},
	}

	updatedOrder, err := service.UpdateOrderProducts(order.ID, updates, "")

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if len(updatedOrder.Products) != 1 {
		t.Errorf("Expected 1 product, got %d", len(updatedOrder.Products))
	}
	if updatedOrder.Products[0].Quantity != 5 {
		t.Errorf("Expected quantity 5 (2+3), got %d", updatedOrder.Products[0].Quantity)
	}
}

func TestUpdateOrderProducts_RemoveProduct(t *testing.T) {
	// Create mock product client
	mockClient := &MockProductServiceClient{
		ValidateProductFunc: func(productID string, authToken string) (float64, string, error) {
			return 25.00, "Product 1", nil
		},
	}

	service := NewOrderService(mockClient, nil)

	// Create initial order with 2 products
	initialProducts := []models.OrderProduct{
		{ProductID: "prod-1", Quantity: 3},
		{ProductID: "prod-2", Quantity: 2},
	}
	order, _ := service.CreateOrder("user-123", initialProducts, "")

	// Remove all of prod-1
	updates := []models.OrderProduct{
		{ProductID: "prod-1", Quantity: -3},
	}

	updatedOrder, err := service.UpdateOrderProducts(order.ID, updates, "")

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if len(updatedOrder.Products) != 1 {
		t.Errorf("Expected 1 product after removal, got %d", len(updatedOrder.Products))
	}
	if updatedOrder.Products[0].ProductID != "prod-2" {
		t.Errorf("Expected remaining product to be prod-2, got %s", updatedOrder.Products[0].ProductID)
	}
}

func TestUpdateOrderProducts_InvalidNewProduct(t *testing.T) {
	// Create mock product client that returns not found for prod-3
	mockClient := &MockProductServiceClient{
		ValidateProductFunc: func(productID string, authToken string) (float64, string, error) {
			if productID == "prod-1" {
				return 25.00, "Product 1", nil
			}
			return 0, "", ErrProductNotFound
		},
	}

	service := NewOrderService(mockClient, nil)

	// Create initial order
	initialProducts := []models.OrderProduct{
		{ProductID: "prod-1", Quantity: 2},
	}
	order, _ := service.CreateOrder("user-123", initialProducts, "")

	// Try to add invalid product
	updates := []models.OrderProduct{
		{ProductID: "invalid", Quantity: 1},
	}

	updatedOrder, err := service.UpdateOrderProducts(order.ID, updates, "")

	if err == nil {
		t.Fatal("Expected error for invalid product, got nil")
	}
	if !errors.Is(err, ErrProductNotFound) {
		t.Errorf("Expected ErrProductNotFound, got %v", err)
	}
	if updatedOrder != nil {
		t.Errorf("Expected nil order, got %+v", updatedOrder)
	}
}

func TestSubmitOrder_Success(t *testing.T) {
	// Create mock product client
	mockClient := &MockProductServiceClient{
		ValidateProductFunc: func(productID string, authToken string) (float64, string, error) {
			return 25.00, "Product 1", nil
		},
	}

	service := NewOrderService(mockClient, nil)

	// Create and submit order
	initialProducts := []models.OrderProduct{
		{ProductID: "prod-1", Quantity: 2},
	}
	order, _ := service.CreateOrder("user-123", initialProducts, "")

	submittedOrder, err := service.SubmitOrder(order.ID, "")

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if submittedOrder.Status != "PROCESSING" {
		t.Errorf("Expected status PROCESSING, got %s", submittedOrder.Status)
	}
}

func TestSubmitOrder_CannotSubmitCancelled(t *testing.T) {
	// Create mock product client
	mockClient := &MockProductServiceClient{
		ValidateProductFunc: func(productID string, authToken string) (float64, string, error) {
			return 25.00, "Product 1", nil
		},
	}

	service := NewOrderService(mockClient, nil)

	// Create, cancel, then try to submit order
	initialProducts := []models.OrderProduct{
		{ProductID: "prod-1", Quantity: 2},
	}
	order, _ := service.CreateOrder("user-123", initialProducts, "")
	service.CancelOrder(order.ID)

	submittedOrder, err := service.SubmitOrder(order.ID, "")

	if err == nil {
		t.Fatal("Expected error when submitting cancelled order, got nil")
	}
	if submittedOrder != nil {
		t.Errorf("Expected nil order, got %+v", submittedOrder)
	}
}

func TestCancelOrder_Success(t *testing.T) {
	// Create mock product client
	mockClient := &MockProductServiceClient{
		ValidateProductFunc: func(productID string, authToken string) (float64, string, error) {
			return 25.00, "Product 1", nil
		},
	}

	service := NewOrderService(mockClient, nil)

	// Create and cancel order
	initialProducts := []models.OrderProduct{
		{ProductID: "prod-1", Quantity: 2},
	}
	order, _ := service.CreateOrder("user-123", initialProducts, "")

	cancelledOrder, err := service.CancelOrder(order.ID)

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if cancelledOrder.Status != "CANCELED" {
		t.Errorf("Expected status CANCELED, got %s", cancelledOrder.Status)
	}
}

func TestGetOrderByID_Success(t *testing.T) {
	// Create mock product client
	mockClient := &MockProductServiceClient{
		ValidateProductFunc: func(productID string, authToken string) (float64, string, error) {
			return 25.00, "Product 1", nil
		},
	}

	service := NewOrderService(mockClient, nil)

	// Create order
	initialProducts := []models.OrderProduct{
		{ProductID: "prod-1", Quantity: 2},
	}
	order, _ := service.CreateOrder("user-123", initialProducts, "")

	// Get order by ID
	retrievedOrder, err := service.GetOrderByID(order.ID)

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if retrievedOrder.ID != order.ID {
		t.Errorf("Expected order ID %s, got %s", order.ID, retrievedOrder.ID)
	}
}

func TestGetOrderByID_NotFound(t *testing.T) {
	mockClient := &MockProductServiceClient{}
	service := NewOrderService(mockClient, nil)

	retrievedOrder, err := service.GetOrderByID("non-existent")

	if err == nil {
		t.Fatal("Expected error for non-existent order, got nil")
	}
	if !errors.Is(err, ErrOrderNotFound) {
		t.Errorf("Expected ErrOrderNotFound, got %v", err)
	}
	if retrievedOrder != nil {
		t.Errorf("Expected nil order, got %+v", retrievedOrder)
	}
}
