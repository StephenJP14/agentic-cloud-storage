package repo

import (
	"errors"
	"fmt"

	"gitlab.com/zyrex1/landing-page/apperrors"
	"gitlab.com/zyrex1/landing-page/models"

	"gorm.io/gorm"
)

// UserRepository defines the interface for user data operations
type UserRepository interface {
	Create(user *models.User) error
	FindAll(limit, page int) ([]models.User, error)
	FindByID(id uint) (*models.User, error)
	FindByUsername(username string) (*models.User, error)
	Update(user *models.User) error
	Delete(id uint) error
}

type userRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(user *models.User) error {
	if err := r.db.Create(user).Error; err != nil {
		return fmt.Errorf("%w: creating user: %w", apperrors.ErrInternal, err)
	}
	return nil
}

func (r *userRepository) FindAll(limit, page int) ([]models.User, error) {
	var users []models.User
	offset := (page - 1) * limit
	sqlQuery := "SELECT * FROM users LIMIT ? OFFSET ?"

	err := r.db.Raw(sqlQuery, limit, offset).Scan(&users).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("%w: finding all users: %w", apperrors.ErrNotFound, err)
		}
		return nil, fmt.Errorf("%w: finding all users: %w", apperrors.ErrInternal, err)
	}
	return users, nil
}

func (r *userRepository) FindByID(id uint) (*models.User, error) {
	var user models.User
	err := r.db.First(&user, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("%w: finding user by ID: %w", apperrors.ErrNotFound, err)
		}
	}
	return &user, nil
}

func (r *userRepository) FindByUsername(username string) (*models.User, error) {
	var user models.User
	err := r.db.Where("username = ?", username).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		return nil, err
	}
	return &user, err
}

func (r *userRepository) Update(user *models.User) error {
	if err := r.db.Save(user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("%w: updating user: %w", apperrors.ErrNotFound, err)
		}
		return fmt.Errorf("%w: updating user: %w", apperrors.ErrInternal, err)
	}
	return nil
}

func (r *userRepository) Delete(id uint) error {
	if err := r.db.Unscoped().Delete(&models.User{}, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("%w: deleting user: %w", apperrors.ErrNotFound, err)
		}
		return fmt.Errorf("%w: deleting user: %w", apperrors.ErrInternal, err)
	}
	return nil
}
