package hashers
import (
	"errors"
	"github.com/mattermost/mattermost/server/v8/channels/app/password/phcparser"
	"golang.org/x/crypto/bcrypt"
)
type BCrypt struct{}
const (
	BCryptCost = 10
)
func NewBCrypt() BCrypt {
	return BCrypt{}
}
func (b BCrypt) Hash(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), BCryptCost)
	if err != nil {
		if errors.Is(err, bcrypt.ErrPasswordTooLong) {
			return "", ErrPasswordTooLong
		}
		return "", err
	}
	return string(hash), nil
}
func (b BCrypt) CompareHashAndPassword(hash phcparser.PHC, password string) error {
	if len(password) > PasswordMaxLengthBytes {
		return ErrPasswordTooLong
	}
	err := bcrypt.CompareHashAndPassword([]byte(hash.Hash), []byte(password))
	if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
		return ErrMismatchedHashAndPassword
	}
	return err
}
func (b BCrypt) IsPHCValid(hash phcparser.PHC) bool {
	return false
}