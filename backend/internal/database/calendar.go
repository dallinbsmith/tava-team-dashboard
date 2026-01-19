package database

import (
	"context"
	"fmt"
	"time"

	"github.com/smith-dallin/manager-dashboard/internal/models"
)

// CalendarRepository combines tasks, meetings, Jira issues, and time off into calendar events
type CalendarRepository struct {
	taskRepo    *TaskRepository
	meetingRepo *MeetingRepository
	timeOffRepo *TimeOffRepository
}

func NewCalendarRepository(taskRepo *TaskRepository, meetingRepo *MeetingRepository, timeOffRepo *TimeOffRepository) *CalendarRepository {
	return &CalendarRepository{
		taskRepo:    taskRepo,
		meetingRepo: meetingRepo,
		timeOffRepo: timeOffRepo,
	}
}

// TimeOffRepo returns the underlying time off repository
func (r *CalendarRepository) TimeOffRepo() *TimeOffRepository {
	return r.timeOffRepo
}

// GetEvents retrieves all calendar events for a user within a date range
// This combines tasks, meetings, and optionally Jira issues into a unified event list
func (r *CalendarRepository) GetEvents(ctx context.Context, user *models.User, start, end time.Time, jiraIssues []models.JiraIssue) ([]models.CalendarEvent, error) {
	var events []models.CalendarEvent

	// Get tasks
	tasks, err := r.taskRepo.GetVisibleTasks(ctx, user, start, end)
	if err != nil {
		return nil, fmt.Errorf("failed to get tasks: %w", err)
	}

	for i := range tasks {
		task := &tasks[i]
		events = append(events, models.CalendarEvent{
			ID:     fmt.Sprintf("task-%d", task.ID),
			Type:   models.CalendarEventTypeTask,
			Title:  task.Title,
			Start:  task.DueDate,
			End:    nil, // Tasks are all-day events
			AllDay: true,
			Task:   task,
		})
	}

	// Get meetings
	meetings, err := r.meetingRepo.GetVisibleMeetings(ctx, user, start, end)
	if err != nil {
		return nil, fmt.Errorf("failed to get meetings: %w", err)
	}

	// Expand recurring meetings
	expandedMeetings := r.meetingRepo.ExpandRecurringMeetings(meetings, start, end)

	for i := range expandedMeetings {
		meeting := &expandedMeetings[i]
		events = append(events, models.CalendarEvent{
			ID:      fmt.Sprintf("meeting-%d-%s", meeting.ID, meeting.StartTime.Format("20060102150405")),
			Type:    models.CalendarEventTypeMeeting,
			Title:   meeting.Title,
			Start:   meeting.StartTime,
			End:     &meeting.EndTime,
			AllDay:  false,
			Meeting: meeting,
		})
	}

	// Add Jira issues with due dates
	for i := range jiraIssues {
		issue := &jiraIssues[i]
		if issue.DueDate != nil {
			// Only include issues with due dates in the range
			if (issue.DueDate.After(start) || issue.DueDate.Equal(start)) &&
				(issue.DueDate.Before(end) || issue.DueDate.Equal(end)) {
				url := issue.URL
				events = append(events, models.CalendarEvent{
					ID:        fmt.Sprintf("jira-%s", issue.Key),
					Type:      models.CalendarEventTypeJira,
					Title:     fmt.Sprintf("[%s] %s", issue.Key, issue.Summary),
					Start:     *issue.DueDate,
					End:       nil, // Jira issues are all-day events
					AllDay:    true,
					URL:       &url,
					JiraIssue: issue,
				})
			}
		}
	}

	// Add time off events if repository is available
	if r.timeOffRepo != nil {
		timeOffEvents, err := r.GetTimeOffEvents(ctx, user, start, end)
		if err != nil {
			return nil, fmt.Errorf("failed to get time off events: %w", err)
		}
		events = append(events, timeOffEvents...)
	}

	return events, nil
}

