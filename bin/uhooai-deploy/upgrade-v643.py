#!/usr/bin/env python3
"""One-off v0.64.3 upgrade preserving the live Compose/env and encryption key."""
import datetime, hashlib, json, os, pathlib, shutil, subprocess, sys, time, urllib.request
os.umask(0o077)
ROOT=pathlib.Path('/home/uhoo/metabase')
REL=ROOT/'releases/uhooai-v643-0b8b05e7'
PG='uhoo-metabase-postgres-1'
APP='uhoo-metabase-metabase-1'
CAND='uhoo-metabase-v643-verify'
DB='metabase_verify_v643'
IMAGE='uhooai/metabase:v0.64.3-0b8b05e7'
def run(*a,**kw):return subprocess.run(a,check=True,**kw)
def sql(q,db='metabase'):
 return run('docker','exec',PG,'psql','-U','metabase','-d',db,'-At','-v','ON_ERROR_STOP=1','-c',q,capture_output=True,text=True).stdout.strip()
def counts(db='metabase'):return sql('SELECT (SELECT count(*) FROM core_user),(SELECT count(*) FROM report_card),(SELECT count(*) FROM report_dashboard)',db)
def props(port):
 with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/session/properties',timeout=10) as r:return json.load(r)
def wait(port):
 for _ in range(160):
  try:
   with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health',timeout=5) as r:
    if json.load(r).get('status')=='ok':return
  except Exception:pass
  time.sleep(3)
 raise RuntimeError('Startup timeout; preserve current state and backup for investigation')
