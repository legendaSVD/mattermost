package filestore
import (
	"context"
	"net/http"
	"github.com/minio/minio-go/v7/pkg/credentials"
)
type customTransport struct {
	host   string
	scheme string
	client http.Client
}
func (t *customTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	newReq := req.Clone(context.Background())
	*newReq.URL = *req.URL
	req.URL.Scheme = t.scheme
	req.URL.Host = t.host
	return t.client.Do(req)
}
type customProvider struct {
	isSignV2 bool
}
func (cp customProvider) RetrieveWithCredContext(_ *credentials.CredContext) (credentials.Value, error) {
	return cp.Retrieve()
}
func (cp customProvider) Retrieve() (credentials.Value, error) {
	sign := credentials.SignatureV4
	if cp.isSignV2 {
		sign = credentials.SignatureV2
	}
	return credentials.Value{
		SignerType: sign,
	}, nil
}
func (cp customProvider) IsExpired() bool { return false }