package mocks

import (
	"context"
	"errors"
	"time"

	"github.com/smith-dallin/manager-dashboard/internal/models"
)

// MockMeetingRepository is a mock implementation of MeetingRepository for testing
type MockMeetingRepository struct {
	Meetings  map[int64]*models.Meeting
	Attendees map[int64][]models.MeetingAttendee
	NextID    int64

	// Function hooks for custom behavior
	CreateFunc                 func(ctx context.Context, req *models.CreateMeetingRequest, createdByID int64) (*models.Meeting, error)
	GetByIDFunc                func(ctx context.Context, id int64) (*models.Meeting, error)
	GetAttendeesFunc           func(ctx context.Context, meetingID int64) ([]models.MeetingAttendee, error)
	UpdateFunc                 func(ctx context.Context, id int64, req *models.UpdateMeetingRequest) (*models.Meeting, error)
	DeleteFunc                 func(ctx context.Context, id int64) error
	RespondToMeetingFunc       func(ctx context.Context, meetingID int64, userID int64, response models.ResponseStatus) error
	GetByDateRangeFunc         func(ctx context.Context, userID int64, start, end time.Time) ([]models.Meeting, error)
	GetAllByDateRangeFunc      func(ctx context.Context, start, end time.Time) ([]models.Meeting, error)
	GetVisibleMeetingsFunc     func(ctx context.Context, user *models.User, start, end time.Time) ([]models.Meeting, error)
	ExpandRecurringMeetingsFunc func(meetings []models.Meeting, start, end time.Time) []models.Meeting
	IsAttendeeFunc             func(ctx context.Context, meetingID, userID int64) (bool, error)
}

// NewMockMeetingRepository creates a new mock meeting repository
func NewMockMeetingRepository() *MockMeetingRepository {
	return &MockMeetingRepository{
		Meetings:  make(map[int64]*models.Meeting),
		Attendees: make(map[int64][]models.MeetingAttendee),
		NextID:    1,
	}
}

func (m *MockMeetingRepository) Create(ctx context.Context, req *models.CreateMeetingRequest, createdByID int64) (*models.Meeting, error) {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, req, createdByID)
	}
	meeting := &models.Meeting{
		ID:          m.NextID,
		Title:       req.Title,
		Description: req.Description,
		StartTime:   req.StartTime,
		EndTime:     req.EndTime,
		CreatedByID: createdByID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	m.NextID++
	m.Meetings[meeting.ID] = meeting

	// Add attendees if specified
	if len(req.AttendeeIDs) > 0 {
		for _, userID := range req.AttendeeIDs {
			m.Attendees[meeting.ID] = append(m.Attendees[meeting.ID], models.MeetingAttendee{
				MeetingID:      meeting.ID,
				UserID:         userID,
				ResponseStatus: models.ResponseStatusPending,
			})
		}
	}
	return meeting, nil
}

func (m *MockMeetingRepository) GetByID(ctx context.Context, id int64) (*models.Meeting, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	if meeting, ok := m.Meetings[id]; ok {
		return meeting, nil
	}
	return nil, errors.New("meeting not found")
}

func (m *MockMeetingRepository) GetAttendees(ctx context.Context, meetingID int64) ([]models.MeetingAttendee, error) {
	if m.GetAttendeesFunc != nil {
		return m.GetAttendeesFunc(ctx, meetingID)
	}
	return m.Attendees[meetingID], nil
}

func (m *MockMeetingRepository) Update(ctx context.Context, id int64, req *models.UpdateMeetingRequest) (*models.Meeting, error) {
	if m.UpdateFunc != nil {
		return m.UpdateFunc(ctx, id, req)
	}
	meeting, ok := m.Meetings[id]
	if !ok {
		return nil, errors.New("meeting not found")
	}
	if req.Title != nil {
		meeting.Title = *req.Title
	}
	if req.Description != nil {
		meeting.Description = req.Description
	}
	if req.StartTime != nil {
		meeting.StartTime = *req.StartTime
	}
	if req.EndTime != nil {
		meeting.EndTime = *req.EndTime
	}
	meeting.UpdatedAt = time.Now()
	return meeting, nil
}

