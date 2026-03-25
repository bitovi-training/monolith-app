package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// ProductClient is an interface for interacting with the Product Service
type ProductClient interface {
	GetProduct(productID string, authToken string) (*ProductResponse, error)
	ValidateProduct(productID string, authToken string) (float64, string, error)
}

// ProductServiceClient handles communication with the Product Service
type ProductServiceClient struct {
	baseURL    string
	httpClient *http.Client
	authToken  string
}

// ProductResponse represents the Product Service response for a single product
type ProductResponse struct {
	ID           int     `json:"id"`
	Name         string  `json:"name"`
	Description  string  `json:"description"`
	Price        float64 `json:"price"`
	Availability bool    `json:"availability"`
}

// ProductListResponse represents the Product Service response for multiple products
type ProductListResponse struct {
	Data  []ProductResponse `json:"data"`
	Count int               `json:"count"`
}

// NewProductServiceClient creates a new product service client
func NewProductServiceClient(baseURL, authToken string) *ProductServiceClient {
	return &ProductServiceClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
		authToken: authToken,
	}
}

// GetProduct fetches a product by ID from the Product Service
func (c *ProductServiceClient) GetProduct(productID string, authToken string) (*ProductResponse, error) {
	if c.baseURL == "" {
		return nil, fmt.Errorf("product service URL not configured")
	}

	url := fmt.Sprintf("%s/products/%s", c.baseURL, productID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add authentication header if token is provided (from request or client)
	if authToken != "" {
		req.Header.Set("Authorization", authToken)
	} else if c.authToken != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.authToken))
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("product service unavailable: %w", err)
	}
	defer resp.Body.Close()

	// Handle different status codes
	switch resp.StatusCode {
	case http.StatusOK:
		var product ProductResponse
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to read response body: %w", err)
		}

		if err := json.Unmarshal(body, &product); err != nil {
			return nil, fmt.Errorf("failed to parse product response: %w", err)
		}

		return &product, nil

	case http.StatusNotFound:
		return nil, ErrProductNotFound

	case http.StatusUnauthorized:
		return nil, fmt.Errorf("%w: unauthorized access", ErrProductServiceUnavailable)

	case http.StatusInternalServerError, http.StatusBadGateway, http.StatusServiceUnavailable:
		return nil, fmt.Errorf("%w: status %d", ErrProductServiceUnavailable, resp.StatusCode)

	default:
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected response from product service: status %d, body: %s", resp.StatusCode, string(body))
	}
}

// ValidateProduct checks if a product exists and is available, returns its price and name
func (c *ProductServiceClient) ValidateProduct(productID string, authToken string) (float64, string, error) {
	product, err := c.GetProduct(productID, authToken)
	if err != nil {
		return 0, "", err
	}

	// Check if product is available
	if !product.Availability {
		return 0, "", fmt.Errorf("product '%s' (%s) is not available", productID, product.Name)
	}

	return product.Price, product.Name, nil
}