// GetTimeOffEvents returns time off events for the current user and their team (if supervisor)
func (r *CalendarRepository) GetTimeOffEvents(ctx context.Context, user *models.User, start, end time.Time) ([]models.CalendarEvent, error) {
	var events []models.CalendarEvent

	// Get user's own approved time off
	status := models.TimeOffStatusApproved
	ownTimeOff, err := r.timeOffRepo.GetByUserID(ctx, user.ID, &status)
	if err != nil {
		return nil, fmt.Errorf("failed to get user's time off: %w", err)
	}

	for i := range ownTimeOff {
		to := &ownTimeOff[i]
		// Check if time off overlaps with the date range
		if r.timeOffOverlaps(to, start, end) {
			events = append(events, r.createTimeOffEvent(to, ""))
		}
	}

	// If user is supervisor or admin, also get their team's time off
	if user.IsSupervisorOrAdmin() {
		var teamTimeOff []models.TimeOffRequest
		var err error

		if user.IsAdmin() {
			// Admin: get all approved time off in date range
			teamTimeOff, err = r.timeOffRepo.GetApprovedByDateRange(ctx, 0, start, end)
			if err != nil {
				return nil, fmt.Errorf("failed to get all time off: %w", err)
			}
		} else {
			// Supervisor: get direct reports' time off
			teamTimeOff, err = r.timeOffRepo.GetTeamTimeOff(ctx, user.ID)
			if err != nil {
				return nil, fmt.Errorf("failed to get team time off: %w", err)
			}
		}

		for i := range teamTimeOff {
			to := &teamTimeOff[i]
			// Skip own time off (already added above)
			if to.UserID == user.ID {
				continue
			}
			// Check if time off overlaps with the date range
			if r.timeOffOverlaps(to, start, end) && to.Status == models.TimeOffStatusApproved {
				// Include user name in title for team members
				userName := ""
				if to.User != nil {
					userName = to.User.FirstName + " " + to.User.LastName
				}
				events = append(events, r.createTimeOffEvent(to, userName))
			}
		}
	}

	return events, nil
}

// timeOffOverlaps checks if a time off request overlaps with a date range
func (r *CalendarRepository) timeOffOverlaps(to *models.TimeOffRequest, start, end time.Time) bool {
	// Time off overlaps if it starts before range ends AND ends after range starts
	return to.StartDate.Before(end) && to.EndDate.After(start) ||
		to.StartDate.Equal(start) || to.EndDate.Equal(end) ||
		(to.StartDate.After(start) && to.EndDate.Before(end))
}

// createTimeOffEvent creates a calendar event from a time off request
func (r *CalendarRepository) createTimeOffEvent(to *models.TimeOffRequest, userName string) models.CalendarEvent {
	// Format title based on request type
	typeLabels := map[models.TimeOffType]string{
		models.TimeOffTypeVacation:    "Vacation",
		models.TimeOffTypeSick:        "Sick",
		models.TimeOffTypePersonal:    "Personal",
		models.TimeOffTypeBereavement: "Bereavement",
		models.TimeOffTypeJuryDuty:    "Jury Duty",
		models.TimeOffTypeOther:       "Time Off",
	}

	label, ok := typeLabels[to.RequestType]
	if !ok {
		label = "Time Off"
	}

	title := label
	if userName != "" {
		title = fmt.Sprintf("%s - %s", label, userName)
	}

	// End date for calendar event (add 1 day since end date is inclusive)
	endDate := to.EndDate.AddDate(0, 0, 1)

	return models.CalendarEvent{
		ID:             fmt.Sprintf("timeoff-%d", to.ID),
		Type:           models.CalendarEventTypeTimeOff,
		Title:          title,
		Start:          to.StartDate,
		End:            &endDate,
		AllDay:         true,
		TimeOffRequest: to,
	}
}

// TaskRepository returns the underlying task repository
func (r *CalendarRepository) TaskRepo() *TaskRepository {
	return r.taskRepo
}

// MeetingRepository returns the underlying meeting repository
func (r *CalendarRepository) MeetingRepo() *MeetingRepository {
	return r.meetingRepo
}
