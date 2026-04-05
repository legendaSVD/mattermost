package server
import (
	"path/filepath"
	"runtime"
)
func GetPackagePath() string {
	_, filename, _, _ := runtime.Caller(0)
	return filepath.Dir(filename)
}