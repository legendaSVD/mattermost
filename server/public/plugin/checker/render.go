package main
import (
	"fmt"
	"go/token"
	"os"
	"path/filepath"
)
func renderWithFilePosition(fset *token.FileSet, pos token.Pos, msg string) string {
	var cwd string
	if d, err := os.Getwd(); err == nil {
		cwd = d
	}
	fpos := fset.Position(pos)
	filename, err := filepath.Rel(cwd, fpos.Filename)
	if err != nil {
		filename = fpos.Filename
	}
	return fmt.Sprintf("%s:%d:%d: %s", filename, fpos.Line, fpos.Column, msg)
}