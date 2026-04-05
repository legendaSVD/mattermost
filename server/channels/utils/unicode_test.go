package utils
import (
	"testing"
	"github.com/stretchr/testify/assert"
)
func TestNormalizeFilename(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "ASCII only",
			input:    "test.jpg",
			expected: "test.jpg",
		},
		{
			name:     "Japanese katakana dakuten NFC",
			input:    "\u30AC",
			expected: "\u30AC",
		},
		{
			name:     "Japanese katakana dakuten NFD",
			input:    "\u30AB\u3099",
			expected: "\u30AC",
		},
		{
			name:     "Japanese katakana handakuten NFC",
			input:    "\u30D1",
			expected: "\u30D1",
		},
		{
			name:     "Japanese katakana handakuten NFD",
			input:    "\u30CF\u309A",
			expected: "\u30D1",
		},
		{
			name:     "Japanese hiragana dakuten NFC",
			input:    "\u3079",
			expected: "\u3079",
		},
		{
			name:     "Japanese hiragana dakuten NFD",
			input:    "\u3078\u3099",
			expected: "\u3079",
		},
		{
			name:     "Mixed path with NFD",
			input:    "data/\u30AB\u3099test.jpg",
			expected: "data/\u30ACtest.jpg",
		},
		{
			name:     "Complex Japanese filename NFD",
			input:    "\u304B\u3099\u304D\u3099\u3050",
			expected: "\u304C\u304E\u3050",
		},
		{
			name:     "Path with multiple NFD characters",
			input:    "data/\u30D5\u309A\u30ED\u30B7\u3099\u30A7\u30AF\u30C8.png",
			expected: "data/\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8.png",
		},
		{
			name:     "Empty string",
			input:    "",
			expected: "",
		},
		{
			name:     "Already NFC normalized",
			input:    "ファイル名.txt",
			expected: "ファイル名.txt",
		},
		{
			name:     "Korean Hangul NFC",
			input:    "\uAC00",
			expected: "\uAC00",
		},
		{
			name:     "Korean Hangul NFD",
			input:    "\u1100\u1161",
			expected: "\uAC00",
		},
		{
			name:     "Korean word NFD",
			input:    "\u1112\u1161\u11AB\u1100\u1173\u11AF",
			expected: "\uD55C\uAE00",
		},
		{
			name:     "Korean filename with path NFD",
			input:    "data/\u1111\u1161\u110B\u1175\u11AF.txt",
			expected: "data/\uD30C\uC77C.txt",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := NormalizeFilename(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}
func TestNormalizeFilenameIdempotent(t *testing.T) {
	inputs := []string{
		"test.jpg",
		"\u30AC",
		"\u30AB\u3099",
		"data/テスト.jpg",
		"\uD55C\uAE00",
		"\u1112\u1161\u11AB\u1100\u1173\u11AF",
		"",
	}
	for _, input := range inputs {
		first := NormalizeFilename(input)
		second := NormalizeFilename(first)
		assert.Equal(t, first, second, "NormalizeFilename should be idempotent for input: %q", input)
	}
}