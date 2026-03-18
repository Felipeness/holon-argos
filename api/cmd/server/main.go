package main

import (
	"log"
	"net/http"
	"os"

	"github.com/Felipeness/orchestrix-agents/internal/handler"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", handler.Health)
	mux.HandleFunc("GET /api/v1/incidents", handler.ListIncidents)
	mux.HandleFunc("POST /api/v1/incidents", handler.CreateIncident)
	mux.HandleFunc("GET /api/v1/incidents/{id}", handler.GetIncident)

	log.Printf("orchestrix-agents API listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("server start: %v", err)
	}
}
