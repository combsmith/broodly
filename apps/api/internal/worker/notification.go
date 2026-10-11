package worker

import (
	"context"
	"fmt"
	"time"
)

// NotificationPriority classifies notification urgency.
type NotificationPriority string

const (
	NotificationPriorityHigh   NotificationPriority = "high"
	NotificationPriorityNormal NotificationPriority = "normal"
	NotificationPriorityLow    NotificationPriority = "low"
)

// NotificationEvent represents a notification to be dispatched.
type NotificationEvent struct {
	UserID     string               `json:"userId"`
	Title      string               `json:"title"`
	Body       string               `json:"body"`
	NextStep   string               `json:"nextStep"`
	DeepLink   string               `json:"deepLink"`
	Priority   NotificationPriority `json:"priority"`
	Category   string               `json:"category"`
	CreatedAt  time.Time            `json:"createdAt"`
}

// NotificationPreferences holds user notification configuration.
type NotificationPreferences struct {
	Enabled             bool   `json:"enabled"`
	QuietHoursStart     string `json:"quietHoursStart"`
	QuietHoursEnd       string `json:"quietHoursEnd"`
	EscalationEnabled   bool   `json:"escalationEnabled"`
}

// NotificationDispatcher sends push notifications.
type NotificationDispatcher struct {
	maxRetries int
}

// NewNotificationDispatcher creates a new dispatcher.
func NewNotificationDispatcher() *NotificationDispatcher {
	return &NotificationDispatcher{
		maxRetries: 3,
	}
}

// ShouldSuppress determines if a notification should be suppressed based on preferences.
func (d *NotificationDispatcher) ShouldSuppress(
	event NotificationEvent,
	prefs NotificationPreferences,
	currentTime time.Time,
) bool {
	if !prefs.Enabled && event.Priority != NotificationPriorityHigh {
		return true
	}

	if prefs.QuietHoursStart != "" && prefs.QuietHoursEnd != "" {
		hour := currentTime.Hour()
		start, errStart := parseHour(prefs.QuietHoursStart)
		end, errEnd := parseHour(prefs.QuietHoursEnd)
		// Treat invalid/out-of-range quiet hour config as "no quiet hours"
		if errStart != nil || errEnd != nil {
			return false
		}

		if start <= end {
			if hour >= start && hour < end && event.Priority != NotificationPriorityHigh {
				return true
			}
		} else {
			if (hour >= start || hour < end) && event.Priority != NotificationPriorityHigh {
				return true
			}
		}
	}

	return false
}

// Dispatch sends a notification. In production, calls Firebase Cloud Messaging.
func (d *NotificationDispatcher) Dispatch(_ context.Context, event NotificationEvent) error {
	if event.UserID == "" {
		return fmt.Errorf("userID is required")
	}
	if event.Title == "" {
		return fmt.Errorf("title is required")
	}

	// In production: call FCM API
	return nil
}

// ShouldEscalate determines if a notification should be escalated based on age and priority.
func (d *NotificationDispatcher) ShouldEscalate(
	event NotificationEvent,
	prefs NotificationPreferences,
	unacknowledgedDuration time.Duration,
) bool {
	if !prefs.EscalationEnabled {
		return false
	}

	switch event.Priority {
	case NotificationPriorityHigh:
		return unacknowledgedDuration >= 2*time.Hour
	case NotificationPriorityNormal:
		return unacknowledgedDuration >= 24*time.Hour
	default:
		return false
	}
}

func parseHour(s string) (int, error) {
	var h int
	n, err := fmt.Sscanf(s, "%d", &h)
	if err != nil || n != 1 {
		return 0, fmt.Errorf("invalid hour %q: must be an integer", s)
	}
	if h < 0 || h > 23 {
		return 0, fmt.Errorf("hour %d out of range [0, 23]", h)
	}
	return h, nil
}
