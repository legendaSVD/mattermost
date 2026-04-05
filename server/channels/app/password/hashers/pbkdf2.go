package hashers
import (
	"crypto/pbkdf2"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"io"
	"strconv"
	"strings"
	"github.com/mattermost/mattermost/server/v8/channels/app/password/phcparser"
)
const (
	PBKDF2FunctionId string = "pbkdf2"
)
const (
	defaultPRFName    = "SHA256"
	defaultWorkFactor = 600000
	defaultKeyLength  = 32
	saltLenBytes = 16
)
var (
	defaultPRF = sha256.New
)
type PBKDF2 struct {
	workFactor int
	keyLength  int
	phcHeader string
}
func DefaultPBKDF2() PBKDF2 {
	hasher, err := NewPBKDF2(defaultWorkFactor, defaultKeyLength)
	if err != nil {
		panic("DefaultPBKDF2 implementation is incorrect")
	}
	return hasher
}
func NewPBKDF2(workFactor int, keyLength int) (PBKDF2, error) {
	if workFactor <= 0 {
		return PBKDF2{}, fmt.Errorf("work factor must be strictly positive")
	}
	if keyLength <= 0 {
		return PBKDF2{}, fmt.Errorf("key length must be strictly positive")
	}
	phcHeader := new(strings.Builder)
	phcHeader.WriteRune('$')
	phcHeader.WriteString(PBKDF2FunctionId)
	phcHeader.WriteString("$f=")
	phcHeader.WriteString(defaultPRFName)
	phcHeader.WriteString(",w=")
	phcHeader.WriteString(strconv.Itoa(workFactor))
	phcHeader.WriteString(",l=")
	phcHeader.WriteString(strconv.Itoa(keyLength))
	phcHeader.WriteRune('$')
	return PBKDF2{
		workFactor: workFactor,
		keyLength:  keyLength,
		phcHeader:  phcHeader.String(),
	}, nil
}
func NewPBKDF2FromPHC(phc phcparser.PHC) (PBKDF2, error) {
	workFactor, err := strconv.Atoi(phc.Params["w"])
	if err != nil {
		return PBKDF2{}, fmt.Errorf("invalid work factor parameter 'w=%s'", phc.Params["w"])
	}
	keyLength, err := strconv.Atoi(phc.Params["l"])
	if err != nil {
		return PBKDF2{}, fmt.Errorf("invalid key length parameter 'l=%s'", phc.Params["l"])
	}
	return NewPBKDF2(workFactor, keyLength)
}
func (p PBKDF2) hashWithSalt(password string, salt []byte) (string, error) {
	hash, err := pbkdf2.Key(defaultPRF, password, salt, p.workFactor, p.keyLength)
	if err != nil {
		return "", fmt.Errorf("failed hashing the password: %w", err)
	}
	encodedHash := base64.RawStdEncoding.EncodeToString(hash)
	return encodedHash, nil
}
func (p PBKDF2) Hash(password string) (string, error) {
	if len(password) > PasswordMaxLengthBytes {
		return "", ErrPasswordTooLong
	}
	salt := make([]byte, saltLenBytes)
	if _, err := io.ReadFull(rand.Reader, salt); err != nil {
		return "", fmt.Errorf("unable to generate salt for user: %w", err)
	}
	hash, err := p.hashWithSalt(password, salt)
	if err != nil {
		return "", fmt.Errorf("failed to hash the password: %w", err)
	}
	phcString := new(strings.Builder)
	b64Encoder := base64.RawStdEncoding
	phcString.WriteString(p.phcHeader)
	phcString.WriteString(b64Encoder.EncodeToString(salt))
	phcString.WriteRune('$')
	phcString.WriteString(hash)
	return phcString.String(), nil
}
func (p PBKDF2) CompareHashAndPassword(hash phcparser.PHC, password string) error {
	if len(password) > PasswordMaxLengthBytes {
		return ErrPasswordTooLong
	}
	if !p.IsPHCValid(hash) {
		return fmt.Errorf("the stored password does not comply with the PBKDF2 parser's PHC serialization")
	}
	salt, err := base64.RawStdEncoding.DecodeString(hash.Salt)
	if err != nil {
		return fmt.Errorf("failed decoding hash's salt: %w", err)
	}
	newHash, err := p.hashWithSalt(password, salt)
	if err != nil {
		return fmt.Errorf("failed to hash the password: %w", err)
	}
	if subtle.ConstantTimeCompare([]byte(hash.Hash), []byte(newHash)) != 1 {
		return ErrMismatchedHashAndPassword
	}
	return nil
}
func (p PBKDF2) IsPHCValid(phc phcparser.PHC) bool {
	return phc.Id == PBKDF2FunctionId &&
		len(phc.Params) == 3 &&
		phc.Params["f"] == defaultPRFName &&
		phc.Params["w"] == strconv.Itoa(p.workFactor) &&
		phc.Params["l"] == strconv.Itoa(p.keyLength)
}