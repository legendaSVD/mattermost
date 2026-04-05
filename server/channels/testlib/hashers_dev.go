package testlib
import "github.com/mattermost/mattermost/server/v8/channels/app/password/hashers"
func setupFastTestHasher() {
	hashers.SetTestHasher(hashers.FastTestHasher())
}