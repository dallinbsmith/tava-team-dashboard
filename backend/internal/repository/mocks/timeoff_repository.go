package mocks

import (
	"context"
	"errors"
	"time"

	"github.com/smith-dallin/manager-dashboard/internal/models"
)

// MockTimeOffRepository is a mock implementation of TimeOffRepository for testing
type MockTimeOffRepository struct {
	Requests map[int64]*models.TimeOffRequest
	NextID   int64

	// Function hooks for custom behavior
	CreateFunc                       func(ctx context.Context, userID int64, req *models.CreateTimeOffRequestInput) (*models.TimeOffRequest, error)
	GetByIDFunc                      func(ctx context.Context, id int64) (*models.TimeOffRequest, error)
	GetByIDWithUserFunc              func(ctx context.Context, id int64) (*models.TimeOffRequest, error)
	GetByUserIDFunc                  func(ctx context.Context, userID int64, status *models.TimeOffStatus) ([]models.TimeOffRequest, error)
	GetVisibleRequestsFunc           func(ctx context.Context, user *models.User, status *models.TimeOffStatus) ([]models.TimeOffRequest, error)
	GetPendingForSupervisorFunc      func(ctx context.Context, supervisorID int64) ([]models.TimeOffRequest, error)
	GetAllPendingFunc                func(ctx context.Context) ([]models.TimeOffRequest, error)
	ReviewFunc                       func(ctx context.Context, id int64, reviewerID int64, req *models.ReviewTimeOffRequestInput) error
	CancelFunc                       func(ctx context.Context, id int64, userID int64) error
	GetApprovedByDateRangeFunc       func(ctx context.Context, userID int64, start, end time.Time) ([]models.TimeOffRequest, error)
	GetApprovedForUsersFunc          func(ctx context.Context, userIDs []int64, start, end time.Time) ([]models.TimeOffRequest, error)
	GetTeamTimeOffFunc               func(ctx context.Context, supervisorID int64) ([]models.TimeOffRequest, error)
	GetApprovedFutureTimeOffByUserFunc func(ctx context.Context, userID int64) ([]models.TimeOffRequest, error)
	GetAllApprovedFunc               func(ctx context.Context) ([]models.TimeOffRequest, error)
}

// NewMockTimeOffRepository creates a new mock time off repository
func NewMockTimeOffRepository() *MockTimeOffRepository {
	return &MockTimeOffRepository{
		Requests: make(map[int64]*models.TimeOffRequest),
		NextID:   1,
	}
}

func (m *MockTimeOffRepository) Create(ctx context.Context, userID int64, req *models.CreateTimeOffRequestInput) (*models.TimeOffRequest, error) {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, userID, req)
	}
	startDate, _ := time.Parse("2006-01-02", req.StartDate)
	endDate, _ := time.Parse("2006-01-02", req.EndDate)
	request := &models.TimeOffRequest{
		ID:          m.NextID,
		UserID:      userID,
		StartDate:   startDate,
		EndDate:     endDate,
		RequestType: req.RequestType,
		Reason:      req.Reason,
		Status:      models.TimeOffStatusPending,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	m.NextID++
	m.Requests[request.ID] = request
	return request, nil
}

func (m *MockTimeOffRepository) GetByID(ctx context.Context, id int64) (*models.TimeOffRequest, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	if req, ok := m.Requests[id]; ok {
		return req, nil
	}
	return nil, nil
}

func (m *MockTimeOffRepository) GetByIDWithUser(ctx context.Context, id int64) (*models.TimeOffRequest, error) {
	if m.GetByIDWithUserFunc != nil {
		return m.GetByIDWithUserFunc(ctx, id)
	}
	if req, ok := m.Requests[id]; ok {
		return req, nil
	}
	return nil, nil
}

func (m *MockTimeOffRepository) GetByUserID(ctx context.Context, userID int64, status *models.TimeOffStatus) ([]models.TimeOffRequest, error) {
	if m.GetByUserIDFunc != nil {
		return m.GetByUserIDFunc(ctx, userID, status)
	}
	var requests []models.TimeOffRequest
	for _, req := range m.Requests {
		if req.UserID == userID {
			if status == nil || req.Status == *status {
				requests = append(requests, *req)
			}
		}
	}
	return requests, nil
}

func (m *MockTimeOffRepository) GetVisibleRequests(ctx context.Context, user *models.User, status *models.TimeOffStatus) ([]models.TimeOffRequest, error) {
	if m.GetVisibleRequestsFunc != nil {
		return m.GetVisibleRequestsFunc(ctx, user, status)
	}
	var requests []models.TimeOffRequest
	for _, req := range m.Requests {
		if status == nil || req.Status == *status {
			requests = append(requests, *req)
		}
	}
	return requests, nil
}

func (m *MockTimeOffRepository) GetPendingForSupervisor(ctx context.Context, supervisorID int64) ([]models.TimeOffRequest, error) {
	if m.GetPendingForSupervisorFunc != nil {
		return m.GetPendingForSupervisorFunc(ctx, supervisorID)
	}
	var requests []models.TimeOffRequest
	for _, req := range m.Requests {
		if req.Status == models.TimeOffStatusPending {
			requests = append(requests, *req)
		}
	}
	return requests, nil
}

