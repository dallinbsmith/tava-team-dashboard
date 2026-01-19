package graph

import (
	"strconv"

	"github.com/smith-dallin/manager-dashboard/internal/models"
)

func userToEmployee(u *models.User) *Employee {
	var supervisorID *string
	if u.SupervisorID != nil {
		s := strconv.FormatInt(*u.SupervisorID, 10)
		supervisorID = &s
	}

	// Convert squads from models.Squad to graph.Squad
	squads := make([]*Squad, len(u.Squads))
	for i, s := range u.Squads {
		squads[i] = &Squad{
			ID:   strconv.FormatInt(s.ID, 10),
			Name: s.Name,
		}
	}

	return &Employee{
		ID:           strconv.FormatInt(u.ID, 10),
		Auth0ID:      u.Auth0ID,
		Email:        u.Email,
		FirstName:    u.FirstName,
		LastName:     u.LastName,
		Role:         Role(u.Role),
		Title:        u.Title,
		Department:   u.Department,
		Squads:       squads,
		AvatarURL:    u.AvatarURL,
		SupervisorID: supervisorID,
		DateStarted:  u.DateStarted,
		CreatedAt:    u.CreatedAt,
		UpdatedAt:    u.UpdatedAt,
	}
}
