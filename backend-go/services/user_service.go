package services

import (
	"errors"
	"fmt"
	"log"
	"os"

	"gitlab.com/zyrex1/landing-page/apperrors"
	"gitlab.com/zyrex1/landing-page/middleware"
	"gitlab.com/zyrex1/landing-page/models"
	"gitlab.com/zyrex1/landing-page/repo"
	"golang.org/x/crypto/bcrypt"

	"gorm.io/gorm"
)

// UserService defines the interface for user business logic
type UserService interface {
	CreateInitialAdmin() error
	CreateUser(input *CreateUserInput) (*models.User, error)
	Login(input *LoginInput) (string, *models.User, error)
	GetAllUsers(limit, page int) ([]models.User, error) // <– updated
	GetUserByID(id uint) (*models.User, error)
	UpdateUser(id uint, input *UpdateUserInput) (*models.User, error)
	DeleteUser(id uint) error
	VerifyUser(username string) (*models.User, error)
}

type userService struct {
	repo repo.UserRepository
}

// NewUserService creates a new user servicea
func NewUserService(repo repo.UserRepository) UserService {
	return &userService{repo: repo}
}

// --- DTOs (Data Transfer Objects) for Inputs ---

type CreateUserInput struct {
	Username   string `json:"username"`
	Password   string `json:"password"`
	Role       string `json:"role"`
	Department string `json:"department"`
	BranchID   string `json:"branch_id"`
}

type LoginInput struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type UpdateUserInput struct {
	Username   string `json:"username"`
	Password   string `json:"password"`
	Role       string `json:"role"`
	Department string `json:"department"`
	BranchID   string `json:"branch_id"`
}

// --- Service Implementations ---

func (s *userService) CreateInitialAdmin() error {
	_, err := s.repo.FindByUsername("Administrator")

	// Check if the user already exists
	if err == nil {
		log.Println("Initial admin user 'Administrator' already exists.")
		return nil // Admin already exists, no error
	}

	// Only proceed if the error is "record not found"
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err // Some other database error occurred
	}

	// --- Create the initial admin user ---
	log.Println("Creating initial admin user 'Administrator'...")
	admPassword := os.Getenv("ADMIN_PASSWORD")
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(admPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	adminUser := &models.User{
		Username:   "Administrator",
		Password:   string(hashedPassword),
		Role:       "superadmin",
		Department: "System",
	}

	return s.repo.Create(adminUser)
}

// CreateUser now handles role-based restrictions
func (s *userService) CreateUser(
	input *CreateUserInput,
) (*models.User, error) {

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Username:   input.Username,
		Password:   string(hashedPassword),
		Role:       input.Role,
		Department: input.Department,
		BranchID:   input.BranchID,
	}

	if err := s.repo.Create(user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *userService) Login(input *LoginInput) (string, *models.User, error) {
	user, err := s.repo.FindByUsername(input.Username)
	if err != nil {
		return "", nil, fmt.Errorf("%w: invalid username or password", apperrors.ErrInvalidCredentials)
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password))
	if err != nil {
		return "", nil, fmt.Errorf("%w: invalid username or password", apperrors.ErrInvalidCredentials)
	}

	token, err := middleware.GenerateToken(user.ID, user.Role, user.Username, user.Department)
	if err != nil {
		return "", nil, fmt.Errorf("failed to generate token: %w", err)
	}
	// Use the middleware package to generate the token
	return token, user, nil
}

func (s *userService) GetAllUsers(limit, page int) ([]models.User, error) {
	return s.repo.FindAll(limit, page)
}

func (s *userService) GetUserByID(id uint) (*models.User, error) {
	return s.repo.FindByID(id)
}

func (s *userService) UpdateUser(id uint, input *UpdateUserInput) (*models.User, error) {
	user, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("user not found")
	}

	if input.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		user.Password = string(hashedPassword)
	}

	err = s.repo.Update(user)
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}
	return user, err
}

func (s *userService) DeleteUser(id uint) error {
	// First check if user exists
	_, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("user not found")
	}
	return s.repo.Delete(id)
}

func (s *userService) VerifyUser(username string) (*models.User, error) {
	user, err := s.repo.FindByUsername(username)
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}
	return user, nil
}
