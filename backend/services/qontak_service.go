package services

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"gitlab.com/zyrex1/landing-page/models"
)

type QontakMessageType string

const (
	MessageTypeConfirmation QontakMessageType = "confirmation"
	MessageTypeConfirmed    QontakMessageType = "confirmed"
	MessageTypeFollowupNo   QontakMessageType = "followupNo"
)

type QontakService interface {
	SendMessage(service models.CustomerService, messageType QontakMessageType) error
	FetchMekari(method string, pathWithQuery string, payload interface{}) (*http.Response, error)
	ValidatePhoneNumber(phone string) (bool, error)
}

type qontakService struct{}

func NewQontakService() QontakService {
	return &qontakService{}
}

func formatPhoneNumber(phone string) string {
	phone = strings.TrimSpace(phone)
	if strings.HasPrefix(phone, "0") {
		return "62" + phone[1:]
	}
	return phone
}

func (s *qontakService) ValidatePhoneNumber(phone string) (bool, error) {
	url := "https://service-chat.qontak.com/api/open/v1/broadcasts/contacts"
	token := "Bearer " + os.Getenv("QONTAK_API_TOKEN")
	channelID := os.Getenv("QONTAK_CHANNEL_INTEGRATION_ID")

	// 1. Pre-validation manual: WhatsApp minimal 8-9 digit
	cleanPhone := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, phone)

	if len(cleanPhone) < 9 {
		return false, nil
	}

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	formattedPhone := formatPhoneNumber(phone)
	if !strings.HasPrefix(formattedPhone, "+") {
		formattedPhone = "+" + formattedPhone
	}

	_ = writer.WriteField("phone_numbers[]", formattedPhone)
	_ = writer.WriteField("channel_integration_id", channelID)
	writer.Close()

	req, err := http.NewRequest("POST", url, body)
	if err != nil {
		return false, err
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", token)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return false, fmt.Errorf("validation api returned status %d", resp.StatusCode)
	}

	var result struct {
		Data struct {
			Contacts []struct {
				Status string `json:"status"`
			} `json:"contacts"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false, fmt.Errorf("failed to decode: %w", err)
	}

	// Cek apakah ada data kontak dan apakah statusnya "valid"
	if len(result.Data.Contacts) > 0 {
		return result.Data.Contacts[0].Status == "valid", nil
	}

	return false, nil
}

func (s *qontakService) SendMessage(service models.CustomerService, messageType QontakMessageType) error {
	url := "https://service-chat.qontak.com/api/open/v1/broadcasts/whatsapp/direct"
	token := "Bearer " + os.Getenv("QONTAK_API_TOKEN")

	if token == "Bearer " {
		return errors.New("API token is missing in environment variables")
	}

	var templateID string
	var bodyParams []map[string]string
	var buttonParams []map[string]string

	getString := func(s *string) string {
		if s == nil || *s == "" {
			return "-"
		}
		return *s
	}

	// Helper untuk format tanggal ke Bahasa Indonesia
	formatDateID := func(t time.Time) string {
		days := map[string]string{
			"Sunday": "Minggu", "Monday": "Senin", "Tuesday": "Selasa",
			"Wednesday": "Rabu", "Thursday": "Kamis", "Friday": "Jumat", "Saturday": "Sabtu",
		}
		months := map[string]string{
			"January": "Januari", "February": "Februari", "March": "Maret", "April": "April",
			"May": "Mei", "June": "Juni", "July": "Juli", "August": "Agustus",
			"September": "September", "October": "Oktober", "November": "November", "December": "Desember",
		}

		day := days[t.Format("Sunday")]
		date := t.Format("02")
		month := months[t.Format("January")]
		year := t.Format("2006")

		return fmt.Sprintf("%s, %s %s %s", day, date, month, year)
	}

	switch messageType {
	case "confirmation":
		templateID = "87ff8837-e79b-44bc-8065-740c8e8b0dc1"
		bodyParams = []map[string]string{
			{"key": "1", "value": "customer_name", "value_text": getString(service.Name)},
			{"key": "2", "value": "service_date", "value_text": formatDateID(service.ServiceDate)},
			{"key": "3", "value": "ticket_id", "value_text": service.TicketID},
			{"key": "4", "value": "serial_number", "value_text": getString(service.ProductSN)},
			{"key": "5", "value": "problem", "value_text": getString(service.Complaints)},
			{"key": "6", "value": "service_location", "value_text": getString(service.Address)},
		}
		buttonParams = []map[string]string{
			{
				"index": "0",
				"type":  "url",
				"value": strconv.FormatUint(uint64(service.ID), 10),
			},
		}
	case "confirmed":
		templateID = "6803153c-fded-46dc-81f5-4f301b14db2d"
		bodyParams = []map[string]string{}
		buttonParams = []map[string]string{}
	case "followupNo":
		templateID = "template_id_untuk_no"
		bodyParams = []map[string]string{}
		buttonParams = []map[string]string{}
	default:
		return fmt.Errorf("invalid message type: %s", messageType)
	}

	payload := map[string]interface{}{
		"to_name":                getString(service.Name),
		"to_number":              formatPhoneNumber(getString(service.PhoneNumber)),
		"message_template_id":    templateID,
		"channel_integration_id": os.Getenv("QONTAK_CHANNEL_INTEGRATION_ID"),
		"language":               map[string]string{"code": "en"},
		"parameters": map[string]interface{}{
			"body":    bodyParams,
			"buttons": buttonParams,
		},
	}

	jsonPayload, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", token)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("qontak api error: %d - %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

func (s *qontakService) FetchMekari(method string, pathWithQuery string, payload interface{}) (*http.Response, error) {
	baseURL := "https://api.mekari.com"
	fullURL := baseURL + pathWithQuery

	var bodyReader *bytes.Buffer
	if payload != nil {
		jsonPayload, err := json.Marshal(payload)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal payload: %w", err)
		}
		bodyReader = bytes.NewBuffer(jsonPayload)
	} else {
		bodyReader = bytes.NewBuffer([]byte{})
	}

	req, err := http.NewRequest(method, fullURL, bodyReader)
	if err != nil {
		return nil, err
	}

	// Generate HMAC Headers
	authHeader, dateHeader := GenerateMekariHeader(method, pathWithQuery)

	// Inject Headers
	req.Header.Set("Authorization", authHeader)
	req.Header.Set("Date", dateHeader)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}

	return resp, nil
}

func GenerateMekariHeader(method, path string) (string, string) {
	clientID := os.Getenv("QONTAK_HMAC_CLIENT_ID")
	clientSecret := os.Getenv("QONTAK_HMAC_CLIENT_SECRET")

	// Mekari wajib menggunakan format GMT (bukan UTC)
	// RFC1123 di Go secara default menghasilkan "UTC", kita ubah manual ke "GMT"
	loc, _ := time.LoadLocation("UTC")
	dateString := time.Now().In(loc).Format(time.RFC1123)
	dateString = strings.Replace(dateString, "UTC", "GMT", 1)

	// Format Request Line: GET /path HTTP/1.1
	requestLine := fmt.Sprintf("%s %s HTTP/1.1", strings.ToUpper(method), path)

	// Signing String: date: [date]\n[requestLine]
	signingString := fmt.Sprintf("date: %s\n%s", dateString, requestLine)

	h := hmac.New(sha256.New, []byte(clientSecret))
	h.Write([]byte(signingString))
	signature := base64.StdEncoding.EncodeToString(h.Sum(nil))

	authHeader := fmt.Sprintf(
		"hmac username=\"%s\", algorithm=\"hmac-sha256\", headers=\"date request-line\", signature=\"%s\"",
		clientID,
		signature,
	)

	return authHeader, dateString
}
