package imgutils
import (
	"bufio"
	"compress/lzw"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
)
var (
	errNotEnough = errors.New("gif: not enough image data")
	errTooMuch   = errors.New("gif: too much image data")
)
type reader interface {
	io.Reader
	io.ByteReader
}
const (
	fColorTable         = 1 << 7
	fColorTableBitsMask = 7
	gcTransparentColorSet = 1 << 0
	gcDisposalMethodMask  = 7 << 2
)
const (
	DisposalNone       = 0x01
	DisposalBackground = 0x02
	DisposalPrevious   = 0x03
)
const (
	sExtension       = 0x21
	sImageDescriptor = 0x2C
	sTrailer         = 0x3B
)
const (
	eText           = 0x01
	eGraphicControl = 0xF9
	eComment        = 0xFE
	eApplication    = 0xFF
)
func readFull(r io.Reader, b []byte) error {
	_, err := io.ReadFull(r, b)
	if err == io.EOF {
		err = io.ErrUnexpectedEOF
	}
	return err
}
func readByte(r io.ByteReader) (byte, error) {
	b, err := r.ReadByte()
	if err == io.EOF {
		err = io.ErrUnexpectedEOF
	}
	return b, err
}
type decoder struct {
	r reader
	vers            string
	width           int
	height          int
	loopCount       int
	delayTime       int
	backgroundIndex byte
	disposalMethod  byte
	imageFields byte
	transparentIndex    byte
	hasTransparentIndex bool
	hasGlobalColorTable bool
	imageCount int
	tmp        [1024]byte
}
type blockReader struct {
	d    *decoder
	i, j uint8
	err  error
}
func (b *blockReader) fill() {
	if b.err != nil {
		return
	}
	b.j, b.err = readByte(b.d.r)
	if b.j == 0 && b.err == nil {
		b.err = io.EOF
	}
	if b.err != nil {
		return
	}
	b.i = 0
	b.err = readFull(b.d.r, b.d.tmp[:b.j])
	if b.err != nil {
		b.j = 0
	}
}
func (b *blockReader) ReadByte() (byte, error) {
	if b.i == b.j {
		b.fill()
		if b.err != nil {
			return 0, b.err
		}
	}
	c := b.d.tmp[b.i]
	b.i++
	return c, nil
}
func (b *blockReader) Read(p []byte) (int, error) {
	if len(p) == 0 || b.err != nil {
		return 0, b.err
	}
	if b.i == b.j {
		b.fill()
		if b.err != nil {
			return 0, b.err
		}
	}
	n := copy(p, b.d.tmp[b.i:b.j])
	b.i += uint8(n)
	return n, nil
}
func (b *blockReader) close() error {
	if b.err == io.EOF {
		return nil
	} else if b.err != nil {
		return b.err
	}
	if b.i == b.j {
		b.fill()
		if b.err == io.EOF {
			return nil
		} else if b.err != nil {
			return b.err
		} else if b.j > 1 {
			return errTooMuch
		}
	}
	b.fill()
	if b.err == io.EOF {
		return nil
	} else if b.err != nil {
		return b.err
	}
	return errTooMuch
}
func (d *decoder) decode(r io.Reader, configOnly bool) error {
	if rr, ok := r.(reader); ok {
		d.r = rr
	} else {
		d.r = bufio.NewReader(r)
	}
	d.loopCount = -1
	err := d.readHeaderAndScreenDescriptor()
	if err != nil {
		return err
	}
	if configOnly {
		return nil
	}
	for {
		c, err := readByte(d.r)
		if err != nil {
			return fmt.Errorf("gif: reading frames: %v", err)
		}
		switch c {
		case sExtension:
			if err = d.readExtension(); err != nil {
				return err
			}
		case sImageDescriptor:
			if err = d.readImageDescriptor(); err != nil {
				return err
			}
		case sTrailer:
			if d.imageCount == 0 {
				return fmt.Errorf("gif: missing image data")
			}
			return nil
		default:
			return fmt.Errorf("gif: unknown block type: 0x%.2x", c)
		}
	}
}
func (d *decoder) readHeaderAndScreenDescriptor() error {
	err := readFull(d.r, d.tmp[:13])
	if err != nil {
		return fmt.Errorf("gif: reading header: %v", err)
	}
	d.vers = string(d.tmp[:6])
	if d.vers != "GIF87a" && d.vers != "GIF89a" {
		return fmt.Errorf("gif: can't recognize format %q", d.vers)
	}
	d.width = int(d.tmp[6]) + int(d.tmp[7])<<8
	d.height = int(d.tmp[8]) + int(d.tmp[9])<<8
	if fields := d.tmp[10]; fields&fColorTable != 0 {
		d.backgroundIndex = d.tmp[11]
		if err = d.readColorTable(fields); err != nil {
			return err
		}
		d.hasGlobalColorTable = true
	}
	return nil
}
func (d *decoder) readColorTable(fields byte) error {
	n := 1 << (1 + uint(fields&fColorTableBitsMask))
	err := readFull(d.r, d.tmp[:3*n])
	if err != nil {
		return fmt.Errorf("gif: reading color table: %s", err)
	}
	return nil
}
func (d *decoder) readExtension() error {
	extension, err := readByte(d.r)
	if err != nil {
		return fmt.Errorf("gif: reading extension: %v", err)
	}
	size := 0
	switch extension {
	case eText:
		size = 13
	case eGraphicControl:
		return d.readGraphicControl()
	case eComment:
	case eApplication:
		b, err := readByte(d.r)
		if err != nil {
			return fmt.Errorf("gif: reading extension: %v", err)
		}
		size = int(b)
	default:
		return fmt.Errorf("gif: unknown extension 0x%.2x", extension)
	}
	if size > 0 {
		if err := readFull(d.r, d.tmp[:size]); err != nil {
			return fmt.Errorf("gif: reading extension: %v", err)
		}
	}
	if extension == eApplication && string(d.tmp[:size]) == "NETSCAPE2.0" {
		n, err := d.readBlock()
		if err != nil {
			return fmt.Errorf("gif: reading extension: %v", err)
		}
		if n == 0 {
			return nil
		}
		if n == 3 && d.tmp[0] == 1 {
			d.loopCount = int(d.tmp[1]) | int(d.tmp[2])<<8
		}
	}
	for {
		n, err := d.readBlock()
		if err != nil {
			return fmt.Errorf("gif: reading extension: %v", err)
		}
		if n == 0 {
			return nil
		}
	}
}
func (d *decoder) readGraphicControl() error {
	if err := readFull(d.r, d.tmp[:6]); err != nil {
		return fmt.Errorf("gif: can't read graphic control: %s", err)
	}
	if d.tmp[0] != 4 {
		return fmt.Errorf("gif: invalid graphic control extension block size: %d", d.tmp[0])
	}
	flags := d.tmp[1]
	d.disposalMethod = (flags & gcDisposalMethodMask) >> 2
	d.delayTime = int(d.tmp[2]) | int(d.tmp[3])<<8
	if flags&gcTransparentColorSet != 0 {
		d.transparentIndex = d.tmp[4]
		d.hasTransparentIndex = true
	}
	if d.tmp[5] != 0 {
		return fmt.Errorf("gif: invalid graphic control extension block terminator: %d", d.tmp[5])
	}
	return nil
}
func (d *decoder) readImageDescriptor() error {
	w, h, err := d.readImageDimensionsFromDescriptor()
	if err != nil {
		return err
	}
	useLocalColorTable := d.imageFields&fColorTable != 0
	if useLocalColorTable {
		if err = d.readColorTable(d.imageFields); err != nil {
			return err
		}
	} else if !d.hasGlobalColorTable {
		return errors.New("gif: no color table")
	}
	litWidth, err := readByte(d.r)
	if err != nil {
		return fmt.Errorf("gif: reading image data: %v", err)
	}
	if litWidth < 2 || litWidth > 8 {
		return fmt.Errorf("gif: pixel size in decode out of range: %d", litWidth)
	}
	br := &blockReader{d: d}
	lzwr := lzw.NewReader(br, lzw.LSB, int(litWidth))
	defer lzwr.Close()
	if _, err := io.Copy(io.Discard, io.LimitReader(lzwr, int64(w*h))); err != nil {
		if err != io.ErrUnexpectedEOF {
			return fmt.Errorf("gif: reading image data: %v", err)
		}
		return errNotEnough
	}
	if n, err := lzwr.Read(d.tmp[256:257]); n != 0 || (err != io.EOF && err != io.ErrUnexpectedEOF) {
		if err != nil {
			return fmt.Errorf("gif: reading image data: %v", err)
		}
		return errTooMuch
	}
	if err := br.close(); err == errTooMuch {
		return errTooMuch
	} else if err != nil {
		return fmt.Errorf("gif: reading image data: %v", err)
	}
	d.imageCount += 1
	return nil
}
func (d *decoder) readImageDimensionsFromDescriptor() (int, int, error) {
	if err := readFull(d.r, d.tmp[:9]); err != nil {
		return 0, 0, fmt.Errorf("gif: can't read image descriptor: %s", err)
	}
	left := int(d.tmp[0]) + int(d.tmp[1])<<8
	top := int(d.tmp[2]) + int(d.tmp[3])<<8
	width := int(d.tmp[4]) + int(d.tmp[5])<<8
	height := int(d.tmp[6]) + int(d.tmp[7])<<8
	d.imageFields = d.tmp[8]
	if left+width > d.width || top+height > d.height {
		return 0, 0, errors.New("gif: frame bounds larger than image bounds")
	}
	return width, height, nil
}
func (d *decoder) readBlock() (int, error) {
	n, err := readByte(d.r)
	if n == 0 || err != nil {
		return 0, err
	}
	if err := readFull(d.r, d.tmp[:n]); err != nil {
		return 0, err
	}
	return int(n), nil
}
func CountGIFFrames(r io.Reader) (int, error) {
	var d decoder
	if err := d.decode(r, false); err != nil {
		return -1, err
	}
	return d.imageCount, nil
}
func GenGIFData(width, height uint16, nFrames int) []byte {
	header := []byte{
		'G', 'I', 'F', '8', '9', 'a',
		0, 0, 0, 0,
		128, 0, 0,
		0, 0, 0, 1, 1, 1,
	}
	binary.LittleEndian.PutUint16(header[6:], width)
	binary.LittleEndian.PutUint16(header[8:], height)
	frame := []byte{
		0x2c,
		0, 0, 0, 0, 1, 0, 1, 0,
		0,
		0x2, 0x2, 0x4c, 0x1, 0,
	}
	trailer := []byte{0x3b}
	gifData := header
	for range nFrames {
		gifData = append(gifData, frame...)
	}
	gifData = append(gifData, trailer...)
	return gifData
}