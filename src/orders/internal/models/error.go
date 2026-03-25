package models

// ErrorResponse represents an error response as defined in api/openapi.yaml
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}
