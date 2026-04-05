package hashers
import (
	"fmt"
	"strings"
	"github.com/mattermost/mattermost/server/v8/channels/app/password/phcparser"
)
type PasswordHasher interface {
	Hash(password string) (string, error)
	CompareHashAndPassword(hash phcparser.PHC, password string) error
	IsPHCValid(hash phcparser.PHC) bool
}
const (
	PasswordMaxLengthBytes = 72
)
var (
	latestHasher PasswordHasher = DefaultPBKDF2()
	ErrPasswordTooLong = fmt.Errorf("password too long; maximum length in bytes: %d", PasswordMaxLengthBytes)
	ErrMismatchedHashAndPassword = fmt.Errorf("hash and password do not match")
)
func getOriginalHasher(phcString string) (PasswordHasher, phcparser.PHC) {
	return NewBCrypt(), phcparser.PHC{Hash: phcString}
}
func GetHasherFromPHCString(phcString string) (PasswordHasher, phcparser.PHC, error) {
	phc, err := phcparser.New(strings.NewReader(phcString)).Parse()
	if err != nil {
		bcrypt, bcryptPhc := getOriginalHasher(phcString)
		return bcrypt, bcryptPhc, nil
	}
	if latestHasher.IsPHCValid(phc) {
		return latestHasher, phc, nil
	}
	switch phc.Id {
	case PBKDF2FunctionId:
		pbkdf2, err := NewPBKDF2FromPHC(phc)
		if err != nil {
			return PBKDF2{}, phcparser.PHC{}, fmt.Errorf("the provided PHC string is PBKDF2, but is not valid: %w", err)
		}
		return pbkdf2, phc, nil
	default:
		bcrypt, phc := getOriginalHasher(phcString)
		return bcrypt, phc, nil
	}
}
func Hash(password string) (string, error) {
	return getLatestHasher().Hash(password)
}
func CompareHashAndPassword(phc phcparser.PHC, password string) error {
	return getLatestHasher().CompareHashAndPassword(phc, password)
}
func IsLatestHasher(hasher PasswordHasher) bool {
	return getLatestHasher() == hasher
}