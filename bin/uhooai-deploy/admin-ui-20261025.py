#!/usr/bin/env python3
"""Deploy the v0.64.3 admin UI update without changing runtime configuration."""
import datetime
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import sys
import time
import zipfile

os.umask(0o077)
ROOT = pathlib.Path('/home/uhoo/metabase')
REL = ROOT / 'releases/admin-ui-20261025'
APP = 'uhoo-metabase-metabase-1'
PG = 'uhoo-metabase-postgres-1'
IMAGE = 'uhooai/metabase:v0.64.3-admin-6bd491eb'
REVISION = '6bd491e'
COMPOSE = ROOT / 'compose.yaml'


def run(*args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def inspect(name):
    return json.loads(run('docker', 'inspect', name, capture_output=True, text=True).stdout)[0]


def sql(query):
    return run('docker', 'exec', PG, 'psql', '-U', 'metabase', '-d', 'metabase',
               '-At', '-v', 'ON_ERROR_STOP=1', '-c', query, capture_output=True, text=True).stdout.strip()


def snapshot():
    return {
        'counts': sql('SELECT (SELECT count(*) FROM core_user),(SELECT count(*) FROM report_card),(SELECT count(*) FROM report_dashboard)'),
        'definitions': sql("SELECT md5(string_agg(row_to_json(x)::text,'|' ORDER BY id)) FROM (SELECT id,name,display,dataset_query,visualization_settings,archived FROM report_card ORDER BY id) x"),
        'migrations': sql("SELECT md5(string_agg(id || ':' || author || ':' || filename,'|' ORDER BY orderexecuted)) FROM databasechangelog"),
    }


def runtime_fingerprint(container):
    # Compare sensitive configuration in memory; persist only its digest.
    keys = {
        'env': sorted(container['Config']['Env']),
        'mounts': container['Mounts'],
        'ports': container['HostConfig']['PortBindings'],
        'networks': sorted(container['NetworkSettings']['Networks']),
    }
    return hashlib.sha256(json.dumps(keys, sort_keys=True).encode()).hexdigest()


def wait_ready():
    for _ in range(160):
        result = subprocess.run(['docker', 'exec', APP, 'curl', '-fsS', '--max-time', '5',
                                 'http://localhost:3000/api/health'], capture_output=True, text=True)
        if result.returncode == 0 and json.loads(result.stdout).get('status') == 'ok':
            return
        time.sleep(3)
    raise RuntimeError('Startup timeout; retain backup and inspect logs before rollback')


def save(state):
    (REL / 'state.json').write_text(json.dumps(state, indent=2) + '\n')


assert run('hostname', capture_output=True, text=True).stdout.strip() == 'uhooai'
phase = sys.argv[1]
if phase == 'stage':
    assert len(sys.argv) == 3
    checksum = hashlib.sha256()
    with (REL / 'metabase.jar').open('rb') as jar:
        for block in iter(lambda: jar.read(8388608), b''):
            checksum.update(block)
    digest = checksum.hexdigest()
    assert digest == sys.argv[2]
    with zipfile.ZipFile(REL / 'metabase.jar') as jar:
        assert jar.testzip() is None
        version = jar.read('version.properties').decode()
        assert 'tag=v0.64.3' in version and 'hash=' + REVISION in version
    old = inspect(APP)
    assert old['Config']['Image'] == 'uhooai/metabase:v0.64.3-0b8b05e7'
    assert old['State']['Health']['Status'] == 'healthy'
    backup = ROOT / ('backups/admin-ui-' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S'))
    backup.mkdir(mode=0o700)
    shutil.copy2(COMPOSE, backup / 'compose.yaml')
    shutil.copytree(ROOT / 'secrets', backup / 'secrets')
    state = {'backup': str(backup), 'sha256': digest, 'version_properties': version,
             'old_image': old['Config']['Image'], 'old_image_id': old['Image'],
             'new_image': IMAGE, 'before': snapshot(), 'runtime_fingerprint': runtime_fingerprint(old),
             'postgres_id': inspect(PG)['Id']}
    save(state)
    (REL / 'Dockerfile').write_text('FROM ' + old['Config']['Image'] + '\nCOPY --chmod=644 metabase.jar /app/metabase.jar\nLABEL org.opencontainers.image.revision="6bd491eb"\n')
    (REL / '.dockerignore').write_text('*\n!Dockerfile\n!metabase.jar\n')
    run('docker', 'build', '--progress=plain', '--pull=false', '--network=none', '-t', IMAGE, str(REL))
    state['new_image_id'] = inspect(IMAGE)['Id']
    save(state)
    print('Verified JAR and built image; runtime configuration preserved. ' + json.dumps(state), flush=True)
elif phase == 'switch':
    state = json.loads((REL / 'state.json').read_text())
    assert inspect(APP)['Image'] == state['old_image_id']
    assert runtime_fingerprint(inspect(APP)) == state['runtime_fingerprint']
    compose = COMPOSE.read_text()
    old_line = 'image: ' + state['old_image']
    assert compose.count(old_line) == 1
    run('docker', 'compose', '--ansi', 'never', '--progress', 'plain', '-f', str(COMPOSE), 'stop', '-t', '60', 'metabase')
    with (pathlib.Path(state['backup']) / 'before-switch.dump').open('wb') as output:
        run('docker', 'exec', PG, 'pg_dump', '-U', 'metabase', '-d', 'metabase', '-Fc', stdout=output)
    state['before_switch'] = snapshot()
    save(state)
    COMPOSE.write_text(compose.replace(old_line, 'image: ' + IMAGE))
    run('docker', 'compose', '--ansi', 'never', '--progress', 'plain', '-f', str(COMPOSE), 'up', '-d', '--no-deps', '--pull', 'never', 'metabase')
    wait_ready()
    current = inspect(APP)
    assert current['Image'] == state['new_image_id']
    assert runtime_fingerprint(current) == state['runtime_fingerprint']
    assert inspect(PG)['Id'] == state['postgres_id']
    assert snapshot() == state['before_switch']
    properties = json.loads(run('docker', 'exec', APP, 'curl', '-fsS', 'http://localhost:3000/api/session/properties', capture_output=True, text=True).stdout)
    assert properties['version']['hash'] == REVISION and properties['version']['tag'] == 'v0.64.3'
    assert properties['oss-keycloak-enabled'] and properties['site-locale'] == 'zh_CN'
    state['deployed_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    state['after_switch'] = snapshot()
    save(state)
    print(json.dumps(state), flush=True)
else:
    raise RuntimeError('Use stage SHA256 or switch')
