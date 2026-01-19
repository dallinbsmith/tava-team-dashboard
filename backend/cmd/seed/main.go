package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/smith-dallin/manager-dashboard/config"
	"github.com/smith-dallin/manager-dashboard/internal/database"
)

var firstNames = []string{
	"James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda",
	"David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
	"Thomas", "Sarah", "Charles", "Karen", "Christopher", "Lisa", "Daniel", "Nancy",
	"Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
	"Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
	"Kenneth", "Dorothy", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa",
	"Timothy", "Deborah", "Ronald", "Stephanie", "Edward", "Rebecca", "Jason", "Sharon",
	"Jeffrey", "Laura", "Ryan", "Cynthia", "Jacob", "Kathleen", "Gary", "Amy",
}

var lastNames = []string{
	"Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
	"Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
	"Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
	"Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young",
	"Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
	"Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
	"Carter", "Roberts", "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker",
	"Cruz", "Edwards", "Collins", "Reyes", "Stewart", "Morris", "Morales", "Murphy",
}

var departments = []string{
	"Engineering", "Product", "Design", "Marketing", "Sales", "Human Resources",
	"Finance", "Operations", "Customer Support", "Legal", "Research", "IT",
}

// Squads mapped by department
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

var supervisorTitles = []string{
	"Engineering Manager", "Product Manager", "Design Lead", "Marketing Director",
	"Sales Manager", "HR Manager", "Finance Director", "Operations Manager",
	"Support Lead", "Legal Counsel", "Research Director", "IT Manager",
}

var employeeTitles = []string{
	"Software Engineer", "Senior Software Engineer", "Product Designer", "UX Designer",
	"Marketing Specialist", "Sales Representative", "HR Coordinator", "Financial Analyst",
	"Customer Support Specialist", "Paralegal", "Research Analyst", "Systems Administrator",
	"Frontend Developer", "Backend Developer", "Full Stack Developer", "QA Engineer",
	"Data Analyst", "Business Analyst", "Technical Writer", "Project Coordinator",
}


func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	pool, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	if err := database.RunMigrations(pool); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	ctx := context.Background()
	rand.Seed(time.Now().UnixNano())

	// First, create some supervisors
	log.Println("Creating supervisors...")
	supervisorIDs := []int64{}

	for i := 0; i < 5; i++ {
		firstName := firstNames[rand.Intn(len(firstNames))]
		lastName := lastNames[rand.Intn(len(lastNames))]
		email := fmt.Sprintf("%s.%s.supervisor%d@example.com", toLowerCase(firstName), toLowerCase(lastName), i)
		department := departments[rand.Intn(len(departments))]
		squad := getRandomSquad(department)
		title := supervisorTitles[rand.Intn(len(supervisorTitles))]
		startDate := randomDate()

		query := `
			INSERT INTO users (email, first_name, last_name, role, title, department, squad, date_started)
			VALUES ($1, $2, $3, 'supervisor', $4, $5, $6, $7)
			ON CONFLICT (email) DO UPDATE SET
				first_name = EXCLUDED.first_name,
				last_name = EXCLUDED.last_name,
				squad = EXCLUDED.squad
			RETURNING id
		`

		var id int64
		err := pool.QueryRow(ctx, query, email, firstName, lastName, title, department, squad, startDate).Scan(&id)
		if err != nil {
			log.Printf("Failed to create supervisor: %v", err)
			continue
		}
		supervisorIDs = append(supervisorIDs, id)
		log.Printf("Created supervisor: %s %s (ID: %d)", firstName, lastName, id)
	}

	if len(supervisorIDs) == 0 {
		log.Fatal("No supervisors created, cannot seed employees")
	}

	// Now create employees under the supervisors
	log.Println("\nCreating employees...")
	employeeCount := 50

	for i := 0; i < employeeCount; i++ {
		firstName := firstNames[rand.Intn(len(firstNames))]
		lastName := lastNames[rand.Intn(len(lastNames))]
		email := fmt.Sprintf("%s.%s.%d@example.com", toLowerCase(firstName), toLowerCase(lastName), rand.Intn(10000))
		department := departments[rand.Intn(len(departments))]
		squad := getRandomSquad(department)
		startDate := randomDate()
		supervisorID := supervisorIDs[rand.Intn(len(supervisorIDs))]

		// 80% employees, 20% supervisors (who also report to other supervisors)
		role := "employee"
		var title string
		if rand.Float32() < 0.2 {
			role = "supervisor"
			title = supervisorTitles[rand.Intn(len(supervisorTitles))]
		} else {
			title = employeeTitles[rand.Intn(len(employeeTitles))]
		}

		query := `
			INSERT INTO users (email, first_name, last_name, role, title, department, squad, supervisor_id, date_started)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			ON CONFLICT (email) DO NOTHING
		`

		_, err := pool.Exec(ctx, query, email, firstName, lastName, role, title, department, squad, supervisorID, startDate)
		if err != nil {
			log.Printf("Failed to create employee: %v", err)
			continue
		}
		log.Printf("Created %s: %s %s", role, firstName, lastName)
	}

	// Count total users
	var count int
	err = pool.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		log.Printf("Failed to count users: %v", err)
	} else {
		log.Printf("\n✅ Seeding complete! Total users in database: %d", count)
	}
}

func toLowerCase(s string) string {
	result := ""
	for _, c := range s {
		if c >= 'A' && c <= 'Z' {
			result += string(c + 32)
		} else {
			result += string(c)
		}
	}
	return result
}

func randomDate() time.Time {
	// Random date in the last 5 years
	daysAgo := rand.Intn(365 * 5)
	return time.Now().AddDate(0, 0, -daysAgo)
}

func getRandomSquad(department string) string {
	squads, ok := squadsByDepartment[department]
	if !ok || len(squads) == 0 {
		return ""
	}
	return squads[rand.Intn(len(squads))]
}
