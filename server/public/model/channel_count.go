package model
import (
	"crypto/md5"
	"fmt"
	"sort"
	"strconv"
	"strings"
)
type ChannelCounts struct {
	Counts      map[string]int64 `json:"counts"`
	CountsRoot  map[string]int64 `json:"counts_root"`
	UpdateTimes map[string]int64 `json:"update_times"`
}
func (o *ChannelCounts) Etag() string {
	ids := []string{}
	for id := range o.Counts {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	var str strings.Builder
	for _, id := range ids {
		str.WriteString(id + strconv.FormatInt(o.Counts[id], 10))
	}
	md5Counts := fmt.Sprintf("%x", md5.Sum([]byte(str.String())))
	var update int64
	for _, u := range o.UpdateTimes {
		if u > update {
			update = u
		}
	}
	return Etag(md5Counts, update)
}