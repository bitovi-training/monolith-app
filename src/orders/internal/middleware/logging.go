package middleware

import (
	"log"
	"net/http"
	"time"
)

// LoggingMiddleware logs all HTTP requests with request/response details
func LoggingMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Log request
		log.Printf("[%s] %s %s --- Started", r.Method, r.URL.Path, r.RemoteAddr)

		// Create a response writer wrapper to capture status code
		wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		// Call the next handler
		next(wrapped, r)

		// Log response
		duration := time.Since(start)
		log.Printf("[%s] %s %s --- Completed in %v with status %d",
			r.Method, r.URL.Path, r.RemoteAddr, duration, wrapped.statusCode)
	}
}

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
