package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Bitovi/example-go-server/internal/models"
	"github.com/Bitovi/example-go-server/internal/services"
)

// MockProductClient for testing
type MockProductClient struct {
	ValidateProductFunc func(productID, token string) (float64, string, error)
}

func (m *MockProductClient) ValidateProduct(productID, token string) (float64, string, error) {
	return m.ValidateProductFunc(productID, token)
}

func (m *MockProductClient) GetProducts(token string) ([]models.ProductInfo, error) {
	return []models.ProductInfo{}, nil
}

// MockLoyaltyClient for testing
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
	mockProductClient := &MockProductClient{}
	mockLoyaltyClient := &MockLoyaltyClient{}

	InitializeOrderService(mockProductClient, mockLoyaltyClient)

	req := httptest.NewRequest("GET", "/orders", nil)
	rec := httptest.NewRecorder()

	ListOrders(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, rec.Code)
	}

	var response models.OrderListResponse
	json.NewDecoder(rec.Body).Decode(&response)

	if response.Total < 0 {
		t.Errorf("Expected non-negative total, got %d", response.Total)
	}
}

func TestCreateOrderInvalidBody(t *testing.T) {
	mockProductClient := &MockProductClient{}
	mockLoyaltyClient := &MockLoyaltyClient{}

	InitializeOrderService(mockProductClient, mockLoyaltyClient)

	body := []byte(`{invalid json}`)
	req := httptest.NewRequest("POST", "/orders", bytes.NewBuffer(body))
	rec := httptest.NewRecorder()

	CreateOrder(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, rec.Code)
	}
}

func TestHealth(t *testing.T) {
	req := httptest.NewRequest("GET", "/health", nil)
	rec := httptest.NewRecorder()

	HealthCheck(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, rec.Code)
	}
}