func (m *MockMeetingRepository) Delete(ctx context.Context, id int64) error {
	if m.DeleteFunc != nil {
		return m.DeleteFunc(ctx, id)
	}
	if _, ok := m.Meetings[id]; !ok {
		return errors.New("meeting not found")
	}
	delete(m.Meetings, id)
	delete(m.Attendees, id)
	return nil
}

func (m *MockMeetingRepository) RespondToMeeting(ctx context.Context, meetingID int64, userID int64, response models.ResponseStatus) error {
	if m.RespondToMeetingFunc != nil {
		return m.RespondToMeetingFunc(ctx, meetingID, userID, response)
	}
	attendees := m.Attendees[meetingID]
	for i, att := range attendees {
		if att.UserID == userID {
			attendees[i].ResponseStatus = response
			return nil
		}
	}
	return errors.New("user is not an attendee")
}

func (m *MockMeetingRepository) GetByDateRange(ctx context.Context, userID int64, start, end time.Time) ([]models.Meeting, error) {
	if m.GetByDateRangeFunc != nil {
		return m.GetByDateRangeFunc(ctx, userID, start, end)
	}
	var meetings []models.Meeting
	for _, meeting := range m.Meetings {
		if meeting.CreatedByID == userID || m.isUserAttendee(meeting.ID, userID) {
			if !meeting.EndTime.Before(start) && !meeting.StartTime.After(end) {
				meetings = append(meetings, *meeting)
			}
		}
	}
	return meetings, nil
}

func (m *MockMeetingRepository) GetAllByDateRange(ctx context.Context, start, end time.Time) ([]models.Meeting, error) {
	if m.GetAllByDateRangeFunc != nil {
		return m.GetAllByDateRangeFunc(ctx, start, end)
	}
	var meetings []models.Meeting
	for _, meeting := range m.Meetings {
		if !meeting.EndTime.Before(start) && !meeting.StartTime.After(end) {
			meetings = append(meetings, *meeting)
		}
	}
	return meetings, nil
}

func (m *MockMeetingRepository) GetVisibleMeetings(ctx context.Context, user *models.User, start, end time.Time) ([]models.Meeting, error) {
	if m.GetVisibleMeetingsFunc != nil {
		return m.GetVisibleMeetingsFunc(ctx, user, start, end)
	}
	var meetings []models.Meeting
	for _, meeting := range m.Meetings {
		if !meeting.EndTime.Before(start) && !meeting.StartTime.After(end) {
			meetings = append(meetings, *meeting)
		}
	}
	return meetings, nil
}

func (m *MockMeetingRepository) ExpandRecurringMeetings(meetings []models.Meeting, start, end time.Time) []models.Meeting {
	if m.ExpandRecurringMeetingsFunc != nil {
		return m.ExpandRecurringMeetingsFunc(meetings, start, end)
	}
	// For non-recurring meetings, just return as-is
	return meetings
}

func (m *MockMeetingRepository) IsAttendee(ctx context.Context, meetingID, userID int64) (bool, error) {
	if m.IsAttendeeFunc != nil {
		return m.IsAttendeeFunc(ctx, meetingID, userID)
	}
	return m.isUserAttendee(meetingID, userID), nil
}

func (m *MockMeetingRepository) isUserAttendee(meetingID, userID int64) bool {
	for _, att := range m.Attendees[meetingID] {
		if att.UserID == userID {
			return true
		}
	}
	return false
}

// AddMeeting is a helper method for setting up test data
func (m *MockMeetingRepository) AddMeeting(meeting *models.Meeting) {
	m.Meetings[meeting.ID] = meeting
	if meeting.ID >= m.NextID {
		m.NextID = meeting.ID + 1
	}
}

// AddAttendee is a helper method for setting up test data
func (m *MockMeetingRepository) AddAttendee(meetingID int64, userID int64, response models.ResponseStatus) {
	m.Attendees[meetingID] = append(m.Attendees[meetingID], models.MeetingAttendee{
		MeetingID:      meetingID,
		UserID:         userID,
		ResponseStatus: response,
	})
}
