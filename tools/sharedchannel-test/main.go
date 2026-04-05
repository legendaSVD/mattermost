package main
import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)
type Config struct {
	ServerAURL  string
	ServerBURL  string
	LicensePath string
	ServerDir   string
	Manage      bool
	AdminUser   string
	AdminPass   string
}
func main() {
	cfg := Config{}
	flag.StringVar(&cfg.ServerAURL, "server-a", "http://localhost:9065", "Server A URL")
	flag.StringVar(&cfg.ServerBURL, "server-b", "http://localhost:9066", "Server B URL")
	flag.StringVar(&cfg.LicensePath, "license", "", "Path to enterprise license file (required)")
	flag.StringVar(&cfg.ServerDir, "server-dir", "", "Path to server directory (for managed mode)")
	flag.BoolVar(&cfg.Manage, "manage", true, "Manage server lifecycle (build/start/stop)")
	flag.StringVar(&cfg.AdminUser, "admin-user", "admin", "Admin username to create")
	flag.StringVar(&cfg.AdminPass, "admin-pass", "Admin1234!", "Admin password")
	flag.Parse()
	if cfg.LicensePath == "" {
		fmt.Fprintln(os.Stderr, "error: --license is required")
		flag.Usage()
		os.Exit(1)
	}
	logger, err := newLogger()
	if err != nil {
		fmt.Fprintf(os.Stderr, "error creating logger: %v\n", err)
		os.Exit(1)
	}
	defer logger.Flush()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		logger.Info("Received signal, shutting down...")
		cancel()
	}()
	runner := NewTestRunner(cfg, logger)
	if err := runner.Run(ctx); err != nil {
		logger.Error("Test run failed", mlog.Err(err))
		logger.Flush()
		os.Exit(1)
	}
}
func newLogger() (*mlog.Logger, error) {
	logger, err := mlog.NewLogger()
	if err != nil {
		return nil, err
	}
	formatOpts := json.RawMessage(`{"enable_color": true, "enable_caller": false}`)
	logCfg := mlog.LoggerConfiguration{
		"stdout": mlog.TargetCfg{
			Type:          "console",
			Format:        "plain",
			Levels:        []mlog.Level{mlog.LvlInfo, mlog.LvlWarn, mlog.LvlDebug},
			Options:       json.RawMessage(`{"out": "stdout"}`),
			FormatOptions: formatOpts,
			MaxQueueSize:  1000,
		},
		"stderr": mlog.TargetCfg{
			Type:          "console",
			Format:        "plain",
			Levels:        []mlog.Level{mlog.LvlError, mlog.LvlFatal, mlog.LvlPanic},
			Options:       json.RawMessage(`{"out": "stderr"}`),
			FormatOptions: formatOpts,
			MaxQueueSize:  1000,
		},
	}
	if err := logger.ConfigureTargets(logCfg, nil); err != nil {
		return nil, fmt.Errorf("configure log targets: %w", err)
	}
	return logger, nil
}