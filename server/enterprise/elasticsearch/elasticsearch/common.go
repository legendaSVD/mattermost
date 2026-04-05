package elasticsearch
import (
	"crypto/tls"
	"net/http"
	"time"
	"github.com/elastic/go-elasticsearch/v8"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/v8/enterprise/elasticsearch/common"
	"github.com/mattermost/mattermost/server/v8/platform/shared/filestore"
)
func createTypedClient(logger mlog.LoggerIFace, cfg *model.Config, fileBackend filestore.FileBackend, debugLogging bool) (*elasticsearch.TypedClient, *model.AppError) {
	esCfg, appErr := createClientConfig(logger, cfg, fileBackend, debugLogging)
	if appErr != nil {
		return nil, appErr
	}
	client, err := elasticsearch.NewTypedClient(*esCfg)
	if err != nil {
		return nil, model.NewAppError("Elasticsearch.createClient", "ent.elasticsearch.create_client.connect_failed", map[string]any{"Backend": model.ElasticsearchSettingsESBackend}, "", http.StatusInternalServerError).Wrap(err)
	}
	return client, nil
}
func createUntypedClient(logger mlog.LoggerIFace, cfg *model.Config, fileBackend filestore.FileBackend) (*elasticsearch.Client, *model.AppError) {
	esCfg, appErr := createClientConfig(logger, cfg, fileBackend, true)
	if appErr != nil {
		return nil, appErr
	}
	client, err := elasticsearch.NewClient(*esCfg)
	if err != nil {
		return nil, model.NewAppError("Elasticsearch.createClient", "ent.elasticsearch.create_client.connect_failed", map[string]any{"Backend": model.ElasticsearchSettingsESBackend}, "", http.StatusInternalServerError).Wrap(err)
	}
	return client, nil
}
func createClientConfig(logger mlog.LoggerIFace, cfg *model.Config, fileBackend filestore.FileBackend, debugLogging bool) (*elasticsearch.Config, *model.AppError) {
	tp := http.DefaultTransport.(*http.Transport).Clone()
	tp.TLSClientConfig = &tls.Config{
		InsecureSkipVerify: *cfg.ElasticsearchSettings.SkipTLSVerification,
	}
	esCfg := &elasticsearch.Config{
		Addresses:            []string{*cfg.ElasticsearchSettings.ConnectionURL},
		RetryBackoff:         func(i int) time.Duration { return time.Duration(i) * 100 * time.Millisecond },
		RetryOnStatus:        []int{502, 503, 504, 429},
		MaxRetries:           3,
		DiscoverNodesOnStart: *cfg.ElasticsearchSettings.Sniff,
	}
	if esCfg.DiscoverNodesOnStart {
		esCfg.DiscoverNodesInterval = 30 * time.Second
	}
	if *cfg.ElasticsearchSettings.ClientCert != "" {
		appErr := configureClientCertificate(tp.TLSClientConfig, cfg, fileBackend)
		if appErr != nil {
			return nil, appErr
		}
	}
	if *cfg.ElasticsearchSettings.CA != "" {
		appErr := configureCA(esCfg, cfg, fileBackend)
		if appErr != nil {
			return nil, appErr
		}
	}
	esCfg.Transport = tp
	if *cfg.ElasticsearchSettings.Username != "" {
		esCfg.Username = *cfg.ElasticsearchSettings.Username
		esCfg.Password = *cfg.ElasticsearchSettings.Password
	}
	if *cfg.ElasticsearchSettings.Trace == "all" && debugLogging {
		esCfg.EnableDebugLogger = true
	}
	esCfg.Logger = common.NewLogger("Elasticsearch", logger, *cfg.ElasticsearchSettings.Trace == "all")
	return esCfg, nil
}
func configureCA(esCfg *elasticsearch.Config, cfg *model.Config, fb filestore.FileBackend) *model.AppError {
	clientCA, err := common.ReadFileSafely(fb, *cfg.ElasticsearchSettings.CA)
	if err != nil {
		return model.NewAppError("Elasticsearch.createClient", "ent.elasticsearch.create_client.ca_cert_missing", map[string]any{"Backend": model.ElasticsearchSettingsESBackend}, "", http.StatusInternalServerError).Wrap(err)
	}
	esCfg.CACert = clientCA
	return nil
}
func configureClientCertificate(tlsConfig *tls.Config, cfg *model.Config, fb filestore.FileBackend) *model.AppError {
	clientCert, err := common.ReadFileSafely(fb, *cfg.ElasticsearchSettings.ClientCert)
	if err != nil {
		return model.NewAppError("Elasticsearch.createClient", "ent.elasticsearch.create_client.client_cert_missing", map[string]any{"Backend": model.ElasticsearchSettingsESBackend}, "", http.StatusInternalServerError).Wrap(err)
	}
	clientKey, err := common.ReadFileSafely(fb, *cfg.ElasticsearchSettings.ClientKey)
	if err != nil {
		return model.NewAppError("Elasticsearch.createClient", "ent.elasticsearch.create_client.client_key_missing", map[string]any{"Backend": model.ElasticsearchSettingsESBackend}, "", http.StatusInternalServerError).Wrap(err)
	}
	certificate, err := tls.X509KeyPair(clientCert, clientKey)
	if err != nil {
		return model.NewAppError("Elasticsearch.createClient", "ent.elasticsearch.create_client.client_cert_malformed", map[string]any{"Backend": model.ElasticsearchSettingsESBackend}, "", http.StatusInternalServerError).Wrap(err)
	}
	tlsConfig.Certificates = []tls.Certificate{certificate}
	return nil
}