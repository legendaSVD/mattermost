package httpservice
import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"strings"
	"time"
	"golang.org/x/net/http/httpproxy"
)
const (
	ConnectTimeout = 3 * time.Second
	RequestTimeout = 30 * time.Second
)
var reservedIPRanges []*net.IPNet
func IsReservedIP(ip net.IP) bool {
	if ip4 := ip.To4(); ip4 != nil {
		ip = ip4
	}
	for _, ipRange := range reservedIPRanges {
		if ipRange.Contains(ip) {
			return true
		}
	}
	return false
}
func IsOwnIP(ip net.IP) (bool, error) {
	interfaces, err := net.Interfaces()
	if err != nil {
		return false, err
	}
	for _, interf := range interfaces {
		addresses, err := interf.Addrs()
		if err != nil {
			return false, err
		}
		for _, addr := range addresses {
			var selfIP net.IP
			switch v := addr.(type) {
			case *net.IPNet:
				selfIP = v.IP
			case *net.IPAddr:
				selfIP = v.IP
			}
			if ip.Equal(selfIP) {
				return true, nil
			}
		}
	}
	return false, nil
}
var defaultUserAgent string
func init() {
	for _, cidr := range []string{
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
		"127.0.0.0/8",
		"0.0.0.0/8",
		"169.254.0.0/16",
		"192.0.0.0/24",
		"192.0.2.0/24",
		"198.51.100.0/24",
		"203.0.113.0/24",
		"192.88.99.0/24",
		"198.18.0.0/15",
		"224.0.0.0/4",
		"240.0.0.0/4",
		"255.255.255.255/32",
		"100.64.0.0/10",
		"::/128",
		"::1/128",
		"100::/64",
		"2001::/23",
		"2001:2::/48",
		"2001:db8::/32",
		"2001::/32",
		"fc00::/7",
		"fe80::/10",
		"ff00::/8",
		"2002::/16",
		"64:ff9b::/96",
		"2001:10::/28",
		"2001:20::/28",
	} {
		_, parsed, err := net.ParseCIDR(cidr)
		if err != nil {
			panic(err)
		}
		reservedIPRanges = append(reservedIPRanges, parsed)
	}
	defaultUserAgent = "Mattermost-Bot/1.1"
}
type DialContextFunction func(ctx context.Context, network, addr string) (net.Conn, error)
var ErrAddressForbidden = errors.New("address forbidden, you may need to set AllowedUntrustedInternalConnections to allow an integration access to your internal network")
func dialContextFilter(dial DialContextFunction, allowHost func(host string) bool, allowIP func(ip net.IP) error) DialContextFunction {
	return func(ctx context.Context, network, addr string) (net.Conn, error) {
		host, port, err := net.SplitHostPort(addr)
		if err != nil {
			return nil, err
		}
		if allowHost != nil && allowHost(host) {
			return dial(ctx, network, addr)
		}
		ips, err := net.LookupIP(host)
		if err != nil {
			return nil, err
		}
		var firstDialErr error
		var forbiddenReasons []string
		for _, ip := range ips {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			default:
			}
			if allowIP == nil {
				forbiddenReasons = append(forbiddenReasons, fmt.Sprintf("IP %s is not allowed", ip))
				continue
			}
			if err := allowIP(ip); err != nil {
				forbiddenReasons = append(forbiddenReasons, err.Error())
				continue
			}
			conn, err := dial(ctx, network, net.JoinHostPort(ip.String(), port))
			if err == nil {
				return conn, nil
			}
			if firstDialErr == nil {
				firstDialErr = err
			}
		}
		if firstDialErr == nil {
			if len(forbiddenReasons) > 0 {
				return nil, fmt.Errorf("%s: %s", ErrAddressForbidden.Error(), strings.Join(forbiddenReasons, "; "))
			}
			return nil, ErrAddressForbidden
		}
		return nil, firstDialErr
	}
}
func getProxyFn() func(r *http.Request) (*url.URL, error) {
	proxyFromEnvFn := httpproxy.FromEnvironment().ProxyFunc()
	return func(r *http.Request) (*url.URL, error) {
		if r.URL != nil {
			if addr, err := netip.ParseAddr(r.URL.Hostname()); err == nil && addr.Is6() && addr.Zone() != "" {
				return nil, fmt.Errorf("invalid IPv6 address in URL: %q", addr)
			}
		}
		return proxyFromEnvFn(r.URL)
	}
}
func NewTransport(enableInsecureConnections bool, allowHost func(host string) bool, allowIP func(ip net.IP) error) *MattermostTransport {
	dialContext := (&net.Dialer{
		Timeout:   ConnectTimeout,
		KeepAlive: 30 * time.Second,
	}).DialContext
	if allowHost != nil || allowIP != nil {
		dialContext = dialContextFilter(dialContext, allowHost, allowIP)
	}
	return &MattermostTransport{
		&http.Transport{
			Proxy:                 getProxyFn(),
			DialContext:           dialContext,
			MaxIdleConns:          100,
			IdleConnTimeout:       90 * time.Second,
			TLSHandshakeTimeout:   ConnectTimeout,
			ExpectContinueTimeout: 1 * time.Second,
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: enableInsecureConnections,
			},
		},
	}
}