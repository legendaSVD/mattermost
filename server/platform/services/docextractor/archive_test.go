package docextractor
import (
	"bytes"
	"testing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)
func TestArchiveExtractorSkips7zip(t *testing.T) {
	ae := &archiveExtractor{}
	t.Run("7zip file with .7z extension returns empty string", func(t *testing.T) {
		sevenZipData := []byte{0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c, 0x00, 0x00}
		result, err := ae.Extract("test.7z", bytes.NewReader(sevenZipData), 0)
		require.NoError(t, err)
		assert.Empty(t, result)
	})
	t.Run("7zip content with wrong extension is still blocked", func(t *testing.T) {
		sevenZipData := []byte{0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c, 0x00, 0x00}
		result, err := ae.Extract("malicious.zip", bytes.NewReader(sevenZipData), 0)
		require.NoError(t, err)
		assert.Empty(t, result)
	})
	t.Run("7zip at offset with .7z extension is blocked via filename", func(t *testing.T) {
		junkPrefix := []byte{0x00, 0x00, 0x00, 0x00}
		sevenZipSig := []byte{0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c, 0x00, 0x00}
		dataWithOffset := append(junkPrefix, sevenZipSig...)
		result, err := ae.Extract("test.7z", bytes.NewReader(dataWithOffset), 0)
		require.NoError(t, err)
		assert.Empty(t, result)
	})
	t.Run("7zip at offset with wrong extension fails safely", func(t *testing.T) {
		junkPrefix := []byte{0x00, 0x00, 0x00, 0x00}
		sevenZipSig := []byte{0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c, 0x00, 0x00}
		dataWithOffset := append(junkPrefix, sevenZipSig...)
		_, err := ae.Extract("malicious.zip", bytes.NewReader(dataWithOffset), 0)
		assert.Error(t, err)
	})
}