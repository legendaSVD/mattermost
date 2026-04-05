package opensearch
import (
	"context"
	"io"
	"time"
	"github.com/mattermost/mattermost/server/v8/enterprise/elasticsearch/common"
	"github.com/opensearch-project/opensearch-go/v4/opensearchutil"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/v8/channels/app"
)
type OpensearchIndexerInterfaceImpl struct {
	Server        *app.Server
	bulkProcessor opensearchutil.BulkIndexer
}
func (esi *OpensearchIndexerInterfaceImpl) MakeWorker() model.Worker {
	const workerName = "EnterpriseOpensearchIndexer"
	logger := esi.Server.Jobs.Logger().With(mlog.String("worker_name", workerName))
	client, appErr := createClient(logger, esi.Server.Jobs.Config(), esi.Server.Platform().FileBackend(), true)
	if appErr != nil {
		logger.Error("Worker: Failed to Create Client", mlog.Err(appErr))
		return nil
	}
	return common.NewIndexerWorker(workerName, model.ElasticsearchSettingsOSBackend,
		esi.Server.Jobs,
		logger,
		esi.Server.Platform().FileBackend(),
		esi.Server.License,
		func() error {
			biCfg := opensearchutil.BulkIndexerConfig{
				Client: client,
				OnError: func(_ context.Context, err error) {
					logger.Error("Error from opensearch bulk indexer", mlog.Err(err))
				},
				Timeout:    time.Duration(*esi.Server.Jobs.Config().ElasticsearchSettings.RequestTimeoutSeconds) * time.Second,
				NumWorkers: common.NumIndexWorkers(),
			}
			if *esi.Server.Jobs.Config().ElasticsearchSettings.Trace == "all" {
				biCfg.DebugLogger = common.NewBulkIndexerLogger(logger, workerName)
			}
			var err error
			esi.bulkProcessor, err = opensearchutil.NewBulkIndexer(biCfg)
			return err
		},
		func(indexName, indexOp, docID string, body io.ReadSeeker) error {
			return esi.bulkProcessor.Add(context.Background(), opensearchutil.BulkIndexerItem{
				Index:      indexName,
				Action:     indexOp,
				DocumentID: docID,
				Body:       body,
			})
		},
		func() error {
			return esi.bulkProcessor.Close(context.Background())
		})
}