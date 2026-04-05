package templates
import (
	"bytes"
	"html/template"
	"io"
	"path/filepath"
	"sync"
	"github.com/mattermost/mattermost/server/v8/channels/utils/fileutils"
)
type Container struct {
	templates *template.Template
	mutex     sync.RWMutex
}
type Data struct {
	Props map[string]any
	HTML  map[string]template.HTML
}
func GetTemplateDirectory() (string, bool) {
	return fileutils.FindDir("templates")
}
func NewFromTemplate(templates *template.Template) *Container {
	return &Container{templates: templates}
}
func New(directory string) (*Container, error) {
	c := &Container{}
	htmlTemplates, err := template.ParseGlob(filepath.Join(directory, "*.html"))
	if err != nil {
		return nil, err
	}
	c.templates = htmlTemplates
	return c, nil
}
func (c *Container) RenderToString(templateName string, data Data) (string, error) {
	var text bytes.Buffer
	if err := c.Render(&text, templateName, data); err != nil {
		return "", err
	}
	return text.String(), nil
}
func (c *Container) Render(w io.Writer, templateName string, data Data) error {
	c.mutex.RLock()
	htmlTemplates := c.templates
	c.mutex.RUnlock()
	if err := htmlTemplates.ExecuteTemplate(w, templateName, data); err != nil {
		return err
	}
	return nil
}