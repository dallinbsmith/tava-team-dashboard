package services

import (
	"context"
	"fmt"
	"time"

	"github.com/resend/resend-go/v2"
	"github.com/smith-dallin/manager-dashboard/config"
)

// EmailService handles sending emails via Resend
type EmailService struct {
	client      *resend.Client
	fromEmail   string
	fromName    string
	frontendURL string
	timeout     time.Duration
}

// NewEmailService creates a new email service with Resend
func NewEmailService(cfg *config.Config) *EmailService {
	client := resend.NewClient(cfg.ResendAPIKey)
	return &EmailService{
		client:      client,
		fromEmail:   cfg.ResendFromEmail,
		fromName:    cfg.ResendFromName,
		frontendURL: cfg.FrontendURL,
		timeout:     time.Duration(cfg.EmailTimeoutSecs) * time.Second,
	}
}

// SendInvitation sends an invitation email to the specified email address
func (s *EmailService) SendInvitation(ctx context.Context, email, token, role, inviterName string) error {
	inviteLink := fmt.Sprintf("%s/invite/%s", s.frontendURL, token)

	subject := fmt.Sprintf("%s has invited you to join Manager Dashboard", inviterName)

	htmlContent := s.buildInvitationHTML(inviterName, role, inviteLink)
	textContent := s.buildInvitationText(inviterName, role, inviteLink)

	params := &resend.SendEmailRequest{
		From:    fmt.Sprintf("%s <%s>", s.fromName, s.fromEmail),
		To:      []string{email},
		Subject: subject,
		Html:    htmlContent,
		Text:    textContent,
	}

	// Execute email send with timeout to prevent indefinite blocking
	// The Resend SDK doesn't support context cancellation, so we use a goroutine pattern
	type result struct {
		err error
	}
	resultCh := make(chan result, 1)

	go func() {
		_, err := s.client.Emails.Send(params)
		resultCh <- result{err: err}
	}()

	// Wait for either completion, timeout, or context cancellation
	select {
	case res := <-resultCh:
		if res.err != nil {
			return fmt.Errorf("failed to send invitation email: %w", res.err)
		}
		return nil
	case <-time.After(s.timeout):
		return fmt.Errorf("email send timed out after %v", s.timeout)
	case <-ctx.Done():
		return fmt.Errorf("email send cancelled: %w", ctx.Err())
	}
}

// buildInvitationHTML creates the HTML email template
func (s *EmailService) buildInvitationHTML(inviterName, role, inviteLink string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited!</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>%s</strong> has invited you to join <strong>Manager Dashboard</strong> as a <strong>%s</strong>.
    </p>

    <p style="font-size: 14px; color: #666; margin-bottom: 25px;">
      Click the button below to accept your invitation and create your account.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="%s" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Accept Invitation
      </a>
    </div>

    <p style="font-size: 13px; color: #888; margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee;">
      This invitation will expire in <strong>7 days</strong>.
    </p>

    <p style="font-size: 12px; color: #999; margin-top: 15px;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="%s" style="color: #667eea; word-break: break-all;">%s</a>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>This email was sent by Manager Dashboard</p>
  </div>
</body>
</html>`, inviterName, role, inviteLink, inviteLink, inviteLink)
}

// buildInvitationText creates the plain text email content
func (s *EmailService) buildInvitationText(inviterName, role, inviteLink string) string {
	return fmt.Sprintf(`You're Invited to Manager Dashboard!

%s has invited you to join Manager Dashboard as a %s.

To accept your invitation and create your account, visit the following link:

%s

This invitation will expire in 7 days.

---
This email was sent by Manager Dashboard`, inviterName, role, inviteLink)
}

// SendPasswordReset sends a password reset email to the specified email address
func (s *EmailService) SendPasswordReset(ctx context.Context, email, resetLink string) error {
	subject := "Set Your Password - Manager Dashboard"

	htmlContent := s.buildPasswordResetHTML(resetLink)
	textContent := s.buildPasswordResetText(resetLink)

	params := &resend.SendEmailRequest{
		From:    fmt.Sprintf("%s <%s>", s.fromName, s.fromEmail),
		To:      []string{email},
		Subject: subject,
		Html:    htmlContent,
		Text:    textContent,
	}

	type result struct {
		err error
	}
	resultCh := make(chan result, 1)

	go func() {
		_, err := s.client.Emails.Send(params)
		resultCh <- result{err: err}
	}()

	select {
	case res := <-resultCh:
		if res.err != nil {
			return fmt.Errorf("failed to send password reset email: %w", res.err)
		}
		return nil
	case <-time.After(s.timeout):
		return fmt.Errorf("email send timed out after %v", s.timeout)
	case <-ctx.Done():
		return fmt.Errorf("email send cancelled: %w", ctx.Err())
	}
}

// buildPasswordResetHTML creates the HTML email template for password reset
func (s *EmailService) buildPasswordResetHTML(resetLink string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Set Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Set Your Password</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Your account has been created on <strong>Manager Dashboard</strong>.
    </p>

    <p style="font-size: 14px; color: #666; margin-bottom: 25px;">
      Click the button below to set your password and complete your account setup.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="%s" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Set Password
      </a>
    </div>

    <p style="font-size: 13px; color: #888; margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee;">
      This link will expire in <strong>24 hours</strong>.
    </p>

    <p style="font-size: 12px; color: #999; margin-top: 15px;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="%s" style="color: #667eea; word-break: break-all;">%s</a>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>This email was sent by Manager Dashboard</p>
  </div>
</body>
</html>`, resetLink, resetLink, resetLink)
}

// buildPasswordResetText creates the plain text email content for password reset
func (s *EmailService) buildPasswordResetText(resetLink string) string {
	return fmt.Sprintf(`Set Your Password - Manager Dashboard

Your account has been created on Manager Dashboard.

To set your password and complete your account setup, visit the following link:

%s

This link will expire in 24 hours.

---
This email was sent by Manager Dashboard`, resetLink)
}
