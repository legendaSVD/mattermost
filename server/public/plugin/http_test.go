package plugin
import (
	"net/http"
	"net/http/httptest"
	"testing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)
func TestFlushGracefulDegradation(t *testing.T) {
	type basicWriter struct {
		http.ResponseWriter
	}
	mockWriter := &basicWriter{
		ResponseWriter: httptest.NewRecorder(),
	}
	_, ok := any(mockWriter).(http.Flusher)
	require.False(t, ok, "basicWriter should not implement http.Flusher")
	server := &httpResponseWriterRPCServer{
		w: mockWriter,
	}
	assert.NotPanics(t, func() {
		err := server.Flush(struct{}{}, &struct{}{})
		assert.NoError(t, err)
	})
}