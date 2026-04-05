package hashers
import "testing"
var testHasher PasswordHasher
func getLatestHasher() PasswordHasher {
	if testHasher != nil {
		return testHasher
	}
	return latestHasher
}
func SetTestHasher(h PasswordHasher) {
	if !testing.Testing() {
		panic("SetTestHasher called outside of test context")
	}
	testHasher = h
}
func FastTestHasher() PasswordHasher {
	h, err := NewPBKDF2(1, defaultKeyLength)
	if err != nil {
		panic("failed to create fast test hasher: " + err.Error())
	}
	return h
}