package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthCheck(t *testing.T) {
	tests := []struct {
		name           string
		method         string
		expectedStatus int
		expectedBody   map[string]string
	}{
		{
			name:           "GET request returns 200 OK",
			method:         http.MethodGet,
			expectedStatus: http.StatusOK,
			expectedBody:   map[string]string{"status": "healthy"},
		},
		{
			name:           "POST request returns 405 Method Not Allowed",
			method:         http.MethodPost,
			expectedStatus: http.StatusMethodNotAllowed,
			expectedBody:   nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create request
			req := httptest.NewRequest(tt.method, "/health", nil)
			w := httptest.NewRecorder()

			// Call handler
			HealthCheck(w, req)

			// Check status code
			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			// Check response body for successful requests
			if tt.expectedBody != nil {
				var response map[string]string
				if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
					t.Fatalf("Failed to decode response: %v", err)
				}

				if response["status"] != tt.expectedBody["status"] {
					t.Errorf("Expected status %q, got %q", tt.expectedBody["status"], response["status"])
				}
			}
		})
	}
}
