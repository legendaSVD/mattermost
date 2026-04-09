#!/bin/bash
set -euo pipefail
usage() {
    echo "Usage: scripts/update-versions.sh monorepo_version"
    exit 1
}
if [ $
    usage
fi
version="$1"
if ! echo "$version" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+(-[0-9]+)?$'; then
    usage
fi
workspaces=(
    channels
    platform/client
    platform/mattermost-redux
    platform/shared
    platform/types
)
packages=(
    @mattermost/client
    @mattermost/shared
    @mattermost/types
)
packages_json=$(printf '%s\n' "${packages[@]}" | jq -R . | jq -s .)
workspaces_json=$(printf '%s\n' "${workspaces[@]}" | jq -R . | jq -s .)
for workspace in "${workspaces[@]}"; do
    pkg_json="${workspace}/package.json"
    jq --arg version "$version" --argjson packages "$packages_json" '
        .version = $version |
        reduce $packages[] as $pkg (.;
            reduce ["dependencies", "devDependencies", "peerDependencies"][] as $section (.;
                if .[$section][$pkg] then .[$section][$pkg] = $version else . end
            )
        )
    ' "$pkg_json" > "${pkg_json}.tmp" && mv "${pkg_json}.tmp" "$pkg_json"
done
jq --arg version "$version" --argjson packages "$packages_json" --argjson workspaces "$workspaces_json" '
    reduce $workspaces[] as $ws (.;
        .packages[$ws].version = $version |
        reduce $packages[] as $pkg (.;
            reduce ["dependencies", "devDependencies", "peerDependencies"][] as $section (.;
                if .packages[$ws][$section][$pkg] then .packages[$ws][$section][$pkg] = $version else . end
            )
        )
    )
' package-lock.json > package-lock.json.tmp && mv package-lock.json.tmp package-lock.json