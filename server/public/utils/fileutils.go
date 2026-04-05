package utils
import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
)
func CommonBaseSearchPaths() []string {
	paths := []string{
		".",
		"..",
		"../..",
		"../../..",
		"../../../..",
	}
	return paths
}
func findPath(path string, baseSearchPaths []string, workingDirFirst bool, filter func(os.FileInfo) bool) string {
	if filepath.IsAbs(path) {
		if _, err := os.Stat(path); err == nil {
			return path
		}
		return ""
	}
	searchPaths := []string{}
	if workingDirFirst {
		searchPaths = append(searchPaths, baseSearchPaths...)
	}
	var binaryDir string
	if exe, err := os.Executable(); err == nil {
		if exe, err = filepath.EvalSymlinks(exe); err == nil {
			if exe, err = filepath.Abs(exe); err == nil {
				binaryDir = filepath.Dir(exe)
			}
		}
	}
	if binaryDir != "" {
		for _, baseSearchPath := range baseSearchPaths {
			searchPaths = append(
				searchPaths,
				filepath.Join(binaryDir, baseSearchPath),
			)
		}
	}
	if !workingDirFirst {
		searchPaths = append(searchPaths, baseSearchPaths...)
	}
	for _, parent := range searchPaths {
		found, err := filepath.Abs(filepath.Join(parent, path))
		if err != nil {
			continue
		} else if fileInfo, err := os.Stat(found); err == nil {
			if filter != nil {
				if filter(fileInfo) {
					return found
				}
			} else {
				return found
			}
		}
	}
	return ""
}
func FindPath(path string, baseSearchPaths []string, filter func(os.FileInfo) bool) string {
	return findPath(path, baseSearchPaths, true, filter)
}
func FindFile(path string) string {
	return FindPath(path, CommonBaseSearchPaths(), func(fileInfo os.FileInfo) bool {
		return !fileInfo.IsDir()
	})
}
func FindDir(dir string) (string, bool) {
	found := FindPath(dir, CommonBaseSearchPaths(), func(fileInfo os.FileInfo) bool {
		return fileInfo.IsDir()
	})
	if found == "" {
		return "./", false
	}
	return found, true
}
func FindDirRelBinary(dir string) (string, bool) {
	found := findPath(dir, CommonBaseSearchPaths(), false, func(fileInfo os.FileInfo) bool {
		return fileInfo.IsDir()
	})
	if found == "" {
		return "./", false
	}
	return found, true
}
var safeFileNameRegex = regexp.MustCompile(`[^\w\-\_]`)
func SanitizeFileName(input string) string {
	safeName := strings.Trim(input, ". ")
	safeName = strings.ReplaceAll(safeName, ".", "")
	safeName = safeFileNameRegex.ReplaceAllString(safeName, "_")
	const maxLength = 100
	if len(safeName) > maxLength {
		safeName = safeName[:maxLength]
	}
	return safeName
}