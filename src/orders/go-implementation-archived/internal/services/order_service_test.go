package services

import (
	"testing"

	"github.com/Bitovi/example-go-server/internal/models"
)

type MockProductClient struct {
	ValidateProductFunc func(productID, token string) (float64, string, error)
	GetProductsFunc     func(token string) ([]models.ProductInfo, error)
}

func (m *MockProductClient) ValidateProduct(productID, token string) (float64, string, error) {
	if m.ValidateProductFunc != nil {
		return m.ValidateProductFunc(productID, token)
	}
	return 99.99, "Test Product", nil
}

func (m *MockProductClient) GetProducts(token string) ([]models.ProductInfo, error) {
	if m.GetProductsFunc != nil {
		return m.GetProductsFunc(token)
	}
	return []models.ProductInfo{}, nil
}

type MockLoyaltyClient struct {
	AccruePointsFunc func(userID string, points int, token string) error
}

func (m *MockLoyaltyClient) AccruePoints(userID string, points int, token string) error {
	if m.AccruePointsFunc != nil {
		return m.AccruePointsFunc(userID, points, token)
	}
	return nil
}

func TestListOrders(t *testing.T) {
	ResetOrderMockData()
	mockProduct := &MockProductClient{}
	mockLoyalty := &MockLoyaltyClient{}

	service := NewOrderService(mockProduct, mockLoyalty)
	orders, total := service.ListOrders()

	if total == 0 {
		t.Error("Expected non-zero total")
	}

	if len(orders) != total {
		t.Errorf("Expected %d orders, got %d", total, len(orders))
	}
}

func TestGetOrderByID(t *testing.T) {
	ResetOrderMockData()
	mockProduct := &MockProductClient{}
	mockLoyalty := &MockLoyaltyClient{}

	service := NewOrderService(mockProduct, mockLoyalty)
	orders, _ := service.ListOrders()

	if len(orders) == 0 {
		t.Skip("No orders in mock data")
	}

	order, err := service.GetOrderByID(orders[0].ID)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if order.ID != orders[0].ID {
		t.Errorf("Expected order ID %s, got %s", orders[0].ID, order.ID)
	}
}

func TestCreateOrder(t *testing.T) {
	ResetOrderMockData()
	mockProduct := &MockProductClient{
		ValidateProductFunc: func(productID, token string) (float64, string, error) {
			return 99.99, "Test Product", nil
		},
	}
	mockLoyalty := &MockLoyaltyClient{}

	service := NewOrderService(mockProduct, mockLoyalty)

	products := []models.OrderProduct{
		{
			ProductID: "550e8400-e29b-41d4-a716-446655440000",
			Quantity:  2,
		},
	}

	order, err := service.CreateOrder("750e8400-e29b-41d4-a716-446655440099", products, "")
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if order.Status != models.OrderStatusPending {
		t.Errorf("Expected status PENDING, got %s", order.Status)
	}

	expectedTotal := 99.99 * 2
	if order.TotalPrice != expectedTotal {
		t.Errorf("Expected total %.2f, got %.2f", expectedTotal, order.TotalPrice)
	}
}

func TestSubmitOrder(t *testing.T) {
	ResetOrderMockData()
	mockProduct := &MockProductClient{}
	mockLoyalty := &MockLoyaltyClient{}

	service := NewOrderService(mockProduct, mockLoyalty)
	orders, _ := service.ListOrders()

	// Find a pending order
	var pendingOrder *models.Order
	for i := range orders {
		if orders[i].Status == models.OrderStatusPending {
			pendingOrder = &orders[i]
			break
		}
	}

	if pendingOrder == nil {
		t.Skip("No pending orders in mock data")
	}

	order, err := service.SubmitOrder(pendingOrder.ID, "")
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if order.Status != models.OrderStatusProcessing {
		t.Errorf("Expected status PROCESSING, got %s", order.Status)
	}
}
