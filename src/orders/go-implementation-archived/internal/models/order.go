package models

import (
	"time"
)

// OrderProduct represents a product within an order
type OrderProduct struct {
	ProductID string `json:"productId"`
	Quantity  int    `json:"quantity"`
}

// OrderStatus represents the status of an order
type OrderStatus string

const (
	OrderStatusPending    OrderStatus = "PENDING"
	OrderStatusProcessing OrderStatus = "PROCESSING"
	OrderStatusShipped    OrderStatus = "SHIPPED"
	OrderStatusDelivered  OrderStatus = "DELIVERED"
	OrderStatusCanceled   OrderStatus = "CANCELED"
)

// Order represents an order as defined in api/openapi.yaml
type Order struct {
	ID         string         `json:"id"`
	UserID     string         `json:"userId"`
	Products   []OrderProduct `json:"products"`
	TotalPrice float64        `json:"totalPrice"`
	AccruedLoyaltyPoints int  `json:"accruedLoyaltyPoints,omitempty"`
	OrderDate  time.Time      `json:"orderDate"`
	Status     OrderStatus    `json:"status"`
}

// OrderListResponse represents the response for GET /orders
type OrderListResponse struct {
	Orders []Order `json:"orders"`
	Total  int     `json:"total"`
}
