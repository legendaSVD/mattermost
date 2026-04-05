package app
import (
	"archive/tar"
	"compress/gzip"
	"io"
	"os"
	"path/filepath"
	"strings"
	"github.com/pkg/errors"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)
func extractTarGz(gzipStream io.Reader, dst string) error {
	if dst == "" {
		return errors.New("no destination path provided")
	}
	uncompressedStream, err := gzip.NewReader(gzipStream)
	if err != nil {
		return errors.Wrap(err, "failed to initialize gzip reader")
	}
	defer uncompressedStream.Close()
	tarReader := tar.NewReader(uncompressedStream)
	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		} else if err != nil {
			return errors.Wrap(err, "failed to read next file from archive")
		}
		switch header.Typeflag {
		case tar.TypeDir:
		case tar.TypeReg:
		default:
			mlog.Warn("skipping unsupported header type on extracting tar file", mlog.String("header_type", string(header.Typeflag)), mlog.String("header_name", header.Name))
			continue
		}
		path := filepath.Join(dst, header.Name)
		if !strings.HasPrefix(path, dst) {
			return errors.Errorf("failed to sanitize path %s", header.Name)
		}
		switch header.Typeflag {
		case tar.TypeDir:
			if err := os.Mkdir(path, 0744); err != nil && !os.IsExist(err) {
				return err
			}
		case tar.TypeReg:
			dir := filepath.Dir(path)
			if err := os.MkdirAll(dir, 0744); err != nil {
				return err
			}
			copyFile := func() error {
				outFile, err := os.OpenFile(path, os.O_RDWR|os.O_CREATE|os.O_TRUNC, os.FileMode(header.Mode))
				if err != nil {
					return err
				}
				defer outFile.Close()
				if _, err := io.Copy(outFile, tarReader); err != nil {
					return err
				}
				return nil
			}
			if err := copyFile(); err != nil {
				return err
			}
		}
	}
	return nil
}