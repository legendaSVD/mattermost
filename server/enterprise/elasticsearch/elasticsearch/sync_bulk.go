package elasticsearch
import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"time"
	elastic "github.com/elastic/go-elasticsearch/v8"
	"github.com/elastic/go-elasticsearch/v8/esutil"
	"github.com/elastic/go-elasticsearch/v8/typedapi/types"
	"github.com/mattermost/mattermost/server/v8/enterprise/elasticsearch/common"
)
type SyncBulk struct {
	client      *elastic.TypedClient
	bulkIndexer esutil.BulkIndexer
}
func NewSyncBulk(client *elastic.TypedClient) (*SyncBulk, error) {
	bulkIndexer, err := newBulkIndexer(client)
	if err != nil {
		return nil, err
	}
	return &SyncBulk{client, bulkIndexer}, nil
}
func newBulkIndexer(client *elastic.TypedClient) (esutil.BulkIndexer, error) {
	return esutil.NewBulkIndexer(esutil.BulkIndexerConfig{
		Client:        client,
		FlushBytes:    common.BulkFlushBytes,
		FlushInterval: 30 * time.Second,
	})
}
func (r *SyncBulk) IndexOp(op types.IndexOperation, doc any) error {
	var body io.ReadSeeker
	switch v := doc.(type) {
	case []byte:
		body = bytes.NewReader(v)
	case json.RawMessage:
		body = bytes.NewReader(v)
	default:
		data, err := json.Marshal(doc)
		if err != nil {
			return err
		}
		body = bytes.NewReader(data)
	}
	return r.bulkIndexer.Add(context.Background(), esutil.BulkIndexerItem{
		Index:      *op.Index_,
		Action:     "index",
		DocumentID: *op.Id_,
		Body:       body,
	})
}
func (r *SyncBulk) DeleteOp(op types.DeleteOperation) error {
	return r.bulkIndexer.Add(context.Background(), esutil.BulkIndexerItem{
		Index:      *op.Index_,
		Action:     "delete",
		DocumentID: *op.Id_,
	})
}
func (r *SyncBulk) Stop() error {
	return r.bulkIndexer.Close(context.Background())
}
func (r *SyncBulk) Flush() error {
	if err := r.bulkIndexer.Close(context.Background()); err != nil {
		return err
	}
	bulkIndexer, err := newBulkIndexer(r.client)
	if err != nil {
		return fmt.Errorf("unable to restart bulk indexer: %w", err)
	}
	r.bulkIndexer = bulkIndexer
	return nil
}