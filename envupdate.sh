#!/bin/bash

while read line; do
  if [[ ! -z "$line" && ! "$line" =~ ^# ]]; then
    KEY=$(echo "$line" | cut -d '=' -f 1)
    VALUE=$(echo "$line" | cut -d '=' -f 2-)
    gh secret set "$KEY" --body "$VALUE"
  fi
done < .env
