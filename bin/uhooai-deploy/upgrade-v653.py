#!/usr/bin/env python3
"""Guarded, one-target v0.65.3 upgrade. Run as root on uhooai, never print secrets."""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time
import urllib.request
import zipfile

os.umask(0o077)
ROOT = Path('/home/uhoo/metabase-linux')
COMPOSE = ROOT / 'docker-compose.yml'
APP = 'metabase-linux'
PG = 'enterprise-ai-platform-postgres-1'
DB = 'metabase_linux'
OLD_IMAGE = 'enterprise-ai/metabase-linux:v0.65.2-39088d6'
TABLES = ['core_user', 'report_card', 'report_dashboard', 'report_dashboardcard',
          'metabase_database', 'collection', 'permissions', 'permissions_group',
          'permissions_group_membership', 'auth_identity', 'oss_keycloak_binding',
          'data_permissions', 'mcp_group_permission', 'metabot_permissions',
          'permissions_revision', 'application_permissions_revision',
          'collection_permission_graph_revision']


def run(args, **kw):
    return subprocess.run(args, check=True, **kw)


def output(args):
    return run(args, capture_output=True, text=True).stdout.strip()


def inspect(name):
    return json.loads(output(['docker', 'inspect', name]))[0]


def digest(path):
    result = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(8388608), b''):
            result.update(block)
    return result.hexdigest()


