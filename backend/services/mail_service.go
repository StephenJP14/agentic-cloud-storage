package services

import (
	"fmt"
	"net/smtp"
	"strings"

	"gitlab.com/zyrex1/landing-page/helper/dto"
)

type SMTPConfig struct {
	Host  string
	Port  string
	From  string
	NoTLS bool
}

type EmailNotifier struct {
	addr string
	from string
}

func NewEmailNotifier(cfg SMTPConfig) *EmailNotifier {
	return &EmailNotifier{
		addr: fmt.Sprintf("%s:%s", cfg.Host, cfg.Port),
		from: cfg.From,
	}
}

// Public API
func (e *EmailNotifier) PushEmailNotification(
	recipients []string,
	service dto.EmailServiceRequest,
) error {
	subject := "New Service Request Submitted"
	body := buildEmailBody(service)

	msg := buildMessage(e.from, recipients, subject, body)

	return e.sendEmail(recipients, subject, body, msg)
}

func buildEmailBody(service dto.EmailServiceRequest) string {
	formattedDate := service.Date.Format("Monday, 02 January 2006")

	return fmt.Sprintf(`Dear CS Team,

This is an automated notification from the system.

A new service request has been submitted with the following details:
  TicketID       : %s
  Complaint      : %s
  Service Date   : %s

Please review and respond to this request as soon as possible.

---
This is an automated message. Please do not reply to this email.
`,
		service.TicketID,
		service.Complains,
		formattedDate,
	)
}

func buildMessage(from string, to []string, subject, body string) string {
	headers := map[string]string{
		"From":         from,
		"To":           strings.Join(to, ", "),
		"Subject":      subject,
		"MIME-Version": "1.0",
		"Content-Type": "text/plain; charset=UTF-8",
	}

	var msg strings.Builder
	for k, v := range headers {
		msg.WriteString(fmt.Sprintf("%s: %s\r\n", k, v))
	}
	msg.WriteString("\r\n")
	msg.WriteString(body)

	return msg.String()
}

func (e *EmailNotifier) sendEmail(recipients []string, subject, body, msg string) error {
	addr := e.addr

	client, err := smtp.Dial(addr)
	if err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}
	defer client.Close()

	if err = client.Mail(e.from); err != nil {
		return fmt.Errorf("MAIL FROM failed: %w", err)
	}

	// Recipients
	for _, r := range recipients {
		if err = client.Rcpt(r); err != nil {
			return fmt.Errorf("RCPT TO %s failed: %w", r, err)
		}
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("DATA failed: %w", err)
	}

	if _, err = w.Write([]byte(msg)); err != nil {
		return fmt.Errorf("write failed: %w", err)
	}

	if err = w.Close(); err != nil {
		return fmt.Errorf("close writer failed: %w", err)
	}

	return client.Quit()
}
