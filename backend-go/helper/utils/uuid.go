package utils

import (
	"fmt"
	"math/rand"
	"time"
)

func GenerateBranchID(length int) string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		return ""
	}

	for i := range b {
		b[i] = charset[int(b[i])%len(charset)]
	}
	return string(b)
}

func GenerateTicketID() string {
	const alphanumeric = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	rand.Seed(time.Now().UnixNano())
	middle := make([]byte, 7)
	for i := range middle {
		middle[i] = alphanumeric[rand.Intn(len(alphanumeric))]
	}

	suffix := rand.Intn(90000) + 10000

	ticketID := fmt.Sprintf("ZMB/%s/%d", string(middle), suffix)
	return ticketID
}
