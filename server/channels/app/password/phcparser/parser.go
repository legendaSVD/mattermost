package phcparser
import (
	"bufio"
	"bytes"
	"fmt"
	"io"
)
type PHC struct {
	Id string
	Version string
	Params map[string]string
	Salt string
	Hash string
}
type Parser struct {
	reader *bufio.Reader
}
const MaxRunes = 256
func New(r io.Reader) *Parser {
	return &Parser{reader: bufio.NewReader(io.LimitReader(r, MaxRunes))}
}
type Token uint
const (
	ILLEGAL Token = 1 << iota
	EOF
	DOLLARSIGN
	COMMA
	EQUALSIGN
	FUNCTIONID
	PARAMNAME
	PARAMVALUE
	B64ENCODED
)
const (
	IDENT Token = FUNCTIONID | PARAMNAME | PARAMVALUE | B64ENCODED
)
const eof = rune(0)
func isLowercaseLetter(ch rune) bool {
	return (ch >= 'a' && ch <= 'z')
}
func isLetter(ch rune) bool {
	return (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z')
}
func isDigit(ch rune) bool {
	return (ch >= '0' && ch <= '9')
}
func isB64(ch rune) bool {
	return isLetter(ch) || isDigit(ch) || ch == '+' || ch == '/'
}
func isSymbol(ch rune) bool {
	return ch == '/' || ch == '+' || ch == '.' || ch == '-'
}
func isLowercaseLetterOrDigitOrMinus(ch rune) bool {
	return isLowercaseLetter(ch) || isDigit(ch) || ch == '-'
}
func isLetterOrDigitOrSymbol(ch rune) bool {
	return isLetter(ch) || isDigit(ch) || isSymbol(ch)
}
func none(ch rune) bool {
	return false
}
func (p *Parser) read() rune {
	ch, _, err := p.reader.ReadRune()
	if err != nil {
		return eof
	}
	return ch
}
func (p *Parser) unread() { _ = p.reader.UnreadRune() }
func (p *Parser) scan(isIdentAllowedRune func(rune) bool) (tok Token, lit string) {
	ch := p.read()
	if isIdentAllowedRune(ch) {
		p.unread()
		return p.scanIdent(isIdentAllowedRune)
	}
	switch ch {
	case eof:
		return EOF, ""
	case '$':
		return DOLLARSIGN, string(ch)
	case ',':
		return COMMA, string(ch)
	case '=':
		return EQUALSIGN, string(ch)
	}
	return ILLEGAL, string(ch)
}
func (p *Parser) scanIdent(isIdentAllowedRune func(rune) bool) (tok Token, lit string) {
	var buf bytes.Buffer
	buf.WriteRune(p.read())
	for {
		ch := p.read()
		if ch == eof {
			break
		}
		if !isIdentAllowedRune(ch) {
			p.unread()
			break
		}
		_, _ = buf.WriteRune(ch)
	}
	return IDENT, buf.String()
}
func (p *Parser) scanSeparator() (tok Token, lit string) {
	return p.scan(none)
}
func (p *Parser) parseToken(expected Token) (string, error) {
	var allowedRuneFunc func(rune) bool
	switch expected {
	case FUNCTIONID, PARAMNAME:
		allowedRuneFunc = isLowercaseLetterOrDigitOrMinus
	case PARAMVALUE:
		allowedRuneFunc = isLetterOrDigitOrSymbol
	case B64ENCODED:
		allowedRuneFunc = isB64
	default:
		allowedRuneFunc = none
	}
	token, literal := p.scan(allowedRuneFunc)
	if token&expected == 0 {
		return "", fmt.Errorf("found %q, expected '$'", literal)
	}
	return literal, nil
}
func (p *Parser) parseFunctionId() (string, error) {
	literal, err := p.parseToken(DOLLARSIGN)
	if err != nil {
		return literal, fmt.Errorf("found %q, expected '$'", literal)
	}
	literal, err = p.parseToken(FUNCTIONID)
	if err != nil {
		return literal, fmt.Errorf("found %q, expected a function identifier", literal)
	}
	return literal, nil
}
func (p *Parser) parseHash() (string, error) {
	hash, err := p.parseToken(B64ENCODED)
	if err != nil {
		return "", fmt.Errorf("found %q, expected the hash", hash)
	}
	literal, err := p.parseToken(EOF)
	if err != nil {
		return "", fmt.Errorf("found %q, expected EOF", literal)
	}
	return hash, nil
}
func (p *Parser) parseParamRHS() (string, error) {
	if literal, err := p.parseToken(EQUALSIGN); err != nil {
		return literal, err
	}
	return p.parseToken(PARAMVALUE)
}
func (p *Parser) Parse() (PHC, error) {
	out := PHC{}
	out.Params = make(map[string]string)
	id, err := p.parseFunctionId()
	if err != nil {
		return PHC{}, fmt.Errorf("failed to parse function ID: %w", err)
	}
	out.Id = id
	switch token, literal := p.scanSeparator(); token {
	case EOF:
		return out, nil
	case DOLLARSIGN:
		break
	default:
		return PHC{}, fmt.Errorf("found %q, expected '$' or EOF", literal)
	}
	versionKeyOrParamNameOrSalt, err := p.parseToken(B64ENCODED)
	if err != nil {
		return PHC{}, fmt.Errorf("found %q, expected the version key, 'v', a parameter name or the salt: %w", versionKeyOrParamNameOrSalt, err)
	}
	if versionKeyOrParamNameOrSalt == "v" {
		versionStr, err := p.parseParamRHS()
		if err != nil {
			return PHC{}, fmt.Errorf("failed parsing version string: %w", err)
		}
		out.Version = versionStr
		switch token, literal := p.scanSeparator(); token {
		case EOF:
			return out, nil
		case DOLLARSIGN:
			break
		default:
			return PHC{}, fmt.Errorf("found %q, expected '$' or EOF", literal)
		}
		versionKeyOrParamNameOrSalt, err = p.parseToken(B64ENCODED)
		if err != nil {
			return PHC{}, fmt.Errorf("found %q, expected a parameter name or the version key, 'v'", versionKeyOrParamNameOrSalt)
		}
	}
	paramNameOrSalt := versionKeyOrParamNameOrSalt
	switch token, literal := p.scanSeparator(); token {
	case EQUALSIGN:
		paramName := paramNameOrSalt
		if paramName == "v" {
			return PHC{}, fmt.Errorf("found 'v' as a parameter name, which is only allowed as the version key")
		}
		paramValue, err := p.parseToken(PARAMVALUE)
		if err != nil {
			return PHC{}, fmt.Errorf("found %q, expected a value for parameter %q", paramValue, paramName)
		}
		out.Params[paramName] = paramValue
	case DOLLARSIGN, EOF:
		salt := paramNameOrSalt
		out.Salt = salt
		if token == DOLLARSIGN {
			hash, err := p.parseHash()
			if err != nil {
				return PHC{}, err
			}
			out.Hash = hash
		}
		return out, nil
	default:
		return PHC{}, fmt.Errorf("found %q, expected either '$', or '=' or EOF", literal)
	}
	for {
		switch token, literal := p.scanSeparator(); token {
		case EOF:
			return out, nil
		case COMMA:
			paramName, err := p.parseToken(PARAMNAME)
			if err != nil {
				return PHC{}, err
			}
			paramValue, err := p.parseParamRHS()
			if err != nil {
				return PHC{}, fmt.Errorf("failed parsing value from parameter %q: %w", paramName, err)
			}
			out.Params[paramName] = paramValue
		case DOLLARSIGN:
			salt, err := p.parseToken(B64ENCODED)
			if err != nil {
				return PHC{}, err
			}
			out.Salt = salt
			switch token, newLiteral := p.scanSeparator(); token {
			case DOLLARSIGN:
				hash, err := p.parseHash()
				if err != nil {
					return PHC{}, err
				}
				out.Hash = hash
				return out, nil
			case EOF:
				return out, nil
			default:
				return PHC{}, fmt.Errorf("found %q, expected either '$', or EOF", newLiteral)
			}
		default:
			return PHC{}, fmt.Errorf("found %q, expected either ',', '$' or EOF", literal)
		}
	}
}