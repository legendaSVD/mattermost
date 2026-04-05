package app
import (
	"fmt"
	"io"
	"github.com/mattermost/mattermost/server/v8/channels/app/imaging"
)
func checkImageResolutionLimit(w, h int, maxRes int64) error {
	imageRes := int64(w) * int64(h)
	if imageRes > maxRes {
		return fmt.Errorf("image resolution is too high: %d, max allowed is %d", imageRes, maxRes)
	}
	return nil
}
func checkImageLimits(imageData io.Reader, maxRes int64) error {
	w, h, err := imaging.GetDimensions(imageData)
	if err != nil {
		return fmt.Errorf("failed to get image dimensions: %w", err)
	}
	return checkImageResolutionLimit(w, h, maxRes)
}