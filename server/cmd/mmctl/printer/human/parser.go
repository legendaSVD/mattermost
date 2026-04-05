package human
import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)
func ParseLogMessage(msg string) LogEntry {
	result, err := parseLogMessage(msg)
	if err != nil {
		var result2 LogEntry
		result2.Message = msg
		return result2
	}
	return result
}
func parseLogMessage(msg string) (result LogEntry, err error) {
	dec := json.NewDecoder(strings.NewReader(msg))
	token, err := dec.Token()
	if err != nil {
		return result, err
	}
	d, ok := token.(json.Delim)
	if !ok || d != '{' {
		return result, fmt.Errorf("input is not a JSON object, found: %v", token)
	}
	for dec.More() {
		key, err2 := dec.Token()
		if err2 != nil {
			return result, err2
		}
		skey, ok2 := key.(string)
		if !ok2 {
			return result, errors.New("key is not a value string")
		}
		if !dec.More() {
			return result, errors.New("missing value pair")
		}
		switch skey {
		case "ts":
			var ts json.Number
			if err2 := dec.Decode(&ts); err2 != nil {
				return result, err2
			}
			timeVal, err2 := numberToTime(ts)
			if err2 != nil {
				return result, err2
			}
			result.Time = timeVal
		case "level":
			s, err2 := decodeAsString(dec)
			if err2 != nil {
				return result, err2
			}
			result.Level = s
		case "msg":
			s, err2 := decodeAsString(dec)
			if err2 != nil {
				return result, err2
			}
			result.Message = s
		case "caller":
			s, err2 := decodeAsString(dec)
			if err2 != nil {
				return result, err2
			}
			result.Caller = s
		default:
			var p any
			if err2 := dec.Decode(&p); err2 != nil {
				return result, err2
			}
			var f mlog.Field
			f.Key = skey
			f.Interface = p
			result.Fields = append(result.Fields, f)
		}
	}
	token, err = dec.Token()
	if err != nil {
		return result, err
	}
	d, ok = token.(json.Delim)
	if !ok || d != '}' {
		return result, fmt.Errorf("failed to read '}', read: %v", token)
	}
	if token, err := dec.Token(); err != io.EOF {
		return result, err
	} else if token != nil {
		return result, errors.New("found trailing data")
	}
	return result, nil
}
func numberToTime(v json.Number) (time.Time, error) {
	var t time.Time
	flt, err := v.Float64()
	if err != nil {
		return t, err
	}
	s := v.String()
	if strings.ContainsAny(s, "eE") {
		s = strconv.FormatFloat(flt, 'f', -1, 64)
	}
	var nanos, sec int64
	parts := strings.SplitN(s, ".", 2)
	sec, err = strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return t, err
	}
	if len(parts) == 2 {
		nanosText := parts[1] + "000000000"
		nanosText = nanosText[:9]
		nanos, err = strconv.ParseInt(nanosText, 10, 64)
		if err != nil {
			return t, err
		}
	}
	t = time.Unix(sec, nanos)
	return t, nil
}
func decodeAsString(dec *json.Decoder) (s string, err error) {
	var v any
	if err = dec.Decode(&v); err != nil {
		return s, err
	}
	var ok bool
	if s, ok = v.(string); ok {
		return s, err
	}
	s = fmt.Sprint(v)
	return s, err
}