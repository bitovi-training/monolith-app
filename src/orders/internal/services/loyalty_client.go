package services

import (
  "bytes"
  "encoding/json"
  "fmt"
  "net/http"
  "time"
)

// LoyaltyClient provides loyalty accrual integration.
type LoyaltyClient interface {
  AccruePoints(orderID string, userID string, totalPrice float64, authToken string) (int, error)
}

// LoyaltyServiceClient calls the Loyalty Service for point accrual.
type LoyaltyServiceClient struct {
  baseURL    string
  httpClient *http.Client
}

type loyaltyAccrualRequest struct {
  OrderID    string  `json:"orderId"`
  UserID     string  `json:"userId"`
  TotalPrice float64 `json:"totalPrice"`
}

type loyaltyAccrualResponse struct {
  OrderID string `json:"orderId"`
  UserID  string `json:"userId"`
  Points  int    `json:"points"`
}

// NewLoyaltyServiceClient creates a new loyalty client.
func NewLoyaltyServiceClient(baseURL string) *LoyaltyServiceClient {
  return &LoyaltyServiceClient{
    baseURL: baseURL,
    httpClient: &http.Client{
      Timeout: 5 * time.Second,
    },
  }
}

// AccruePoints requests loyalty-service to calculate and store points for an order.
func (c *LoyaltyServiceClient) AccruePoints(orderID string, userID string, totalPrice float64, authToken string) (int, error) {
  if c.baseURL == "" {
    return 0, fmt.Errorf("loyalty service URL not configured")
  }

  payload := loyaltyAccrualRequest{
    OrderID:    orderID,
    UserID:     userID,
    TotalPrice: totalPrice,
  }

  body, err := json.Marshal(payload)
  if err != nil {
    return 0, fmt.Errorf("failed to marshal loyalty request: %w", err)
  }

  req, err := http.NewRequest("POST", fmt.Sprintf("%s/loyalty/orders", c.baseURL), bytes.NewReader(body))
  if err != nil {
    return 0, fmt.Errorf("failed to create loyalty request: %w", err)
  }
  req.Header.Set("Content-Type", "application/json")

  if authToken != "" {
    req.Header.Set("Authorization", authToken)
  }

  resp, err := c.httpClient.Do(req)
  if err != nil {
    return 0, fmt.Errorf("loyalty service unavailable: %w", err)
  }
  defer resp.Body.Close()

  if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
    return 0, fmt.Errorf("loyalty service error: status %d", resp.StatusCode)
  }

  var response loyaltyAccrualResponse
  if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
    return 0, fmt.Errorf("failed to decode loyalty response: %w", err)
  }

  return response.Points, nil
}