package main

import (
	"context"
	"log"
	"math/rand"

	"github.com/smith-dallin/manager-dashboard/config"
	"github.com/smith-dallin/manager-dashboard/internal/database"
)

var squadsByDepartment = map[string][]string{
	"Engineering":      {"Platform", "DevOps", "Frontend", "Backend", "Mobile", "Infrastructure"},
	"Product":          {"Core Product", "Growth", "Enterprise", "Platform"},
	"Design":           {"UX Research", "Visual Design", "Product Design", "Brand"},
	"Marketing":        {"Content", "Demand Gen", "Brand", "Events"},
	"Sales":            {"Enterprise", "SMB", "Partnerships", "Solutions"},
	"Human Resources":  {"Recruiting", "People Ops", "Learning & Development"},
	"Finance":          {"Accounting", "FP&A", "Treasury"},
	"Operations":       {"Business Ops", "Strategy", "Process Improvement"},
	"Customer Support": {"Technical Support", "Customer Success", "Onboarding"},
	"Legal":            {"Corporate", "Compliance", "Contracts"},
	"Research":         {"Data Science", "ML Engineering", "Analytics"},
	"IT":               {"Security", "Infrastructure", "Help Desk"},
}

func getRandomSquad(department string) string {
	squads, ok := squadsByDepartment[department]
	if !ok || len(squads) == 0 {
		return "General"
	}
	return squads[rand.Intn(len(squads))]
}

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	pool, err := database.Connect(cfg.DatabaseURL, nil) // Use default pool config for CLI
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	ctx := context.Background()

	// Get all users with empty squads
	rows, err := pool.Query(ctx, "SELECT id, department FROM users WHERE squad = '' OR squad IS NULL")
	if err != nil {
		log.Fatalf("Failed to query users: %v", err)
	}
	defer rows.Close()

	type userUpdate struct {
		ID         int64
		Department string
	}

	var updates []userUpdate
	for rows.Next() {
		var u userUpdate
		if err := rows.Scan(&u.ID, &u.Department); err != nil {
			log.Printf("Failed to scan user: %v", err)
			continue
		}
		updates = append(updates, u)
	}

	log.Printf("Found %d users with empty squads", len(updates))

	// Update each user with a random squad based on their department
	updateCount := 0
	for _, u := range updates {
		squad := getRandomSquad(u.Department)
		_, err := pool.Exec(ctx, "UPDATE users SET squad = $1 WHERE id = $2", squad, u.ID)
		if err != nil {
			log.Printf("Failed to update user %d: %v", u.ID, err)
			continue
		}
		updateCount++
	}

	log.Printf("✅ Updated %d users with squads", updateCount)
}
