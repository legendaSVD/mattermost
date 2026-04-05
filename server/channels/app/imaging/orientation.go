package imaging
import (
	"errors"
	"fmt"
	"image"
	"io"
	"strings"
	"github.com/anthonynsimon/bild/transform"
	"github.com/bep/imagemeta"
)
const (
	Upright = iota + 1
	UprightMirrored
	UpsideDown
	UpsideDownMirrored
	RotatedCWMirrored
	RotatedCCW
	RotatedCCWMirrored
	RotatedCW
)
var errStopDecoding = fmt.Errorf("stop decoding")
func MakeImageUpright(img image.Image, orientation int) image.Image {
	switch orientation {
	case UprightMirrored:
		return transform.FlipH(img)
	case UpsideDown:
		return transform.Rotate(img, 180, &transform.RotationOptions{ResizeBounds: true})
	case UpsideDownMirrored:
		return transform.FlipV(img)
	case RotatedCWMirrored:
		return transform.Rotate(transform.FlipH(img), -90, &transform.RotationOptions{ResizeBounds: true})
	case RotatedCCW:
		return transform.Rotate(img, 90, &transform.RotationOptions{ResizeBounds: true})
	case RotatedCCWMirrored:
		return transform.Rotate(transform.FlipV(img), -90, &transform.RotationOptions{ResizeBounds: true})
	case RotatedCW:
		return transform.Rotate(img, 270, &transform.RotationOptions{ResizeBounds: true})
	default:
		return img
	}
}
type fwSeeker struct {
	r   io.Reader
	pos int64
}
func (f *fwSeeker) Read(p []byte) (int, error) {
	n, err := f.r.Read(p)
	if err != nil {
		return n, err
	}
	f.pos += int64(n)
	return n, nil
}
func (f *fwSeeker) Seek(offset int64, whence int) (int64, error) {
	isForwardSeek := (whence == io.SeekStart && offset >= f.pos) ||
		(whence == io.SeekCurrent && offset >= 0)
	if !isForwardSeek {
		return 0, fmt.Errorf("seeking backwards is not supported")
	}
	toRead := offset
	if whence == io.SeekStart {
		toRead -= f.pos
	}
	n, err := io.CopyN(io.Discard, f.r, toRead)
	if err != nil {
		return n, fmt.Errorf("failed to seek: %w", err)
	}
	f.pos += n
	return f.pos, nil
}
func GetImageOrientation(input io.Reader, format string) (int, error) {
	orientation := Upright
	format, _ = strings.CutPrefix(format, "image/")
	var imgFormat imagemeta.ImageFormat
	switch format {
	case "jpeg":
		imgFormat = imagemeta.JPEG
	case "png":
		imgFormat = imagemeta.PNG
	case "tiff":
		imgFormat = imagemeta.TIFF
	case "webp":
		imgFormat = imagemeta.WebP
	default:
		return orientation, fmt.Errorf("unsupported image format: %s", format)
	}
	var rs io.ReadSeeker
	if r, ok := input.(io.ReadSeeker); ok {
		rs = r
	} else {
		rs = &fwSeeker{r: input}
	}
	opts := imagemeta.Options{
		R: rs,
		HandleTag: func(tag imagemeta.TagInfo) error {
			if tag.Tag == "Orientation" {
				if o, ok := tag.Value.(uint16); ok {
					orientation = int(o)
					return errStopDecoding
				}
			}
			return nil
		},
		ShouldHandleTag: func(tag imagemeta.TagInfo) bool {
			return tag.Tag == "Orientation"
		},
		Sources:     imagemeta.EXIF,
		ImageFormat: imgFormat,
	}
	if err := imagemeta.Decode(opts); err != nil && !errors.Is(err, errStopDecoding) {
		return Upright, fmt.Errorf("failed to decode exif data: %w", err)
	}
	return orientation, nil
}