package human
import (
	"bufio"
	"io"
)
type LogWriter interface {
	Write(e LogEntry)
}
func ProcessLogs(reader io.Reader, writer LogWriter) {
	scanner := bufio.NewScanner(reader)
	for scanner.Scan() {
		s := scanner.Text()
		e := ParseLogMessage(s)
		writer.Write(e)
	}
}