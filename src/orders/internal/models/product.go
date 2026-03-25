package models

import (
	"time"
)

// Product represents a product as defined in api/openapi.yaml
type Product struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	Price       float64   `json:"price"`
	Category    string    `json:"category,omitempty"`
	InStock     bool      `json:"inStock,omitempty"`
	CreatedAt   time.Time `json:"createdAt,omitempty"`
	UpdatedAt   time.Time `json:"updatedAt,omitempty"`
}

// ProductListResponse represents the response for GET /products
type ProductListResponse struct {
	Products []Product `json:"products"`
	Total    int       `json:"total"`
	Limit    int       `json:"limit"`
}
