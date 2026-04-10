package handlers

import (
	"encoding/json"
	"log"
	"net/http"
)

// HealthCheck implements GET /health endpoint
func HealthCheck(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	healthResponse := map[string]string{"status": "ok"}
	if err := json.NewEncoder(w).Encode(healthResponse); err != nil {
		log.Printf("Error encoding health check response: %v", err)
	}
}
