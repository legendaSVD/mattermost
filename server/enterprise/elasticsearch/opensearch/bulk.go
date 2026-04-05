package opensearch
import (
	"bytes"
	"context"
	"encoding/json"
	"sync"
	"time"
	"github.com/elastic/go-elasticsearch/v8/typedapi/types"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/v8/enterprise/elasticsearch/common"
	"github.com/opensearch-project/opensearch-go/v4/opensearchapi"
)
type Bulk struct {
	mut sync.Mutex
	buf *bytes.Buffer
	client       *opensearchapi.Client
	bulkSettings common.BulkSettings
	reqTimeout   time.Duration
	logger       mlog.LoggerIFace
	quitFlusher   chan struct{}
	quitFlusherWg sync.WaitGroup
	pendingRequests int
}
func NewBulk(bulkSettings common.BulkSettings,
	client *opensearchapi.Client,
	reqTimeout time.Duration,
	logger mlog.LoggerIFace,
) *Bulk {
	b := &Bulk{
		bulkSettings: bulkSettings,
		reqTimeout:   reqTimeout,
		logger:       logger,
		client:       client,
		quitFlusher:  make(chan struct{}),
		buf:          &bytes.Buffer{},
	}
	if bulkSettings.FlushInterval > 0 {
		b.quitFlusherWg.Add(1)
		go b.periodicFlusher()
	}
	return b
}
func (r *Bulk) IndexOp(op *types.IndexOperation, doc any) error {
	r.mut.Lock()
	defer r.mut.Unlock()
	operation := types.OperationContainer{Index: op}
	header, err := json.Marshal(operation)
	if err != nil {
		return err
	}
	r.buf.Write(header)
	r.buf.Write([]byte("\n"))
	switch v := doc.(type) {
	case []byte:
		r.buf.Write(v)
	case json.RawMessage:
		r.buf.Write(v)
	default:
		body, err := json.Marshal(doc)
		if err != nil {
			return err
		}
		r.buf.Write(body)
	}
	r.buf.Write([]byte("\n"))
	return r.flushIfNecessary()
}
func (r *Bulk) DeleteOp(op *types.DeleteOperation) error {
	r.mut.Lock()
	defer r.mut.Unlock()
	operation := types.OperationContainer{Delete: op}
	header, err := json.Marshal(operation)
	if err != nil {
		return err
	}
	r.buf.Write(header)
	r.buf.Write([]byte("\n"))
	return r.flushIfNecessary()
}
func (r *Bulk) flushIfNecessary() error {
	if r.bulkSettings.FlushBytes > 0 {
		if r.buf.Len() >= r.bulkSettings.FlushBytes {
			return r._flush()
		}
	}
	r.pendingRequests++
	if r.bulkSettings.FlushNumReqs > 0 {
		if r.pendingRequests > r.bulkSettings.FlushNumReqs {
			return r._flush()
		}
	}
	return nil
}
func (r *Bulk) Stop() error {
	r.mut.Lock()
	defer r.mut.Unlock()
	r.logger.Info("Stopping Bulk processor")
	if r.pendingRequests > 0 {
		return r._flush()
	}
	if r.bulkSettings.FlushInterval > 0 {
		close(r.quitFlusher)
		r.quitFlusherWg.Wait()
	}
	return nil
}
func (r *Bulk) periodicFlusher() {
	defer r.quitFlusherWg.Done()
	for {
		select {
		case <-time.After(r.bulkSettings.FlushInterval):
			r.mut.Lock()
			if r.pendingRequests > 0 {
				if err := r._flush(); err != nil {
					r.logger.Warn("Error flushing live indexing buffer", mlog.Err(err))
				}
			}
			r.mut.Unlock()
		case <-r.quitFlusher:
			return
		}
	}
}
func (r *Bulk) _flush() error {
	if r.pendingRequests == 0 {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), r.reqTimeout)
	defer cancel()
	_, err := r.client.Bulk(ctx, opensearchapi.BulkReq{
		Body: bytes.NewReader(r.buf.Bytes()),
	})
	if err != nil {
		return err
	}
	r.buf.Reset()
	r.pendingRequests = 0
	return nil
}
func (r *Bulk) Flush() error {
	r.mut.Lock()
	defer r.mut.Unlock()
	return r._flush()
}