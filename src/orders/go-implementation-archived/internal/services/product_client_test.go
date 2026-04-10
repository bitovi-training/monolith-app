package services

import (
	"testing"
)

func TestValidateProduct(t *testing.T) {
	client := NewProductServiceClient("", "")
	price, name, err := client.ValidateProduct("550e8400-e29b-41d4-a716-446655440000", "")

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if price <= 0 {
		t.Errorf("Expected positive price, got %.2f", price)
	}

	if name == "" {
		t.Error("Expected non-empty product name")
	}
}
