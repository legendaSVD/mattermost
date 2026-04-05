package imaging
import (
	"errors"
	"fmt"
	"image"
	"io"
	"image/jpeg"
	"image/png"
)
type EncoderOptions struct {
	ConcurrencyLevel int
}
func (o *EncoderOptions) validate() error {
	if o.ConcurrencyLevel < 0 {
		return errors.New("ConcurrencyLevel must be non-negative")
	}
	return nil
}
type Encoder struct {
	sem        chan struct{}
	opts       EncoderOptions
	pngEncoder *png.Encoder
}
func NewEncoder(opts EncoderOptions) (*Encoder, error) {
	var e Encoder
	if err := opts.validate(); err != nil {
		return nil, fmt.Errorf("imaging: error validating encoder options: %w", err)
	}
	if opts.ConcurrencyLevel > 0 {
		e.sem = make(chan struct{}, opts.ConcurrencyLevel)
	}
	e.opts = opts
	e.pngEncoder = &png.Encoder{
		CompressionLevel: png.BestCompression,
	}
	return &e, nil
}
func (e *Encoder) EncodeJPEG(wr io.Writer, img image.Image, quality int) error {
	if e.opts.ConcurrencyLevel > 0 {
		e.sem <- struct{}{}
		defer func() {
			<-e.sem
		}()
	}
	var encOpts jpeg.Options
	encOpts.Quality = quality
	if err := jpeg.Encode(wr, img, &encOpts); err != nil {
		return fmt.Errorf("imaging: failed to encode jpeg: %w", err)
	}
	return nil
}
func (e *Encoder) EncodePNG(wr io.Writer, img image.Image) error {
	if e.opts.ConcurrencyLevel > 0 {
		e.sem <- struct{}{}
		defer func() {
			<-e.sem
		}()
	}
	if err := e.pngEncoder.Encode(wr, img); err != nil {
		return fmt.Errorf("imaging: failed to encode png: %w", err)
	}
	return nil
}