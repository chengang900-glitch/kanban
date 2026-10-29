#!/usr/bin/env python3
"""Enable encryption on an existing unencrypted app DB, first verifying a clone.
Use only after configuring the protected key and taking the stopped-app dump.
"""
import json, os, pathlib, signal, subprocess, time, urllib.request
ROOT=pathlib.Path('/home/uhoo/metabase')
RELEASE=ROOT/'releases/uhooai-v64-a26b7ad-20261018'
state=json.loads((RELEASE/'stage.json').read_text())
BACKUP=pathlib.Path(state['backup'])
PG='uhoo-metabase-postgres-1'
IMAGE=state['image']
os.umask(0o077)
def run(*args,**kw):return subprocess.run(args,check=True,**kw)
def sql(query,db):
 return run('docker','exec',PG,'psql','-U','metabase','-d',db,'-At','-v','ON_ERROR_STOP=1','-c',query,capture_output=True,text=True).stdout.strip()
def counts(db):return sql('SELECT (SELECT count(*) FROM core_user),(SELECT count(*) FROM report_card),(SELECT count(*) FROM report_dashboard)',db)
def common(db):
 return ['--network','uhoo-metabase_default','--env-file',str(ROOT/'secrets/custom-sso.env'),
 '--mount',f'type=bind,src={ROOT}/secrets/db_password,dst=/run/secrets/db_password,readonly',
 '--mount',f'type=bind,src={RELEASE}/uhooai-cacerts,dst=/opt/uhooai/cacerts,readonly',
 '-e','MB_DB_TYPE=postgres','-e','MB_DB_HOST=postgres','-e','MB_DB_PORT=5432','-e',f'MB_DB_DBNAME={db}',
 '-e','MB_DB_USER=metabase','-e','MB_DB_PASS_FILE=/run/secrets/db_password','-e','MB_DISABLE_SCHEDULER=true',
 '-e','JAVA_OPTS=-Xms512m -Xmx2g -Djavax.net.ssl.trustStore=/opt/uhooai/cacerts -Djavax.net.ssl.trustStorePassword=changeit']
def encrypt(db,name):
 # This is a newly added key, not a recovery attempt with a possibly wrong key.
 assert sql("SELECT count(*) FROM setting WHERE key='encryption-check' AND value IS NOT NULL AND value<>'unencrypted'",db)=='0'
 with (BACKUP/(name+'.log')).open('wb') as out:
  r=subprocess.run(['docker','run','--rm','--pull=never','--name',name,*common(db),IMAGE,'enable-encryption'],stdout=out,stderr=subprocess.STDOUT)
 assert r.returncode==0, f'Encryption command failed for {db}; inspect protected log'
 assert counts(db)==state['original_counts']
 assert sql("SELECT count(*) FROM setting WHERE key='encryption-check' AND value IS NOT NULL AND value<>'unencrypted'",db)=='1'
 print('Explicit encryption and sentinel verified for '+db,flush=True)
def wait(container):
 for _ in range(150):
  r=subprocess.run(['docker','exec',container,'curl','-fsS','--max-time','5','http://localhost:3000/api/health'],capture_output=True,text=True)
  if r.returncode==0 and json.loads(r.stdout).get('status')=='ok':return
  time.sleep(3)
 raise RuntimeError(container+' did not become ready')
assert run('hostname',capture_output=True,text=True).stdout.strip()=='uhooai'
assert (BACKUP/'metabase-before-switch.dump').is_file()
# Stop only the superseded health-wait script; the app itself is already stopped.
for row in run('ps','-eo','pid,args','--no-headers',capture_output=True,text=True).stdout.splitlines():
 pid,_,args=row.strip().partition(' ')
 if args.strip()=='python3 /home/uhoo/metabase/releases/uhooai-v64-a26b7ad-20261018/switch.py':os.kill(int(pid),signal.SIGTERM)
run('docker','stop','-t','30','uhoo-metabase-metabase-1')
clone=state['clone_database']
encrypt(clone,'uhoo-metabase-encrypt-verify')
run('docker','rm','uhoo-metabase-candidate')
run('docker','run','-d','--pull=never','--name','uhoo-metabase-candidate','--restart','no','-p','127.0.0.1:3310:3000',*common(clone),'-e','MB_SITE_URL=http://localhost:3310',IMAGE)
wait('uhoo-metabase-candidate')
with urllib.request.urlopen('http://127.0.0.1:3310/api/session/properties',timeout=10) as r:props=json.load(r)
assert props['version']['hash']=='a26b7ad' and props['oss-keycloak-enabled'] is True
print('Encrypted restored copy starts successfully with SSO enabled.',flush=True)
run('docker','stop','-t','30','uhoo-metabase-candidate')
encrypt('metabase','uhoo-metabase-encrypt-production')
run('docker','compose','--ansi','never','--progress','plain','-f',str(ROOT/'compose.yaml'),'up','-d','--no-deps','--pull','never','metabase')
wait('uhoo-metabase-metabase-1')
assert counts('metabase')==state['original_counts']
state.update({'deployed_at':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'before_switch_counts':state['original_counts'],'after_switch_counts':counts('metabase'),'encryption_enable_command':'passed on restored copy then production'})
(RELEASE/'stage.json').write_text(json.dumps(state,indent=2)+'\n')
print(json.dumps(state),flush=True)
