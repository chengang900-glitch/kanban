#!/usr/bin/env python3
"""Scoped v0.63.19 -> v0.64.3 rollout for cntracer-pc, not UhooAI."""
import datetime
import hashlib
import json
import os
import pathlib
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
import zipfile

os.umask(0o077)
ROOT = pathlib.Path('/home/cntracer/metabase-linux')
REL = ROOT / 'releases/v0.64.3-6bd491e-20261025'
COMPOSE = ROOT / 'docker-compose.yml'
APP = 'metabase-linux'
PG = 'enterprise-ai-platform-postgres-1'
DB = 'metabase_linux'
ROLE = 'metabase_linux'
CLONE = 'metabase_verify_6bd491e'
CAND = 'metabase-v643-6bd491e-verify'
OLD_IMAGE = 'enterprise-ai/metabase-linux:v0.63.19-keycloak-autobind-50c4b7e4'
IMAGE = 'enterprise-ai/metabase-linux:v0.64.3-6bd491e'
SHA = 'b2605d1d8c04b90c334c0c249d186d22ef6fcb56737be58185b9c9c115ffae61'


def run(*args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def inspect(name):
    return json.loads(run('docker', 'inspect', name, capture_output=True, text=True).stdout)[0]


def sql(query, db=DB):
    assert db in (DB, CLONE)
    return run('docker', 'exec', PG, 'psql', '-U', 'postgres', '-d', db,
               '-At', '-v', 'ON_ERROR_STOP=1', '-c', query, capture_output=True, text=True).stdout.strip()


def snapshot(db=DB):
    return {
        'counts': sql('SELECT (SELECT count(*) FROM core_user),(SELECT count(*) FROM report_card),(SELECT count(*) FROM report_dashboard),(SELECT count(*) FROM metabase_database)', db),
        'cards': sql("SELECT md5(string_agg(row_to_json(x)::text,'|' ORDER BY id)) FROM (SELECT id,name,display,dataset_query,visualization_settings,archived FROM report_card ORDER BY id) x", db),
        'dashboards': sql("SELECT md5(string_agg(row_to_json(x)::text,'|' ORDER BY id)) FROM (SELECT id,name,parameters,archived FROM report_dashboard ORDER BY id) x", db),
        'bindings': sql('SELECT count(*) FROM oss_keycloak_binding', db),
        'settings': sql("SELECT md5(string_agg(key||':'||value,'|' ORDER BY key)) FROM setting WHERE key IN ('site-name','site-locale','site-url','report-timezone','custom-homepage')", db),
    }


def fingerprint(container):
    cfg = container['Config']
    contract = {
        'env': sorted(cfg['Env']),
        'config': {k: cfg.get(k) for k in ['User', 'Entrypoint', 'Cmd', 'WorkingDir', 'ExposedPorts', 'Volumes', 'Healthcheck', 'StopSignal']},
        'host': container['HostConfig'],
        'mounts': container['Mounts'],
        'networks': sorted(container['NetworkSettings']['Networks']),
    }
    return hashlib.sha256(json.dumps(contract, sort_keys=True).encode()).hexdigest()


def properties(name=APP):
    ip = inspect(name)['NetworkSettings']['Networks']['enterprise-ai-db']['IPAddress']
    with urllib.request.urlopen('http://' + ip + ':3000/api/session/properties', timeout=10) as response:
        return json.load(response)


def wait_ready(name, expected_tag, expected_hash=None):
    for _ in range(180):
        try:
            p = properties(name)
            ip = inspect(name)['NetworkSettings']['Networks']['enterprise-ai-db']['IPAddress']
            with urllib.request.urlopen('http://' + ip + ':3000/api/health', timeout=5) as response:
                ready = json.load(response).get('status') == 'ok'
            if ready:
                assert p['version']['tag'] == expected_tag
                if expected_hash:
                    assert p['version']['hash'] == expected_hash
                assert p['oss-keycloak-enabled'] and p['site-locale'] == 'zh_CN'
                return p
        except (OSError, ValueError):
            pass
        time.sleep(3)
    raise RuntimeError('Application startup timed out; keep backup and inspect sanitized logs')


def save(state):
    (REL / 'state.json').write_text(json.dumps(state, indent=2) + '\n')


def restore_clone(dump):
    assert CLONE != DB and CLONE == 'metabase_verify_6bd491e'
    run('docker', 'exec', PG, 'createdb', '-U', 'postgres', '-O', ROLE, CLONE)
    with dump.open('rb') as data:
        run('docker', 'exec', '-i', PG, 'pg_restore', '-U', 'postgres', '--role=' + ROLE,
            '-d', CLONE, '--no-owner', '--exit-on-error', stdin=data)


def start_candidate(image):
    run('docker', 'run', '-d', '--pull=never', '--name', CAND, '--restart=no',
        '--memory=4g', '--memory-swap=4g', '--network', 'enterprise-ai-db',
        '-p', '127.0.0.1:3311:3000', '--env-file', str(REL / 'candidate.env'), image)
    run('docker', 'network', 'connect', 'enterprise-ai-portal', CAND)


assert run('hostname', capture_output=True, text=True).stdout.strip() == 'cntracer-pc'
phase = sys.argv[1]
if phase == 'stage':
    assert not (REL / 'state.json').exists(), 'Existing rollout state must be inspected, not overwritten'
    checksum = hashlib.sha256()
    with (REL / 'metabase.jar').open('rb') as data:
        for block in iter(lambda: data.read(8388608), b''):
            checksum.update(block)
    assert checksum.hexdigest() == SHA
    with zipfile.ZipFile(REL / 'metabase.jar') as jar:
        assert jar.testzip() is None
        assert 'hash=6bd491e' in jar.read('version.properties').decode()
        assert 'tag=v0.64.3' in jar.read('version.properties').decode()
    old = inspect(APP)
    assert old['Config']['Image'] == OLD_IMAGE and not old['Mounts']
    assert set(old['NetworkSettings']['Networks']) == {'enterprise-ai-db', 'enterprise-ai-portal'}
    assert not old['HostConfig']['PortBindings']
    assert sql("SELECT count(*) FROM pg_database WHERE datname='" + CLONE + "'") == '0'
    with socket.socket() as port:
        port.bind(('127.0.0.1', 3311))
    env = dict(item.split('=', 1) for item in old['Config']['Env'])
    assert env['MB_DB_DBNAME'] == DB and env['MB_DB_USER'] == ROLE
    assert env.get('MB_ENCRYPTION_SECRET_KEY') and env.get('MB_OSS_KEYCLOAK_ENABLED') == 'true'
    assert sql("SELECT count(*) FROM setting WHERE key='encryption-check' AND value IS NOT NULL AND value<>'unencrypted'") == '1'
    backup = ROOT / ('backups/v643-6bd491e-' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S'))
    backup.mkdir(mode=0o700)
    shutil.copy2(COMPOSE, backup / 'docker-compose.yml')
    shutil.copy2(ROOT / '.env', backup / '.env')
    (backup / 'runtime.json').write_text(json.dumps(old))  # Sensitive, mode 600 inside mode 700 directory.
    all_containers = json.loads(run('docker', 'inspect', *run('docker', 'ps', '-aq', capture_output=True, text=True).stdout.split(), capture_output=True, text=True).stdout)
    state = {'backup': str(backup), 'sha256': SHA, 'old_image': OLD_IMAGE, 'old_image_id': old['Image'],
             'image': IMAGE, 'before': snapshot(), 'runtime_fingerprint': fingerprint(old),
             'compose_sha256': hashlib.sha256(COMPOSE.read_bytes()).hexdigest(),
             'unaffected': {c['Name'].lstrip('/'): c['Id'] for c in all_containers if c['Name'] != '/' + APP}}
    save(state)
    with (backup / 'before.dump').open('wb') as output:
        run('docker', 'exec', PG, 'pg_dump', '-U', 'postgres', '-d', DB, '-Fc', stdout=output)
    restore_clone(backup / 'before.dump')
    assert snapshot(CLONE) == state['before']
    env.update({'MB_DB_DBNAME': CLONE, 'MB_SITE_URL': 'http://127.0.0.1:3311',
                'MB_DISABLE_SCHEDULER': 'true', 'MB_CHECK_FOR_UPDATES': 'false',
                'MB_ANON_TRACKING_ENABLED': 'false', 'JAVA_TOOL_OPTIONS': '-Xmx3g'})
    assert all('\n' not in value for value in env.values())
    (REL / 'candidate.env').write_text(''.join(key + '=' + value + '\n' for key, value in env.items()))
    (REL / 'Dockerfile').write_text('FROM ' + OLD_IMAGE + '\nCOPY --chmod=644 metabase.jar /app/metabase.jar\nLABEL org.opencontainers.image.revision="6bd491ebd0d0a6fe2bf3a1014872173abece0804"\n')
    (REL / '.dockerignore').write_text('*\n!Dockerfile\n!metabase.jar\n')
    run('docker', 'build', '--progress=plain', '--pull=false', '--network=none', '-t', IMAGE, str(REL))
    state['image_id'] = inspect(IMAGE)['Id']
    save(state)
    start_candidate(IMAGE)
    wait_ready(CAND, 'v0.64.3', '6bd491e')
    state['candidate_after'] = snapshot(CLONE)
    save(state)
    assert state['candidate_after'] == state['before'], 'Review migration differences before production'
    state['candidate_verified'] = True
    save(state)
    print('Restored encrypted copy successfully migrated to v0.64.3 / 6bd491e; ' + state['before']['counts'], flush=True)
elif phase == 'switch':
    state = json.loads((REL / 'state.json').read_text())
    assert state['candidate_verified'] and snapshot(CLONE) == state['before']
    wait_ready(CAND, 'v0.64.3', '6bd491e')
    assert inspect(APP)['Image'] == state['old_image_id']
    assert fingerprint(inspect(APP)) == state['runtime_fingerprint']
    assert hashlib.sha256(COMPOSE.read_bytes()).hexdigest() == state['compose_sha256']
    compose = COMPOSE.read_text()
    assert compose.count('image: ' + OLD_IMAGE) == 1
    updated = compose.replace('image: ' + OLD_IMAGE, 'image: ' + IMAGE)
    (REL / 'compose.updated.yml').write_text(updated)
    run('docker', 'compose', '--project-directory', str(ROOT), '-f', str(REL / 'compose.updated.yml'), 'config', '--quiet')
    run('docker', 'stop', '-t', '30', CAND)
    run('docker', 'compose', '-f', str(COMPOSE), 'stop', '-t', '60', 'app')
    with (pathlib.Path(state['backup']) / 'before-switch.dump').open('wb') as output:
        run('docker', 'exec', PG, 'pg_dump', '-U', 'postgres', '-d', DB, '-Fc', stdout=output)
    state['before_switch'] = snapshot()
    save(state)
    COMPOSE.write_text(updated)
    run('docker', 'compose', '-f', str(COMPOSE), 'up', '-d', '--no-deps', '--no-build', '--pull', 'never', 'app')
    wait_ready(APP, 'v0.64.3', '6bd491e')
    assert inspect(APP)['Image'] == state['image_id']
    assert fingerprint(inspect(APP)) == state['runtime_fingerprint']
    assert snapshot() == state['before_switch']
    assert all(inspect(name)['Id'] == cid for name, cid in state['unaffected'].items())
    state['deployed_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    state['after_switch'] = snapshot()
    save(state)
    print('Production ready; all original configuration/data preserved; ' + str(len(state['unaffected'])) + ' other container IDs unchanged.', flush=True)
elif phase == 'finish':
    state = json.loads((REL / 'state.json').read_text())
    wait_ready(APP, 'v0.64.3', '6bd491e')
    run('docker', 'rm', CAND)
    assert CLONE != DB and CLONE == 'metabase_verify_6bd491e'
    run('docker', 'exec', PG, 'dropdb', '-U', 'postgres', '--force', CLONE)
    restore_clone(pathlib.Path(state['backup']) / 'before-switch.dump')
    start_candidate(OLD_IMAGE)
    wait_ready(CAND, 'v0.63.19')
    assert snapshot(CLONE) == state['before_switch']
    state['old_version_restore_verified'] = True
    save(state)
    run('docker', 'stop', '-t', '30', CAND)
    run('docker', 'rm', CAND)
    run('docker', 'exec', PG, 'dropdb', '-U', 'postgres', '--force', CLONE)
    (REL / 'candidate.env').unlink()
    wait_ready(APP, 'v0.64.3', '6bd491e')
    assert snapshot() == state['after_switch']
    assert all(inspect(name)['Id'] == cid for name, cid in state['unaffected'].items())
    state['temporary_resources_removed'] = True
    save(state)
    print('Exact pre-switch dump restored and old image started on isolated DB; temporary resources removed.', flush=True)
elif phase == 'sync-build-input':
    state = json.loads((REL / 'state.json').read_text())
    wait_ready(APP, 'v0.64.3', '6bd491e')
    assert state['old_version_restore_verified'] and state['temporary_resources_removed']
    backup = pathlib.Path(state['backup'])
    assert not (backup / 'metabase.jar').exists()
    shutil.copy2(ROOT / 'metabase.jar', backup / 'metabase.jar')
    shutil.copy2(ROOT / 'Dockerfile', backup / 'Dockerfile')
    assert 'COPY metabase.jar /app/metabase.jar' in (ROOT / 'Dockerfile').read_text()
    updated = ROOT / 'metabase.jar.new'
    shutil.copy2(REL / 'metabase.jar', updated)
    checksum = hashlib.sha256()
    with updated.open('rb') as data:
        for block in iter(lambda: data.read(8388608), b''):
            checksum.update(block)
    assert checksum.hexdigest() == SHA
    updated.replace(ROOT / 'metabase.jar')
    state['persistent_build_jar_sha256'] = checksum.hexdigest()
    save(state)
    print('Persistent Compose build JAR synchronized; original JAR and Dockerfile backed up.', flush=True)
else:
    raise RuntimeError('Use stage, switch, finish, or sync-build-input')
