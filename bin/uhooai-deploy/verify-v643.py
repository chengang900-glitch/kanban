#!/usr/bin/env python3
"""Verify production and restore/start the prior image on a disposable DB only."""
import json,os,pathlib,subprocess,time,urllib.request,urllib.error
os.umask(0o077)
ROOT=pathlib.Path('/home/uhoo/metabase')
REL=ROOT/'releases/uhooai-v643-0b8b05e7'
state=json.loads((REL/'state.json').read_text())
BACKUP=pathlib.Path(state['backup'])
PG='uhoo-metabase-postgres-1'
APP='uhoo-metabase-metabase-1'
DB='metabase_verify_v643'
CAND='uhoo-metabase-v643-verify'
TEST='uhoo-metabase-v643-rollback-check'
def run(*a,**kw):return subprocess.run(a,check=True,**kw)
def sql(q,db='metabase'):
 return run('docker','exec',PG,'psql','-U','metabase','-d',db,'-At','-v','ON_ERROR_STOP=1','-c',q,capture_output=True,text=True).stdout.strip()
def get(url):
 with urllib.request.urlopen(url,timeout=10) as r:return json.load(r)
assert run('hostname',capture_output=True,text=True).stdout.strip()=='uhooai'
base='http://122.224.218.82:9443/metabase'
assert get(base+'/api/health')['status']=='ok'
p=get(base+'/api/session/properties')
assert p['version']['tag']=='v0.64.3' and p['version']['hash']=='0b8b05e'
assert p['oss-keycloak-enabled'] and p['site-locale']=='zh_CN'
print('External runtime:',p['version'],flush=True)
for endpoint,data in [('/auth/keycloak/status',None),('/auth/keycloak/backchannel-logout',b'logout_token=invalid')]:
 try:
  with urllib.request.urlopen(urllib.request.Request(base+endpoint,data=data,headers={'Content-Type':'application/x-www-form-urlencoded'}),timeout=15) as r:status=r.status
 except urllib.error.HTTPError as e:status=e.code
 assert status==401,(endpoint,status)
 print('Unauthenticated/invalid token rejected:',endpoint,status,flush=True)
app=json.loads(run('docker','inspect',APP,capture_output=True,text=True).stdout)[0]
assert app['RestartCount']==0 and app['State']['Health']['Status']=='healthy'
logs=run('docker','logs',APP,capture_output=True,text=True)
assert 'Metabase Initialization COMPLETE' in logs.stdout+logs.stderr
assert 'Metabase Initialization FAILED' not in logs.stdout+logs.stderr
# Preserve an encrypted post-upgrade backup before removing test resources.
with (BACKUP/'accepted.dump').open('wb') as out:run('docker','exec',PG,'pg_dump','-U','metabase','-d','metabase','-Fc',stdout=out)
run('docker','rm',CAND)
run('docker','exec',PG,'dropdb','-U','metabase',DB)
run('docker','exec',PG,'createdb','-U','metabase',DB)
with (BACKUP/'before-switch.dump').open('rb') as f:run('docker','exec','-i',PG,'pg_restore','-U','metabase','-d',DB,'--no-owner','--exit-on-error',stdin=f)
assert sql('SELECT (SELECT count(*) FROM core_user),(SELECT count(*) FROM report_card),(SELECT count(*) FROM report_dashboard)',DB)==state['switch_counts']
cmd=['docker','run','-d','--pull=never','--name',TEST,'--network','uhoo-metabase_default','-p','127.0.0.1:3310:3000','--env-file',str(REL/'candidate.env')]
for m in app['Mounts']:cmd+=['--mount','type=bind,src='+m['Source']+',dst='+m['Destination']+(',readonly' if not m['RW'] else '')]
run(*cmd,state['old_image'])
for _ in range(160):
 try:
  if get('http://127.0.0.1:3310/api/health')['status']=='ok':break
 except Exception:pass
 time.sleep(3)
else:raise RuntimeError('Restored prior image startup timed out; production unchanged')
pold=get('http://127.0.0.1:3310/api/session/properties')
assert pold['version']['tag']=='v0.64.2.5' and pold['oss-keycloak-enabled']
print('Exact rollback snapshot restored; prior image starts with preserved encryption key:',pold['version'],flush=True)
run('docker','stop','-t','30',TEST)
run('docker','rm',TEST)
run('docker','exec',PG,'dropdb','-U','metabase',DB)
(REL/'candidate.env').unlink()
state['rollback_snapshot_start_test']='passed with original image and key on disposable database'
state['external_checks']='v0.64.3, zh_CN, SSO enabled, invalid identity/logout 401, healthy restart 0'
(REL/'state.json').write_text(json.dumps(state,indent=2)+'\n')
print(json.dumps(state),flush=True)
