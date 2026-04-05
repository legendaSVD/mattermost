package docextractor
import (
	"io"
)
type Extractor interface {
	Match(filename string) bool
	Extract(filename string, file io.ReadSeeker, maxFileSize int64) (string, error)
	Name() string
}