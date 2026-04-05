#!/usr/bin/env bash
make build-templates
if [[ `git status templates/ --porcelain` ]]; then
  echo "mjml templates have changed; Please compile and include compiled files"
  git diff templates/
  exit 1
else
  echo "PASS"
fi