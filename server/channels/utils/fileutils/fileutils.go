package fileutils
import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"github.com/mattermost/mattermost/server/v8"
)
func CommonBaseSearchPaths() []string {
	paths := []string{
		".",
		"..",
		"../..",
		"../../..",
		"../../../..",
	}
	paths = append(paths, server.GetPackagePath())
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
func CheckDirectoryConflict(dir1, dir2 string) (bool, error) {
	absDir1, err := filepath.Abs(dir1)
	if err != nil {
		return false, fmt.Errorf("failed to resolve absolute path for %q: %w", dir1, err)
	}
	absDir2, err := filepath.Abs(dir2)
	if err != nil {
		return false, fmt.Errorf("failed to resolve absolute path for %q: %w", dir2, err)
	}
	if resolved, err := filepath.EvalSymlinks(absDir1); err == nil {
		absDir1 = resolved
	} else if !os.IsNotExist(err) {
		return false, fmt.Errorf("failed to evaluate symlinks for %q: %w", dir1, err)
	}
	if resolved, err := filepath.EvalSymlinks(absDir2); err == nil {
		absDir2 = resolved
	} else if !os.IsNotExist(err) {
		return false, fmt.Errorf("failed to evaluate symlinks for %q: %w", dir2, err)
	}
	if !strings.HasSuffix(absDir1, string(filepath.Separator)) {
		absDir1 += string(filepath.Separator)
	}
	if !strings.HasSuffix(absDir2, string(filepath.Separator)) {
		absDir2 += string(filepath.Separator)
	}
	return strings.HasPrefix(absDir1, absDir2) || strings.HasPrefix(absDir2, absDir1), nil
}