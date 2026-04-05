#!/usr/bin/env bash
REPO_TO_USE=$1
BRANCH_TO_USE=$2
BASIC_AUTH=""
if [[ ! -z "$GITHUB_USERNAME" && ! -z "$GITHUB_TOKEN" ]];
then
  BASIC_AUTH="--user $GITHUB_USERNAME:$GITHUB_TOKEN"
fi
LATEST_RELEASE=$(curl \
  --silent \
  $BASIC_AUTH \
  "https://api.github.com/repos/$REPO_TO_USE/releases/latest")
RELEASES=$(curl \
  --silent \
  $BASIC_AUTH \
  "https://api.github.com/repos/$REPO_TO_USE/releases")
LATEST_REL=$(echo "$LATEST_RELEASE" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
DRAFT=$(echo "$LATEST_RELEASE" | grep '"draft":' | sed -E 's/.*: ([^,]+).*/\1/')
PRERELEASE=$(echo "$RELEASES" | grep '"prerelease":' | sed -E 's/.*: ([^,]+).*/\1/')
THIS_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$THIS_BRANCH" =~ $BRANCH_TO_USE || $DRAFT =~ "true" ]]; then
  VERSION_REL=${THIS_BRANCH//$BRANCH_TO_USE/v}
  REL_TO_USE=$(echo "$RELEASES" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/' | sed -n "/$VERSION_REL/p" | sort -rV | head -n 1)
elif [[ "$THIS_BRANCH"  =~ "master" ]]; then
  REL_TO_USE=$(echo "$RELEASES" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/' | sort -rV | head -n 1)
else
  REL_TO_USE=$LATEST_REL
fi
if [[ -z "$REL_TO_USE" ]]
then
  echo "An error has occurred trying to get the latest mmctl release. Aborting. Perhaps api.github.com is down, or you are being rate-limited.";
  echo "Set the GITHUB_USERNAME and GITHUB_TOKEN environment variables to the appropriate values to work around GitHub rate-limiting.";
  exit 1;
else
  echo "$REL_TO_USE"
fi