func (m *MockTimeOffRepository) GetAllPending(ctx context.Context) ([]models.TimeOffRequest, error) {
	if m.GetAllPendingFunc != nil {
		return m.GetAllPendingFunc(ctx)
	}
	var requests []models.TimeOffRequest
	for _, req := range m.Requests {
		if req.Status == models.TimeOffStatusPending {
			requests = append(requests, *req)
		}
	}
	return requests, nil
}

func (m *MockTimeOffRepository) Review(ctx context.Context, id int64, reviewerID int64, req *models.ReviewTimeOffRequestInput) error {
	if m.ReviewFunc != nil {
		return m.ReviewFunc(ctx, id, reviewerID, req)
	}
	request, ok := m.Requests[id]
	if !ok {
		return errors.New("time off request not found")
	}
	if request.Status != models.TimeOffStatusPending {
		return errors.New("can only review pending requests")
	}
	request.Status = req.Status
	request.ReviewerID = &reviewerID
	request.UpdatedAt = time.Now()
	return nil
}

func (m *MockTimeOffRepository) Cancel(ctx context.Context, id int64, userID int64) error {
	if m.CancelFunc != nil {
		return m.CancelFunc(ctx, id, userID)
	}
	request, ok := m.Requests[id]
	if !ok {
		return errors.New("time off request not found")
	}
	if request.UserID != userID {
		return errors.New("can only cancel own requests")
	}
	if request.Status != models.TimeOffStatusPending {
		return errors.New("can only cancel pending requests")
	}
	request.Status = models.TimeOffStatusCancelled
	request.UpdatedAt = time.Now()
	return nil
}

func (m *MockTimeOffRepository) GetApprovedByDateRange(ctx context.Context, userID int64, start, end time.Time) ([]models.TimeOffRequest, error) {
	if m.GetApprovedByDateRangeFunc != nil {
		return m.GetApprovedByDateRangeFunc(ctx, userID, start, end)
	}
	var requests []models.TimeOffRequest
	for _, req := range m.Requests {
		if req.UserID == userID && req.Status == models.TimeOffStatusApproved {
			if !req.EndDate.Before(start) && !req.StartDate.After(end) {
				requests = append(requests, *req)
			}
		}
	}
	return requests, nil
}

func (m *MockTimeOffRepository) GetApprovedForUsers(ctx context.Context, userIDs []int64, start, end time.Time) ([]models.TimeOffRequest, error) {
	if m.GetApprovedForUsersFunc != nil {
		return m.GetApprovedForUsersFunc(ctx, userIDs, start, end)
	}
	userIDSet := make(map[int64]bool)
	for _, id := range userIDs {
		userIDSet[id] = true
	}
	var requests []models.TimeOffRequest
	for _, req := range m.Requests {
		if userIDSet[req.UserID] && req.Status == models.TimeOffStatusApproved {
			if !req.EndDate.Before(start) && !req.StartDate.After(end) {
				requests = append(requests, *req)
			}
		}
	}
	return requests, nil
}

func (m *MockTimeOffRepository) GetTeamTimeOff(ctx context.Context, supervisorID int64) ([]models.TimeOffRequest, error) {
	if m.GetTeamTimeOffFunc != nil {
		return m.GetTeamTimeOffFunc(ctx, supervisorID)
	}
	var requests []models.TimeOffRequest
	for _, req := range m.Requests {
		if req.Status == models.TimeOffStatusApproved {
			requests = append(requests, *req)
		}
	}
	return requests, nil
}

func (m *MockTimeOffRepository) GetApprovedFutureTimeOffByUser(ctx context.Context, userID int64) ([]models.TimeOffRequest, error) {
	if m.GetApprovedFutureTimeOffByUserFunc != nil {
		return m.GetApprovedFutureTimeOffByUserFunc(ctx, userID)
	}
	now := time.Now()
	var requests []models.TimeOffRequest
	for _, req := range m.Requests {
		if req.UserID == userID && req.Status == models.TimeOffStatusApproved && req.StartDate.After(now) {
			requests = append(requests, *req)
		}
	}
	return requests, nil
}

func (m *MockTimeOffRepository) GetAllApproved(ctx context.Context) ([]models.TimeOffRequest, error) {
	if m.GetAllApprovedFunc != nil {
		return m.GetAllApprovedFunc(ctx)
	}
	var requests []models.TimeOffRequest
	for _, req := range m.Requests {
		if req.Status == models.TimeOffStatusApproved {
			requests = append(requests, *req)
		}
	}
	return requests, nil
}

// AddRequest is a helper method for setting up test data
func (m *MockTimeOffRepository) AddRequest(req *models.TimeOffRequest) {
	m.Requests[req.ID] = req
	if req.ID >= m.NextID {
		m.NextID = req.ID + 1
	}
}
