#!/usr/bin/env bash
# Isolated H2 auth tests; mt/client initializes a loopback web server even for handler requests.
set -euo pipefail
cd "$(dirname "$0")/../.."
unset MB_DB_CONNECTION_URI MB_DB_CONNECTION_URL MB_DB_HOST MB_DB_USER MB_DB_PASS MB_DB_PORT MB_DB_DBNAME
export MB_DB_TYPE=h2 MB_DB_IN_MEMORY=true
exec ./bin/test-agent --oss :only '[metabase.sso.keycloak.protocol-test metabase.sso.keycloak.store-test metabase.sso.keycloak.integration-test]' ':multithread?' false
