#!/usr/bin/env bash
# Run against isolated H2 without inheriting application credentials or settings.
set -euo pipefail
cd "$(dirname "$0")/../.."
exec env -i HOME="$HOME" PATH="$PATH" JAVA_HOME="$JAVA_HOME" \
  LANG="${LANG:-en_US.UTF-8}" MB_DB_TYPE=h2 MB_DB_IN_MEMORY=true \
  ./bin/test-agent --oss :only '[metabase.sso.keycloak.protocol-test metabase.sso.keycloak.store-test metabase.sso.keycloak.integration-test]' ':multithread?' false
