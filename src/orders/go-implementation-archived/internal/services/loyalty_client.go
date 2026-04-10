package services

import (
	"fmt"
	"net/http"
)

// LoyaltyClient interface for loyalty service integration
type LoyaltyClient interface {
	AccruePoints(userID string, points int, token string) error
}

// LoyaltyServiceClient implements LoyaltyClient
type LoyaltyServiceClient struct {
	baseURL string
}

// NewLoyaltyServiceClient creates a new loyalty service client
func NewLoyaltyServiceClient(baseURL string) LoyaltyClient {
	return &LoyaltyServiceClient{
		baseURL: baseURL,
	}
}

// AccruePoints accrues loyalty points for a user
func (c *LoyaltyServiceClient) AccruePoints(userID string, points int, token string) error {
	if c.baseURL == "" {
		return nil // Skip if base URL not configured
	}

	url := fmt.Sprintf("%s/loyalty/%s/accrue", c.baseURL, userID)
	req, _ := http.NewRequest("POST", url, nil)

	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("loyalty service unavailable: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("loyalty service error: %d", resp.StatusCode)
	}

	return nil
}
