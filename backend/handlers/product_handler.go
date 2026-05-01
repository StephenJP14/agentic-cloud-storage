package handlers

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"gitlab.com/zyrex1/landing-page/apperrors"
	"gitlab.com/zyrex1/landing-page/helper/dto"
	"gitlab.com/zyrex1/landing-page/helper/utils"
	"gitlab.com/zyrex1/landing-page/models"
	"gitlab.com/zyrex1/landing-page/services"
	"io"
	"net/http"
	"strconv"
	"strings"
)

type ProductHandler struct {
	Service services.ProductService
}

func NewProductHandler(service services.ProductService) *ProductHandler {
	return &ProductHandler{Service: service}
}

func (h *ProductHandler) GetProducts(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess

	// Mengambil string "laptop,desktop,server"
	typeParam := c.Query("type")
	var productTypes []string
	if typeParam != "" {
		productTypes = strings.Split(typeParam, ",")
	}

	// Mengambil sort param: price_asc, price_desc, name_asc, atau name_desc
	sortParam := c.Query("sort")

	// Panggil Service
	prod, err := h.Service.GetProducts(productTypes, sortParam)
	if err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       prod,
		Message:    "Products retrieved successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *ProductHandler) GetProductByType(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	var payload dto.GetProductDTO
	if err := c.ShouldBindJSON(&payload); err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}
	fmt.Printf("%+v\n", payload)

	prod, err := h.Service.GetProductsByTypes(payload.ProductType, payload.PriceSort, payload.NameSort)
	if err != nil {
		_ = c.Error(err)
		c.Abort()
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       prod,
		Message:    "Products retrieved successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *ProductHandler) AddProduct(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess

	headline := c.PostForm("headline")
	subheadline := c.PostForm("subheadline")
	productType := c.PostForm("product_type")
	productName := c.PostForm("product_name")
	segment := c.PostForm("product_segment")
	specifications := c.PostForm("specifications")
	warrantyLengthStr := c.PostForm("warranty_length")
	priceStr := c.PostForm("price")
	productCode := c.PostForm("product_code")
	ecommerceUrl := c.PostForm("ecommerce_url")
	shopeeUrl := c.PostForm("shopee_url")
	tokopediaUrl := c.PostForm("tokopedia_url")

	var err error
	var warrantyLength, price int
	if warrantyLengthStr != "" {
		warrantyLength, err = strconv.Atoi(warrantyLengthStr)
		if err != nil {
			_ = c.Error(apperrors.ErrInvalidInput)
			return
		}
	}

	if priceStr != "" {
		price, err = strconv.Atoi(priceStr)
		if err != nil {
			_ = c.Error(apperrors.ErrInvalidInput)
			return
		}
	}

	// Read optional display image
	var displayImage []byte
	if file, ferr := c.FormFile("display_image"); ferr == nil && file != nil {
		openedFile, err := file.Open()
		if err != nil {
			_ = c.Error(apperrors.ErrInvalidInput)
			return
		}
		defer openedFile.Close()

		bytes, err := io.ReadAll(openedFile)
		if err != nil {
			_ = c.Error(apperrors.ErrInvalidInput)
			return
		}
		displayImage = bytes
	}

	productSegment, err := utils.ParseProductSegment(segment)
	if err != nil {
		_ = c.Error(err)
		return
	}

	product := models.Product{
		Headline:       headline,
		Subheadline:    subheadline,
		ProductType:    productType,
		ProductName:    productName,
		ProductSegment: productSegment,
		Specifications: specifications,
		WarrantyLength: warrantyLength,
		Price:          price,
		ProductCode:    productCode,
		DisplayImage:   displayImage,
		ECommerceURL:   ecommerceUrl,
		ShopeeURL:      shopeeUrl,
		TokopediaURL:   tokopediaUrl,
	}

	if err := h.Service.AddProduct(&product); err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusCreated,
		Data:       nil,
		Message:    "Product added successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *ProductHandler) UpdateProduct(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess

	productID := c.PostForm("ID")
	headline := c.PostForm("headline")
	subheadline := c.PostForm("subheadline")
	productType := c.PostForm("product_type")
	productName := c.PostForm("product_name")
	segment := c.PostForm("product_segment")
	specifications := c.PostForm("specifications")
	warrantyLengthStr := c.PostForm("warranty_length")
	priceStr := c.PostForm("price")
	productCode := c.PostForm("product_code")
	ecommerceUrl := c.PostForm("ecommerce_url")
	shopeeUrl := c.PostForm("shopee_url")
	tokopediaUrl := c.PostForm("tokopedia_url")

	var err error
	var warrantyLength, price, ID int
	if warrantyLengthStr != "" {
		warrantyLength, err = strconv.Atoi(warrantyLengthStr)
		if err != nil {
			_ = c.Error(apperrors.ErrInvalidInput)
			return
		}
	}

	if priceStr != "" {
		price, err = strconv.Atoi(priceStr)
		if err != nil {
			_ = c.Error(apperrors.ErrInvalidInput)
			return
		}
	}

	if productID == "" {
		fmt.Println("Product ID is empty")
		return
	}
	ID, err = strconv.Atoi(productID)
	if err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	// Read optional display image
	var displayImage []byte
	if file, ferr := c.FormFile("display_image"); ferr == nil && file != nil {
		openedFile, err := file.Open()
		if err != nil {
			_ = c.Error(apperrors.ErrInvalidInput)
			return
		}
		defer openedFile.Close()

		bytes, err := io.ReadAll(openedFile)
		if err != nil {
			_ = c.Error(apperrors.ErrInvalidInput)
			return
		}
		displayImage = bytes
	}

	productSegment, err := utils.ParseProductSegment(segment)
	if err != nil {
		_ = c.Error(err)
		return
	}

	product := models.Product{
		Headline:       headline,
		Subheadline:    subheadline,
		ProductType:    productType,
		ProductName:    productName,
		ProductSegment: productSegment,
		Specifications: specifications,
		WarrantyLength: warrantyLength,
		Price:          price,
		ProductCode:    productCode,
		DisplayImage:   displayImage,
		ECommerceURL:   ecommerceUrl,
		ShopeeURL:      shopeeUrl,
		TokopediaURL:   tokopediaUrl,
	}

	if err := h.Service.UpdateProduct(&product, uint(ID)); err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       nil,
		Message:    "Product updated successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *ProductHandler) DeleteProduct(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess

	productID := c.Param("productID")
	ID, err := strconv.Atoi(productID)
	if err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	err = h.Service.DeleteProduct(uint(ID))
	if err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       nil,
		Message:    "Product deleted successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *ProductHandler) GetProductByID(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess

	ID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	product, err := h.Service.GetProductByID(uint(ID))
	if err != nil {
		_ = c.Error(err)
		c.Abort()
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       product,
		Message:    "Product retrieved successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}
