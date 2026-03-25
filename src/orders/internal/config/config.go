package config

import (
	"os"
	"strings"
)

// Config holds the application configuration
type Config struct {
	ProductServiceURL string
	LoyaltyServiceURL string
	Port              string
}

// LoadConfig loads configuration from environment variables
func LoadConfig() *Config {
	port := getEnv("PORT", "8080")
	// Ensure port has colon prefix for http.ListenAndServe
	if !strings.HasPrefix(port, ":") {
		port = ":" + port
	}
	
	return &Config{
		ProductServiceURL: getEnv("PRODUCT_SERVICE_URL", ""),
		LoyaltyServiceURL: getEnv("LOYALTY_SERVICE_URL", ""),
		Port:              port,
	}
}

// getEnv retrieves an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
