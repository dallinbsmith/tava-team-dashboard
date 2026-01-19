package graph

import (
	"time"
)

type Role string

const (
	RoleSupervisor Role = "supervisor"
	RoleEmployee   Role = "employee"
)

func (r Role) IsValid() bool {
	switch r {
	case RoleSupervisor, RoleEmployee:
		return true
	}
	return false
}

func (r Role) String() string {
	return string(r)
}

type Squad struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Employee struct {
	ID           string     `json:"id"`
	Auth0ID      string     `json:"auth0_id"`
	Email        string     `json:"email"`
	FirstName    string     `json:"first_name"`
	LastName     string     `json:"last_name"`
	Role         Role       `json:"role"`
	Title        string     `json:"title"`
	Department   string     `json:"department"`
	Squads       []*Squad   `json:"squads"`
	AvatarURL    *string    `json:"avatar_url,omitempty"`
	SupervisorID *string    `json:"supervisor_id,omitempty"`
	DateStarted  *time.Time `json:"date_started,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type CreateEmployeeInput struct {
	Email        string   `json:"email"`
	FirstName    string   `json:"first_name"`
	LastName     string   `json:"last_name"`
	Role         Role     `json:"role"`
	Title        *string  `json:"title,omitempty"`
	Department   string   `json:"department"`
	AvatarURL    *string  `json:"avatar_url,omitempty"`
	SupervisorID *string  `json:"supervisor_id,omitempty"`
	SquadIDs     []string `json:"squad_ids,omitempty"`
}

type UpdateEmployeeInput struct {
	FirstName    *string  `json:"first_name,omitempty"`
	LastName     *string  `json:"last_name,omitempty"`
	Role         *Role    `json:"role,omitempty"`
	Title        *string  `json:"title,omitempty"`
	Department   *string  `json:"department,omitempty"`
	AvatarURL    *string  `json:"avatar_url,omitempty"`
	SupervisorID *string  `json:"supervisor_id,omitempty"`
	SquadIDs     []string `json:"squad_ids,omitempty"`
}
