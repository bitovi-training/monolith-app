package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/Bitovi/example-go-server/internal/models"
)

// ProductClient interface for product service integration
type ProductClient interface {
	ValidateProduct(productID, token string) (float64, string, error)
	GetProducts(token string) ([]models.ProductInfo, error)
}

// ProductServiceClient implements ProductClient
type ProductServiceClient struct {
	baseURL string
	token   string
}

// NewProductServiceClient creates a new product service client
func NewProductServiceClient(baseURL, token string) ProductClient {
	return &ProductServiceClient{
		baseURL: baseURL,
		token:   token,
	}
}

// ValidateProduct validates a product and returns its price
func (c *ProductServiceClient) ValidateProduct(productID, token string) (float64, string, error) {
	if c.baseURL == "" {
		// Mock response for testing
		return 99.99, "Mock Product", nil
	}

	url := fmt.Sprintf("%s/products/%s", c.baseURL, productID)
	req, _ := http.NewRequest("GET", url, nil)

	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return 0, "", fmt.Errorf("product service unavailable: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return 0, "", fmt.Errorf("product not found")
	}

	if resp.StatusCode != http.StatusOK {
		return 0, "", fmt.Errorf("product service error: %d", resp.StatusCode)
	}

	var product models.ProductInfo
	if err := json.NewDecoder(resp.Body).Decode(&product); err != nil {
		return 0, "", fmt.Errorf("invalid product response: %v", err)
	}

	return product.Price, product.Name, nil
}

// GetProducts retrieves all products
func (c *ProductServiceClient) GetProducts(token string) ([]models.ProductInfo, error) {
	if c.baseURL == "" {
		return []models.ProductInfo{}, nil
	}

	url := fmt.Sprintf("%s/products", c.baseURL)
	req, _ := http.NewRequest("GET", url, nil)

	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("product service unavailable: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("product service error: %d", resp.StatusCode)
	}

	var products []models.ProductInfo
	if err := json.NewDecoder(resp.Body).Decode(&products); err != nil {
		return nil, fmt.Errorf("invalid products response: %v", err)
	}

	return products, nil
}
