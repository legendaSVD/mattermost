package hashers
import (
	"testing"
	"github.com/stretchr/testify/require"
)
func TestSetTestHasher(t *testing.T) {
	SetTestHasher(nil)
	hash1, err := Hash("password")
	require.NoError(t, err)
	require.NotEmpty(t, hash1)
	fastHasher := FastTestHasher()
	SetTestHasher(fastHasher)
	defer SetTestHasher(nil)
	hash2, err := Hash("password")
	require.NoError(t, err)
	require.NotEmpty(t, hash2)
	require.Contains(t, hash2, "w=1")
	hasher, phc, err := GetHasherFromPHCString(hash2)
	require.NoError(t, err)
	require.NoError(t, hasher.CompareHashAndPassword(phc, "password"))
	require.Error(t, hasher.CompareHashAndPassword(phc, "wrongpassword"))
}
func TestFastTestHasher(t *testing.T) {
	hasher := FastTestHasher()
	require.NotNil(t, hasher)
	pbkdf2Hasher, ok := hasher.(PBKDF2)
	require.True(t, ok, "FastTestHasher should return a PBKDF2 hasher")
	require.Equal(t, 1, pbkdf2Hasher.workFactor)
	hash, err := hasher.Hash("testpassword")
	require.NoError(t, err)
	require.Contains(t, hash, "w=1")
	parsedHasher, phc, err := GetHasherFromPHCString(hash)
	require.NoError(t, err)
	require.NoError(t, parsedHasher.CompareHashAndPassword(phc, "testpassword"))
}
func TestGetLatestHasher(t *testing.T) {
	SetTestHasher(nil)
	require.Equal(t, latestHasher, getLatestHasher())
	fastHasher := FastTestHasher()
	SetTestHasher(fastHasher)
	defer SetTestHasher(nil)
	require.Equal(t, fastHasher, getLatestHasher())
	require.NotEqual(t, latestHasher, getLatestHasher())
}
func BenchmarkFastTestHasher(b *testing.B) {
	hasher := FastTestHasher()
	for b.Loop() {
		_, _ = hasher.Hash("password")
	}
}