def save(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def sql(query, database=DB):
    return output(['docker', 'exec', PG, 'psql', '-U', 'postgres', '-d', database,
                   '-At', '-v', 'ON_ERROR_STOP=1', '-c', query])


def fingerprints(database=DB):
    result = {}
    for table in TABLES:
        # Only operational timestamps/counters are ignored, never query definitions or identities.
        q = ("SELECT count(*),md5(coalesce(string_agg(j::text,'|' ORDER BY j::text),'')) "
             "FROM (SELECT to_jsonb(x)-ARRAY['updated_at','last_login','last_used_at',"
             "'view_count','last_viewed_at','last_seen_at'] j FROM " + table + " x) s")
        count, fingerprint = sql(q, database).split('|')
        result[table] = {'rows': int(count), 'fingerprint': fingerprint}
    return result


def request(base, path):
    with urllib.request.urlopen(base + path, timeout=8) as response:
        return json.load(response)


def live_base(container):
    ip = container['NetworkSettings']['Networks']['enterprise-ai-db']['IPAddress']
    return 'http://' + ip + ':3000'


def wait_ready(base, name, expected_hash):
    for _ in range(120):
        if inspect(name)['State']['Status'] != 'running':
            raise RuntimeError('Metabase exited; preserve the container and inspect restricted logs')
        try:
            if request(base, '/api/health').get('status') == 'ok':
                version = request(base, '/api/session/properties')['version']
                assert version['tag'] == ('v0.65.2' if expected_hash == '39088d6' else 'v0.65.3')
                assert version['hash'] == expected_hash, version
                logs = output(['docker', 'logs', name])
                assert 'Metabase Initialization COMPLETE' in logs
                return version
        except (OSError, ValueError):
            pass
        time.sleep(3)
    raise RuntimeError('Metabase readiness timeout; production backup remains available')


def dump_database(path):
    with Path(path).open('wb') as stream:
        run(['docker', 'exec', PG, 'pg_dump', '-U', 'postgres', '-d', DB, '-Fc'], stdout=stream)
    with Path(path).open('rb') as stream:
        listing = run(['docker', 'exec', '-i', PG, 'pg_restore', '-l'], stdin=stream,
                      capture_output=True).stdout
    assert b'report_card' in listing and b'oss_keycloak_binding' in listing


def restore_clone(database, archive):
    assert re.fullmatch(r'metabase_v653_(verify|rollback)_[0-9]+', database)
    assert sql("SELECT count(*) FROM pg_database WHERE datname='" + database + "'", 'postgres') == '0'
    sql('CREATE DATABASE ' + database + ' OWNER metabase_linux', 'postgres')
    with Path(archive).open('rb') as stream:
        run(['docker', 'exec', '-i', PG, 'pg_restore', '-U', 'postgres',
             '-d', database, '--no-owner', '--role=metabase_linux'], stdin=stream,
            stdout=subprocess.DEVNULL)


def others():
    return {c['Name']: {'id': c['Id'], 'image': c['Image'], 'started': c['State']['StartedAt']}
            for c in json.loads(output(['docker', 'inspect', *output(['docker', 'ps', '-q']).split()]))
            if c['Name'] != '/' + APP and not c['Name'].startswith('/uhoo-metabase-v653-')}


def compose(*args, **kw):
    return run(['docker', 'compose', '-p', 'metabase-linux', '-f', str(COMPOSE), *args],
               cwd=ROOT, **kw)


def stage(args, release, state):
    assert not state, 'Release already staged; use its recorded state rather than overwriting it'
    current = inspect(APP)
    assert current['Config']['Image'] == OLD_IMAGE
    assert request(live_base(current), '/api/session/properties')['version']['hash'] == '39088d6'
    assert current['Config']['Labels']['com.docker.compose.project.config_files'] == str(COMPOSE)
    original_text = COMPOSE.read_text()
    assert original_text.count(OLD_IMAGE) == 1
    assert 'COPY metabase.jar /app/metabase.jar' in (ROOT / 'Dockerfile').read_text()
    uploaded = Path(args.jar)
    assert uploaded.is_file() and not uploaded.is_symlink() and digest(uploaded) == args.sha256
    with zipfile.ZipFile(uploaded) as jar:
        assert jar.testzip() is None
        properties = jar.read('version.properties').decode()
        assert 'tag=v0.65.3' in properties and 'hash=' + args.source_hash in properties
        assert 'migrations/063/20261003_oss_keycloak.yaml' in jar.namelist()
        assert not any(name.startswith('metabase_enterprise/') for name in jar.namelist())
    release.mkdir(parents=True, exist_ok=False)
    backup = ROOT / 'backups' / ('v653-' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    backup.mkdir(parents=True, mode=0o700)
    # Complete resolved runtime settings stay on the server in a root-only backup.
    save(backup / 'original-inspect.private.json', current)
    for source in ROOT.iterdir():
        if source.is_file() and (source.suffix in ('.yml', '.yaml', '.env', '.sh') or source.name in ('.env', 'Dockerfile')):
            shutil.copy2(source, backup / source.name)
    run(['docker', 'cp', APP + ':/app/metabase.jar', str(backup / 'metabase-old.jar')])
    shutil.copy2(uploaded, release / 'metabase.jar')
    assert digest(release / 'metabase.jar') == args.sha256
    image = 'enterprise-ai/metabase-linux:v0.65.3-' + args.source_hash
    (release / 'Dockerfile').write_text('FROM ' + OLD_IMAGE + '\nCOPY --chown=metabase:metabase metabase.jar /app/metabase.jar\nLABEL org.opencontainers.image.revision="' + args.source_hash + '"\n')
    with (release / 'build.log').open('w') as log:
        run(['docker', 'build', '--pull=false', '--network=none', '-t', image, str(release)],
            stdout=log, stderr=subprocess.STDOUT)
    dump_database(backup / 'before.dump')
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S')
    state.update(image=image, old_image=OLD_IMAGE, old_image_id=current['Image'], backup=str(backup),
                 sha256=args.sha256, source_hash=args.source_hash, others=others(),
                 compose_sha256=digest(COMPOSE), env_sha256=digest(ROOT / '.env'))
    save(release / 'state.json', state)
    original_env = dict(value.split('=', 1) for value in current['Config']['Env'])
    assert not original_env.get('MB_DB_CONNECTION_URI'), 'Do not clone with a production connection URI override'
    assert original_env.get('MB_DB_DBNAME') == DB and original_env.get('MB_DB_TYPE') == 'postgres'
    assert original_env.get('MB_DB_USER') == 'metabase_linux'
    for kind, runtime_image, hash_value in [('verify', image, args.source_hash), ('rollback', OLD_IMAGE, '39088d6')]:
        database = 'metabase_v653_' + kind + '_' + stamp
        restore_clone(database, backup / 'before.dump')
        before = fingerprints(database)
        env = dict(original_env)
        env.update(MB_DB_DBNAME=database, MB_JETTY_PORT='3000', MB_SITE_URL='http://127.0.0.1:33530',
                   MB_DISABLE_SCHEDULER='true', MB_ANON_TRACKING_ENABLED='false', MB_CHECK_FOR_UPDATES='false',
                   MB_OSS_KEYCLOAK_ENABLED='false', MB_AI_FEATURES_ENABLED='false',
                   JAVA_TOOL_OPTIONS='-Xms128m -Xmx1536m')
        env.pop('_JAVA_OPTIONS', None)
        env.pop('JDK_JAVA_OPTIONS', None)
        assert all('\n' not in value and '\r' not in value for value in env.values())
        env_file = release / (kind + '.private.env')
        env_file.write_text(''.join(key + '=' + value + '\n' for key, value in env.items()))
        name = 'uhoo-metabase-v653-' + kind
        output(['docker', 'run', '-d', '--name', name, '--network', 'enterprise-ai-db',
                '-p', '127.0.0.1:33530:3000', '--env-file', str(env_file), runtime_image])
        try:
            version = wait_ready('http://127.0.0.1:33530', name, hash_value)
            after = fingerprints(database)
            assert after == before, json.dumps({'kind': kind, 'before': before, 'after': after})
            state[kind] = {'passed': True, 'version': version, 'data': after}
            save(release / 'state.json', state)
        finally:
            with (release / (kind + '.log')).open('w') as log:
                subprocess.run(['docker', 'logs', name], stdout=log, stderr=subprocess.STDOUT)
            run(['docker', 'rm', '-f', name], stdout=subprocess.DEVNULL)
            env_file.unlink()
        sql('DROP DATABASE ' + database, 'postgres')
    assert others() == state['others'], 'An unrelated container changed during staging'
    state['staged'] = True
    save(release / 'state.json', state)


def cutover(args, release, state):
    assert state.get('staged') and not state.get('switched')
    assert inspect(APP)['Image'] == state['old_image_id']
    assert digest(COMPOSE) == state['compose_sha256'] and digest(ROOT / '.env') == state['env_sha256']
    assert digest(release / 'metabase.jar') == state['sha256']
    candidate_text = COMPOSE.read_text().replace(OLD_IMAGE, state['image'])
    run(['docker', 'compose', '--project-directory', str(ROOT), '-f', '-', 'config', '--quiet'],
        input=candidate_text, text=True, cwd=ROOT)
    backup = Path(state['backup'])
    compose('stop', 'app')
    state['before_switch'] = fingerprints()
    dump_database(backup / 'before-switch.dump')
    save(release / 'state.json', state)
    temporary = ROOT / 'metabase.jar.new'
    shutil.copy2(release / 'metabase.jar', temporary)
    os.chmod(temporary, 0o644)
    temporary.replace(ROOT / 'metabase.jar')
    COMPOSE.write_text(candidate_text)
    compose('config', '--quiet')
    compose('up', '-d', '--no-deps', '--no-build', '--pull', 'never', 'app')
    current = inspect(APP)
    version = wait_ready(live_base(current), APP, state['source_hash'])
    assert fingerprints() == state['before_switch'], 'Production data/identity fingerprint changed'
    original = json.loads((backup / 'original-inspect.private.json').read_text())
    assert sorted(current['Config']['Env']) == sorted(original['Config']['Env']), 'Runtime environment drift'
    assert current['RestartCount'] == 0 and others() == state['others']
    assert digest(ROOT / '.env') == state['env_sha256']
    remote_sha = output(['docker', 'exec', APP, 'sha256sum', '/app/metabase.jar']).split()[0]
    assert remote_sha == state['sha256']
    state.update(switched=True, runtime_version=version, data_unchanged=True,
                 unrelated_containers_unchanged=True, runtime_environment_unchanged=True,
                 jar_sha256_verified=True, restart_count=0)
    save(release / 'state.json', state)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('phase', choices=['stage', 'cutover', 'status'])
    parser.add_argument('--source-hash', required=True)
    parser.add_argument('--sha256')
    parser.add_argument('--jar')
    args = parser.parse_args()
    assert output(['hostname']) == 'uhooai' and os.geteuid() == 0
    assert re.fullmatch('[0-9a-f]{7}', args.source_hash)
    release = ROOT / 'releases' / ('v0.65.3-' + args.source_hash)
    state_file = release / 'state.json'
    state = json.loads(state_file.read_text()) if state_file.exists() else {}
    if args.phase == 'stage':
        stage(args, release, state)
    elif args.phase == 'cutover':
        cutover(args, release, state)
    summary = {key: value for key, value in state.items() if key != 'others'}
    summary['other_container_count'] = len(state.get('others', {}))
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
