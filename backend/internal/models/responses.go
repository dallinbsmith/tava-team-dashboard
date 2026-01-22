package models

import "time"

// UserResponse is a DTO for API responses that excludes sensitive internal fields.
// This follows the "deny by default" principle - only expose fields the client needs.
type UserResponse struct {
	ID           int64      `json:"id"`
	Email        string     `json:"email"`
	FirstName    string     `json:"first_name"`
	LastName     string     `json:"last_name"`
	Role         Role       `json:"role"`
	Title        string     `json:"title"`
	Department   string     `json:"department"`
	Squads       []Squad    `json:"squads"`
	AvatarURL    *string    `json:"avatar_url,omitempty"`
	SupervisorID *int64     `json:"supervisor_id,omitempty"`
	DateStarted  *time.Time `json:"date_started,omitempty"`
	IsActive     bool       `json:"is_active"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	// Jira status (only expose whether configured, not credentials)
	JiraAccountID *string `json:"jira_account_id,omitempty"`
}

// ToUserResponse converts a User model to a UserResponse DTO.
// This strips out sensitive fields like Auth0ID and Jira credentials.
func (u *User) ToUserResponse() *UserResponse {
	if u == nil {
		return nil
	}
	return &UserResponse{
		ID:            u.ID,
		Email:         u.Email,
		FirstName:     u.FirstName,
		LastName:      u.LastName,
		Role:          u.Role,
		Title:         u.Title,
		Department:    u.Department,
		Squads:        u.Squads,
		AvatarURL:     u.AvatarURL,
		SupervisorID:  u.SupervisorID,
		DateStarted:   u.DateStarted,
		IsActive:      u.IsActive,
		CreatedAt:     u.CreatedAt,
		UpdatedAt:     u.UpdatedAt,
		JiraAccountID: u.JiraAccountID,
	}
}

// ToUserResponses converts a slice of User models to UserResponse DTOs.
func ToUserResponses(users []User) []UserResponse {
	if users == nil {
		return nil
	}
	responses := make([]UserResponse, len(users))
	for i := range users {
		responses[i] = *users[i].ToUserResponse()
	}
	return responses
}

// InvitationResponse is a DTO for invitation API responses.
// Token is intentionally omitted - it should only be sent via email.
type InvitationResponse struct {
	ID          int64            `json:"id"`
	Email       string           `json:"email"`
	Role        Role             `json:"role"`
	Status      InvitationStatus `json:"status"`
	Department  string           `json:"department,omitempty"`
	SquadIDs    []int64          `json:"squad_ids,omitempty"`
	InvitedByID int64            `json:"invited_by_id"`
	InvitedBy   *UserResponse    `json:"invited_by,omitempty"`
	ExpiresAt   time.Time        `json:"expires_at"`
	AcceptedAt  *time.Time       `json:"accepted_at,omitempty"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
}

// ToInvitationResponse converts an Invitation model to an InvitationResponse DTO.
// This strips out the sensitive token field.
func (i *Invitation) ToInvitationResponse() *InvitationResponse {
	if i == nil {
		return nil
	}
	resp := &InvitationResponse{
		ID:          i.ID,
		Email:       i.Email,
		Role:        i.Role,
		Status:      i.Status,
		Department:  i.Department,
		SquadIDs:    i.SquadIDs,
		InvitedByID: i.InvitedByID,
		ExpiresAt:   i.ExpiresAt,
		AcceptedAt:  i.AcceptedAt,
		CreatedAt:   i.CreatedAt,
		UpdatedAt:   i.UpdatedAt,
	}
	if i.InvitedBy != nil {
		resp.InvitedBy = i.InvitedBy.ToUserResponse()
	}
	return resp
}

// ToInvitationResponses converts a slice of Invitation models to InvitationResponse DTOs.
func ToInvitationResponses(invitations []Invitation) []InvitationResponse {
	if invitations == nil {
		return nil
	}
	responses := make([]InvitationResponse, len(invitations))
	for i := range invitations {
		responses[i] = *invitations[i].ToInvitationResponse()
	}
	return responses
}
