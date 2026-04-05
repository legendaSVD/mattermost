package utils
import "golang.org/x/text/unicode/norm"
func NormalizeFilename(name string) string {
	return norm.NFC.String(name)
}