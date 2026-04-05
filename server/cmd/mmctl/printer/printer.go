package printer
import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"text/template"
	"github.com/fatih/color"
	"github.com/spf13/cobra"
)
const (
	FormatPlain = "plain"
	FormatJSON  = "json"
)
type Printer struct {
	writer  io.Writer
	eWriter io.Writer
	Format        string
	Single        bool
	NoNewline     bool
	templateFuncs template.FuncMap
	pager         bool
	Quiet         bool
	Lines         []any
	ErrorLines    []string
	cmd        *cobra.Command
	serverAddr string
}
type printOpts struct {
	format    string
	pagerPath string
	single    bool
	usePager  bool
	shortStat bool
	noNewline bool
}
var printer Printer
func init() {
	printer.writer = os.Stdout
	printer.eWriter = os.Stderr
	printer.pager = true
	printer.templateFuncs = make(template.FuncMap)
}
func SetFormat(t string) {
	printer.Format = t
}
func SetCommand(cmd *cobra.Command) {
	printer.cmd = cmd
}
func SetServerAddres(addr string) {
	printer.serverAddr = addr
}
func OverrideEnablePager(enable bool) {
	printer.pager = enable
}
func SetQuiet(q bool) {
	printer.Quiet = q
}
func SetNoNewline(no bool) {
	printer.NoNewline = no
}
func SetTemplateFunc(name string, f any) {
	printer.templateFuncs[name] = f
}
func SetSingle(single bool) {
	printer.Single = single
}
func PrintT(templateString string, v any) {
	if printer.Quiet {
		return
	}
	switch printer.Format {
	case FormatPlain:
		tpl := template.Must(template.New("").Funcs(printer.templateFuncs).Parse(templateString))
		sb := &strings.Builder{}
		if err := tpl.Execute(sb, v); err != nil {
			PrintError("Can't print the message using the provided template: " + templateString)
			return
		}
		printer.Lines = append(printer.Lines, sb.String())
	case FormatJSON:
		printer.Lines = append(printer.Lines, v)
	}
}
func PrintPreparedT(tpl *template.Template, v any) {
	if printer.Quiet {
		return
	}
	switch printer.Format {
	case FormatPlain:
		sb := &strings.Builder{}
		if err := tpl.Execute(sb, v); err != nil {
			PrintError("Can't print the message using the provided template: " + err.Error())
			return
		}
		printer.Lines = append(printer.Lines, sb.String())
	case FormatJSON:
		printer.Lines = append(printer.Lines, v)
	}
}
func Print(v any) {
	PrintT("{{printf \"%+v\" .}}", v)
}
func Flush() error {
	if printer.Quiet {
		return nil
	}
	opts := printOpts{
		format:    printer.Format,
		single:    printer.Single,
		noNewline: printer.NoNewline,
	}
	cmd := printer.cmd
	if cmd != nil {
		shortStat, err := printer.cmd.Flags().GetBool("short-stat")
		if err == nil && printer.cmd.Name() == "list" && printer.cmd.Parent().Name() != "auth" {
			opts.shortStat = shortStat
		}
	}
	b, err := printer.linesToBytes(opts)
	if err != nil {
		return err
	}
	lines := lineCount(b)
	isTTY := checkInteractiveTerminal() == nil
	var enablePager bool
	termHeight, err := termHeight(os.Stdout)
	if err == nil {
		enablePager = isTTY && (termHeight < lines)
	}
	pager := os.Getenv("PAGER")
	if enablePager {
		enablePager = pager != ""
	}
	opts.usePager = enablePager && printer.pager
	opts.pagerPath = pager
	err = printer.printBytes(b, opts)
	if err != nil {
		return err
	}
	printer.printErrors()
	defer func() {
		printer.Lines = []any{}
		printer.ErrorLines = []string{}
	}()
	if cmd == nil || cmd.Name() != "list" || printer.cmd.Parent().Name() == "auth" {
		return nil
	}
	noStat, err := cmd.Flags().GetBool("no-stat")
	if err != nil {
		return err
	}
	switch {
	case noStat:
	case !opts.shortStat:
		if isTTY && !enablePager {
			fmt.Fprintf(printer.eWriter, "\n")
		}
		fallthrough
	case len(printer.Lines) > 0:
		entity := cmd.Parent().Name()
		container := strings.TrimSuffix(printer.serverAddr, "api/v4")
		if container != "" {
			container = fmt.Sprintf(" on %s", container)
		}
		fmt.Fprintf(printer.eWriter, "There are %d %ss%s\n", len(printer.Lines), entity, container)
	}
	return nil
}
func Clean() {
	printer.Lines = []any{}
	printer.ErrorLines = []string{}
}
func GetLines() []any {
	return printer.Lines
}
func GetErrorLines() []string {
	return printer.ErrorLines
}
func PrintError(msg string) {
	printer.ErrorLines = append(printer.ErrorLines, msg)
}
func PrintWarning(msg string) {
	if printer.Quiet {
		return
	}
	fmt.Fprintf(printer.eWriter, "%s\n", color.YellowString("WARNING: %s", msg))
}
func (p Printer) linesToBytes(opts printOpts) (b []byte, err error) {
	if opts.shortStat {
		return
	}
	newline := "\n"
	if opts.noNewline {
		newline = ""
	}
	switch opts.format {
	case FormatPlain:
		var buf bytes.Buffer
		for i := range p.Lines {
			line := fmt.Sprintf("%s", p.Lines[i])
			fmt.Fprintf(&buf, "%s%s", SanitizeForTerminal(line), newline)
		}
		b = buf.Bytes()
	case FormatJSON:
		switch {
		case opts.single && len(p.Lines) == 0:
			return
		case opts.single && len(p.Lines) == 1:
			b, err = json.MarshalIndent(p.Lines[0], "", "  ")
		default:
			b, err = json.MarshalIndent(p.Lines, "", "  ")
		}
		b = append(b, '\n')
	}
	return
}
func (p Printer) printBytes(b []byte, opts printOpts) error {
	if !opts.usePager {
		fmt.Fprintf(p.writer, "%s", b)
		return nil
	}
	c := exec.Command(opts.pagerPath)
	in, err := c.StdinPipe()
	if err != nil {
		return fmt.Errorf("could not create the stdin pipe: %w", err)
	}
	c.Stdout = p.writer
	c.Stderr = p.eWriter
	go func() {
		defer in.Close()
		_, _ = io.Copy(in, bytes.NewReader(b))
	}()
	if err := c.Start(); err != nil {
		return fmt.Errorf("could not start the pager: %w", err)
	}
	return c.Wait()
}
func (p Printer) printErrors() {
	for i := range printer.ErrorLines {
		fmt.Fprintln(printer.eWriter, printer.ErrorLines[i])
	}
}