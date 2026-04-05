package i18n
import (
	"fmt"
	"html/template"
	"net/http"
	"os"
	"path/filepath"
	"reflect"
	"slices"
	"strings"
	"sync"
	"github.com/mattermost/go-i18n/i18n"
	"github.com/mattermost/go-i18n/i18n/bundle"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)
var mut sync.Mutex
const defaultLocale = "en"
type TranslateFunc func(translationID string, args ...any) string
type TranslationFuncByLocal func(locale string) TranslateFunc
var (
	t        TranslateFunc
	tDefault TranslateFunc
)
var T TranslateFunc = func(translationID string, args ...any) string {
	mut.Lock()
	defer mut.Unlock()
	if t == nil {
		return translationID
	}
	return t(translationID, args...)
}
var TDefault TranslateFunc = func(translationID string, args ...any) string {
	mut.Lock()
	defer mut.Unlock()
	if tDefault == nil {
		return translationID
	}
	return t(translationID, args...)
}
var locales = make(map[string]string)
var supportedLocales = []string{
	"de",
	"en",
	"en-AU",
	"es",
	"fr",
	"it",
	"hu",
	"nl",
	"pl",
	"pt-BR",
	"ro",
	"sv",
	"vi",
	"tr",
	"bg",
	"ru",
	"uk",
	"fa",
	"ko",
	"zh-CN",
	"zh-TW",
	"ja",
}
var (
	defaultServerLocale string
	defaultClientLocale string
)
func TranslationsPreInit(translationsDir string) error {
	mut.Lock()
	defer mut.Unlock()
	if t != nil {
		return nil
	}
	t = tfuncWithFallback(defaultLocale)
	tDefault = tfuncWithFallback(defaultLocale)
	return initTranslationsWithDir(translationsDir)
}
func TranslationsPreInitFromFileBytes(filename string, buf []byte) error {
	mut.Lock()
	defer mut.Unlock()
	if t != nil {
		return nil
	}
	t = tfuncWithFallback(defaultLocale)
	tDefault = tfuncWithFallback(defaultLocale)
	locale := strings.Split(filename, ".")[0]
	if !isSupportedLocale(locale) {
		return fmt.Errorf("locale not supported: %s", locale)
	}
	locales[locale] = filename
	return i18n.ParseTranslationFileBytes(filename, buf)
}
func InitTranslations(serverLocale, clientLocale string) error {
	mut.Lock()
	defaultServerLocale = serverLocale
	defaultClientLocale = clientLocale
	mut.Unlock()
	tfn, err := GetTranslationsBySystemLocale()
	mut.Lock()
	t = tfn
	mut.Unlock()
	return err
}
func initTranslationsWithDir(dir string) error {
	files, _ := os.ReadDir(dir)
	for _, f := range files {
		if filepath.Ext(f.Name()) == ".json" {
			filename := f.Name()
			locale := strings.Split(filename, ".")[0]
			if !isSupportedLocale(locale) {
				continue
			}
			locales[locale] = filepath.Join(dir, filename)
			if err := i18n.LoadTranslationFile(filepath.Join(dir, filename)); err != nil {
				return err
			}
		}
	}
	return nil
}
func GetTranslationFuncForDir(dir string) (TranslationFuncByLocal, error) {
	availableLocals := make(map[string]string)
	bundle := bundle.New()
	files, _ := os.ReadDir(dir)
	for _, f := range files {
		if filepath.Ext(f.Name()) != ".json" {
			continue
		}
		locale := strings.Split(f.Name(), ".")[0]
		if !isSupportedLocale(locale) {
			continue
		}
		filename := f.Name()
		availableLocals[locale] = filepath.Join(dir, filename)
		if err := bundle.LoadTranslationFile(filepath.Join(dir, filename)); err != nil {
			return nil, err
		}
	}
	return func(locale string) TranslateFunc {
		if _, ok := availableLocals[locale]; !ok {
			locale = defaultLocale
		}
		t, _ := bundle.Tfunc(locale)
		return func(translationID string, args ...any) string {
			if translated := t(translationID, args...); translated != translationID {
				return translated
			}
			t, _ := bundle.Tfunc(defaultLocale)
			return t(translationID, args...)
		}
	}, nil
}
func GetTranslationsBySystemLocale() (TranslateFunc, error) {
	mut.Lock()
	defer mut.Unlock()
	locale := defaultServerLocale
	if _, ok := locales[locale]; !ok {
		mlog.Warn("Failed to load system translations for selected locale, attempting to fall back to default", mlog.String("locale", locale), mlog.String("default_locale", defaultLocale))
		locale = defaultLocale
	}
	if !isSupportedLocale(locale) {
		mlog.Warn("Selected locale is unsupported, attempting to fall back to default", mlog.String("locale", locale), mlog.String("default_locale", defaultLocale))
		locale = defaultLocale
	}
	if locales[locale] == "" {
		return nil, fmt.Errorf("failed to load system translations for '%v'", defaultLocale)
	}
	translations := tfuncWithFallback(locale)
	if translations == nil {
		return nil, fmt.Errorf("failed to load system translations")
	}
	mlog.Info("Loaded system translations", mlog.String("for locale", locale), mlog.String("from locale", locales[locale]))
	return translations, nil
}
func GetUserTranslations(locale string) TranslateFunc {
	mut.Lock()
	defer mut.Unlock()
	if _, ok := locales[locale]; !ok {
		locale = defaultLocale
	}
	translations := tfuncWithFallback(locale)
	return translations
}
func GetTranslationsAndLocaleFromRequest(r *http.Request) (TranslateFunc, string) {
	mut.Lock()
	defer mut.Unlock()
	headerLocaleFull := strings.Split(r.Header.Get("Accept-Language"), ",")[0]
	headerLocale := strings.Split(strings.Split(r.Header.Get("Accept-Language"), ",")[0], "-")[0]
	defaultLocale := defaultClientLocale
	if locales[headerLocaleFull] != "" {
		translations := tfuncWithFallback(headerLocaleFull)
		return translations, headerLocaleFull
	} else if locales[headerLocale] != "" {
		translations := tfuncWithFallback(headerLocale)
		return translations, headerLocale
	} else if locales[defaultLocale] != "" {
		translations := tfuncWithFallback(defaultLocale)
		return translations, headerLocale
	}
	translations := tfuncWithFallback(defaultLocale)
	return translations, defaultLocale
}
func GetSupportedLocales() map[string]string {
	mut.Lock()
	defer mut.Unlock()
	return locales
}
func tfuncWithFallback(pref string) TranslateFunc {
	t, _ := i18n.Tfunc(pref)
	return func(translationID string, args ...any) string {
		if translated := t(translationID, args...); translated != translationID {
			return translated
		}
		t, _ := i18n.Tfunc(defaultLocale)
		return t(translationID, args...)
	}
}
func TranslateAsHTML(t TranslateFunc, translationID string, args map[string]any) template.HTML {
	message := t(translationID, escapeForHTML(args))
	message = strings.Replace(message, "[[", "<strong>", -1)
	message = strings.Replace(message, "]]", "</strong>", -1)
	return template.HTML(message)
}
func escapeForHTML(arg any) any {
	switch typedArg := arg.(type) {
	case string:
		return template.HTMLEscapeString(typedArg)
	case *string:
		return template.HTMLEscapeString(*typedArg)
	case map[string]any:
		safeArg := make(map[string]any, len(typedArg))
		for key, value := range typedArg {
			safeArg[key] = escapeForHTML(value)
		}
		return safeArg
	default:
		mlog.Warn(
			"Unable to escape value for HTML template",
			mlog.Any("html_template", arg),
			mlog.String("template_type", reflect.ValueOf(arg).Type().String()),
		)
		return ""
	}
}
func IdentityTfunc() TranslateFunc {
	return func(translationID string, args ...any) string {
		return translationID
	}
}
func isSupportedLocale(locale string) bool {
	return slices.Contains(supportedLocales, locale)
}