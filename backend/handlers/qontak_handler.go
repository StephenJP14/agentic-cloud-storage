package handlers

import (
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	// "gitlab.com/zyrex1/landing-page/helper/dto"
	"gitlab.com/zyrex1/landing-page/services"
	"net/http"
)

type QontakHandler struct {
	qontakService services.QontakService
}

func NewQontakHandler(qontakService services.QontakService) *QontakHandler {
	return &QontakHandler{qontakService: qontakService}
}

func (h *QontakHandler) QontakWebhook(c *gin.Context) {
	// Gunakan map[string]interface{} untuk menangkap SEMUA field tanpa terkecuali
	var rawPayload map[string]interface{}

	if err := c.ShouldBindJSON(&rawPayload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid webhook data"})
		return
	}

	// Print seluruh hasil dengan format JSON yang rapi (Pretty Print)
	fmt.Println("--- RAW WEBHOOK DATA START ---")

	// Mengonversi kembali ke JSON string untuk logging agar mudah dibaca
	prettyJSON, _ := json.MarshalIndent(rawPayload, "", "  ")
	fmt.Println(string(prettyJSON))

	fmt.Println("--- RAW WEBHOOK DATA END ---")

	// Tetap jalankan switch case jika Anda masih butuh log spesifik
	// Namun Anda harus memetakan ulang atau menggunakan data dari rawPayload
	if dataEvent, ok := rawPayload["data_event"].(string); ok {
		fmt.Printf("Event Detected: %s\n", dataEvent)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Webhook received and logged",
	})
}
