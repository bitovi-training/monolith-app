package handlers

import (
	"encoding/json"
	"log"
	"net/http"
)

// HealthCheck implements GET /health endpoint as defined in api/openapi.yaml
func HealthCheck(w http.ResponseWriter, r *http.Request) {
	// Only allow GET method
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Prepare response
	response := map[string]string{
		"status": "healthy",
	}

	// Set content type and status code (200 OK as per OpenAPI spec)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	// Encode and send response
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding health check response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}
