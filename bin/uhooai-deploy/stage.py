#!/usr/bin/env python3
"""Stage a pinned custom image and restore-test the existing PostgreSQL database.
Run as root on the verified UhooAI host; never prints credential material.
"""
import datetime, hashlib, json, os, pathlib, shutil, subprocess
ROOT = pathlib.Path('/home/uhoo/metabase')
RELEASE = ROOT / 'releases/uhooai-v64-a26b7ad-20261018'
BACKUP = ROOT / ('backups/custom-' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
PG = 'uhoo-metabase-postgres-1'
BASE = 'sha256:2002bc09890b35958fb078421ba2d1195703209bc585bf70553b0f0c0573926b'
IMAGE = 'uhooai/metabase:v0.64.2.5-a26b7ad'
CLONE = 'metabase_verify_20261018'
HASH = '74aee7ca7423e602904da0e62468e3419f64fd890409ce976c32ed2e2f6d30e9'
os.umask(0o077)
def run(*args, **kw):
    return subprocess.run(args, check=True, **kw)
def sql(query, db='metabase'):
    return run('docker','exec',PG,'psql','-U','metabase','-d',db,'-At','-v','ON_ERROR_STOP=1','-c',query,capture_output=True,text=True).stdout.strip()
assert run('hostname',capture_output=True,text=True).stdout.strip() == 'uhooai'
digest = hashlib.sha256()
with (RELEASE/'metabase.jar').open('rb') as jar:
    for block in iter(lambda: jar.read(8*1024*1024), b''): digest.update(block)
assert digest.hexdigest() == HASH
print('Artifact checksum verified', flush=True)
BACKUP.mkdir(mode=0o700)
shutil.copy2(ROOT/'compose.yaml', BACKUP/'compose.yaml')
shutil.copytree(ROOT/'secrets', BACKUP/'secrets')
with (BACKUP/'metabase.dump').open('wb') as out:
    run('docker','exec',PG,'pg_dump','-U','metabase','-d','metabase','-Fc',stdout=out)
counts = sql("SELECT (SELECT count(*) FROM core_user),(SELECT count(*) FROM report_card),(SELECT count(*) FROM report_dashboard)")
# Reuse only this dedicated verification DB name, and fail if it already exists.
assert sql(f"SELECT count(*) FROM pg_database WHERE datname='{CLONE}'") == '0', 'Clone already exists'
run('docker','exec',PG,'createdb','-U','metabase',CLONE)
with (BACKUP/'metabase.dump').open('rb') as data:
    run('docker','exec','-i',PG,'pg_restore','-U','metabase','-d',CLONE,'--exit-on-error','--no-owner',stdin=data)
assert counts == sql("SELECT (SELECT count(*) FROM core_user),(SELECT count(*) FROM report_card),(SELECT count(*) FROM report_dashboard)",CLONE)
print('Backup restored on PostgreSQL 17; counts '+counts, flush=True)
run('docker','tag',BASE,'uhooai/metabase-base:official-43a24f6')
(RELEASE/'Dockerfile').write_text('FROM uhooai/metabase-base:official-43a24f6\nCOPY --chmod=644 metabase.jar /app/metabase.jar\nLABEL org.opencontainers.image.revision="a26b7ad156eb54f951f84fc47624d2529453fd0e"\nLABEL cn.uhoo.jar.sha256="'+HASH+'"\n')
(RELEASE/'.dockerignore').write_text('*\n!metabase.jar\n!Dockerfile\n')
run('docker','build','--progress=plain','--pull=false','--network=none','-t',IMAGE,str(RELEASE))
state={'backup':str(BACKUP),'image':IMAGE,'clone_database':CLONE,'original_counts':counts,'jar_sha256':HASH,'base_image':BASE}
(RELEASE/'stage.json').write_text(json.dumps(state,indent=2)+'\n')
run('docker','run','-d','--name','uhoo-metabase-candidate','--network','uhoo-metabase_default','--restart','no','-p','127.0.0.1:3310:3000','--mount',f'type=bind,src={ROOT}/secrets/db_password,dst=/run/secrets/db_password,readonly',
    '-e','MB_DB_TYPE=postgres','-e','MB_DB_HOST=postgres','-e','MB_DB_PORT=5432','-e',f'MB_DB_DBNAME={CLONE}','-e','MB_DB_USER=metabase','-e','MB_DB_PASS_FILE=/run/secrets/db_password',
    '-e','MB_SITE_URL=http://localhost:3310','-e','JAVA_TIMEZONE=Asia/Shanghai','-e','JAVA_OPTS=-Xms512m -Xmx2g','-e','MB_DISABLE_SCHEDULER=true','-e','MB_ANON_TRACKING_ENABLED=false','-e','MB_CHECK_FOR_UPDATES=false', IMAGE)
print(json.dumps(state), flush=True)