assert run('hostname',capture_output=True,text=True).stdout.strip()=='uhooai'
phase=sys.argv[1]
if phase=='stage':
 digest=hashlib.sha256()
 with (REL/'metabase.jar').open('rb') as f:
  for b in iter(lambda:f.read(8388608),b''):digest.update(b)
 assert digest.hexdigest()==sys.argv[2]
 backup=ROOT/('backups/v643-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
 backup.mkdir(mode=0o700)
 shutil.copy2(ROOT/'compose.yaml',backup/'compose.yaml')
 shutil.copytree(ROOT/'secrets',backup/'secrets')
 with (backup/'before.dump').open('wb') as out:run('docker','exec',PG,'pg_dump','-U','metabase','-d','metabase','-Fc',stdout=out)
 before=counts()
 definitions=sql("SELECT md5(string_agg(row_to_json(x)::text,'|' ORDER BY id)) FROM (SELECT id,name,display,dataset_query,visualization_settings,archived FROM report_card ORDER BY id) x")
 assert sql(f"SELECT count(*) FROM pg_database WHERE datname='{DB}'")=='0'
 run('docker','exec',PG,'createdb','-U','metabase',DB)
 with (backup/'before.dump').open('rb') as f:run('docker','exec','-i',PG,'pg_restore','-U','metabase','-d',DB,'--no-owner','--exit-on-error',stdin=f)
 assert counts(DB)==before
 old=json.loads(run('docker','inspect',APP,capture_output=True,text=True).stdout)[0]
 env=dict(e.split('=',1) for e in old['Config']['Env'])
 assert env.get('MB_ENCRYPTION_SECRET_KEY') and env.get('MB_OSS_KEYCLOAK_ENABLED')=='true'
 env.update({'MB_DB_DBNAME':DB,'MB_SITE_URL':'http://127.0.0.1:3310','MB_DISABLE_SCHEDULER':'true','MB_CHECK_FOR_UPDATES':'false','MB_ANON_TRACKING_ENABLED':'false'})
 (REL/'candidate.env').write_text(''.join(k+'='+v+'\n' for k,v in env.items()))
 (REL/'Dockerfile').write_text('FROM uhooai/metabase-base:official-43a24f6\nCOPY --chmod=644 metabase.jar /app/metabase.jar\nLABEL org.opencontainers.image.revision="0b8b05e7"\n')
 (REL/'.dockerignore').write_text('*\n!Dockerfile\n!metabase.jar\n')
 run('docker','build','--progress=plain','--pull=false','--network=none','-t',IMAGE,str(REL))
 cmd=['docker','run','-d','--pull=never','--name',CAND,'--network','uhoo-metabase_default','-p','127.0.0.1:3310:3000','--env-file',str(REL/'candidate.env')]
 for m in old['Mounts']:
  assert m['Type']=='bind'
  cmd+=['--mount','type=bind,src='+m['Source']+',dst='+m['Destination']+(',readonly' if not m['RW'] else '')]
 run(*cmd,IMAGE)
 state={'backup':str(backup),'before_counts':before,'old_image':old['Config']['Image'],'image':IMAGE,'sha256':digest.hexdigest(),'report_definitions_hash':definitions}
 (REL/'state.json').write_text(json.dumps(state,indent=2)+'\n')
 wait(3310)
 p=props(3310)
 assert p['version']['tag']=='v0.64.3' and p['version']['hash'].startswith('0b8b05e') and p['oss-keycloak-enabled']
 assert counts(DB)==before
 assert sql("SELECT md5(string_agg(row_to_json(x)::text,'|' ORDER BY id)) FROM (SELECT id,name,display,dataset_query,visualization_settings,archived FROM report_card ORDER BY id) x",DB)==definitions
 print('Restored encrypted copy migrated and started with existing SSO key. '+before,flush=True)
elif phase=='switch':
 state=json.loads((REL/'state.json').read_text())
 wait(3310)
 assert props(3310)['version']['tag']=='v0.64.3'
 assert counts(DB)==state['before_counts']
 backup=pathlib.Path(state['backup'])
 compose=(ROOT/'compose.yaml').read_text()
 old='image: '+state['old_image']
 assert compose.count(old)==1
 run('docker','stop','-t','30',CAND)
 run('docker','compose','--ansi','never','--progress','plain','-f',str(ROOT/'compose.yaml'),'stop','-t','60','metabase')
 with (backup/'before-switch.dump').open('wb') as out:run('docker','exec',PG,'pg_dump','-U','metabase','-d','metabase','-Fc',stdout=out)
 state['switch_counts']=counts()
 (REL/'state.json').write_text(json.dumps(state,indent=2)+'\n')
 (ROOT/'compose.yaml').write_text(compose.replace(old,'image: '+IMAGE))
 run('docker','compose','--ansi','never','--progress','plain','-f',str(ROOT/'compose.yaml'),'up','-d','--no-deps','--pull','never','metabase')
 # Actual port binding is private host IP, not host loopback.
 for _ in range(160):
  r=subprocess.run(['docker','exec',APP,'curl','-fsS','http://localhost:3000/api/health'],capture_output=True,text=True)
  if r.returncode==0 and json.loads(r.stdout).get('status')=='ok':break
  time.sleep(3)
 else:raise RuntimeError('Production startup timeout; inspect before rollback')
 assert counts()==state['switch_counts']
 state['deployed_at']=datetime.datetime.now(datetime.timezone.utc).isoformat()
 (REL/'state.json').write_text(json.dumps(state,indent=2)+'\n')
 print(json.dumps(state),flush=True)
elif phase=='rollback':
 assert sys.argv[2:]==['--restore-before-switch'], 'Explicit snapshot restore flag required'
 state=json.loads((REL/'state.json').read_text())
 backup=pathlib.Path(state['backup'])
 assert backup.parent==ROOT/'backups' and (backup/'before-switch.dump').is_file()
 run('docker','compose','--ansi','never','--progress','plain','-f',str(ROOT/'compose.yaml'),'stop','-t','60','metabase')
 with (backup/'before-rollback.dump').open('wb') as out:run('docker','exec',PG,'pg_dump','-U','metabase','-d','metabase','-Fc',stdout=out)
 run('docker','exec',PG,'dropdb','-U','metabase','--force','metabase')
 run('docker','exec',PG,'createdb','-U','metabase','metabase')
 with (backup/'before-switch.dump').open('rb') as f:run('docker','exec','-i',PG,'pg_restore','-U','metabase','-d','metabase','--no-owner','--exit-on-error',stdin=f)
 shutil.copy2(backup/'compose.yaml',ROOT/'compose.yaml')
 run('docker','compose','--ansi','never','--progress','plain','-f',str(ROOT/'compose.yaml'),'up','-d','--no-deps','--pull','never','metabase')
 print('Snapshot and prior Compose restored. Verify original version and UI before accepting rollback.')
else:raise RuntimeError('Use stage SHA256, switch, or rollback --restore-before-switch')
