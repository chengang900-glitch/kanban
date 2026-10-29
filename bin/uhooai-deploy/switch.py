#!/usr/bin/env python3
"""Switch only the Metabase service after a successful restored-copy migration."""
import json, os, pathlib, shutil, subprocess, time, urllib.request
os.umask(0o077)
ROOT=pathlib.Path('/home/uhoo/metabase')
RELEASE=ROOT/'releases/uhooai-v64-a26b7ad-20261018'
state=json.loads((RELEASE/'stage.json').read_text())
BACKUP=pathlib.Path(state['backup'])
PG='uhoo-metabase-postgres-1'
def run(*args,**kw):return subprocess.run(args,check=True,**kw)
def sql(query,db='metabase'):
 return run('docker','exec',PG,'psql','-U','metabase','-d',db,'-At','-v','ON_ERROR_STOP=1','-c',query,capture_output=True,text=True).stdout.strip()
def get(port,path):
 with urllib.request.urlopen('http://127.0.0.1:'+str(port)+path,timeout=10) as r:return json.load(r)
def count(db):return sql('SELECT (SELECT count(*) FROM core_user),(SELECT count(*) FROM report_card),(SELECT count(*) FROM report_dashboard)',db)
assert get(3310,'/api/health')['status']=='ok'
props=get(3310,'/api/session/properties')
assert props['version']['hash']=='a26b7ad'
assert props.get('oss-keycloak-enabled') is True, 'Verify the restored copy with the full production SSO environment first'
clone=state['clone_database']
assert count(clone)==state['original_counts']
assert sql("SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'oss_keycloak_%'",clone)=='4'
assert sql("SELECT count(*) FROM databasechangelog WHERE id='v63.2026-10-03T00:00:01'",clone)=='1'
# Compare preserved report definitions, not merely their row counts.
checksum="SELECT md5(string_agg(row_to_json(x)::text,'|' ORDER BY id)) FROM (SELECT id,name,display,dataset_query,visualization_settings,archived FROM report_card ORDER BY id) x"
assert sql(checksum)==sql(checksum,clone)
# Existing databases must be explicitly encrypted with the newly configured key
# before switching to the SSO env file. Refuse before stopping production.
assert sql("SELECT count(*) FROM setting WHERE key='encryption-check' AND value IS NOT NULL AND value<>'unencrypted'",clone)=='1', 'Enable encryption on the restored copy and verify the full SSO environment first'
print('Candidate healthy; custom migration and report-definition preservation verified.',flush=True)
run('docker','compose','--project-directory',str(ROOT),'-f',str(RELEASE/'compose.custom.yaml'),'config','--quiet')
run('docker','stop','-t','30','uhoo-metabase-candidate')
run('docker','compose','-f',str(ROOT/'compose.yaml'),'stop','-t','60','metabase')
# Final consistent rollback snapshot after stopping the sole application writer.
with (BACKUP/'metabase-before-switch.dump').open('wb') as out:
 run('docker','exec',PG,'pg_dump','-U','metabase','-d','metabase','-Fc',stdout=out)
state['before_switch_counts']=count('metabase')
(RELEASE/'stage.json').write_text(json.dumps(state,indent=2)+'\n')
shutil.copy2(RELEASE/'compose.custom.yaml',ROOT/'compose.yaml')
run('docker','compose','-f',str(ROOT/'compose.yaml'),'up','-d','--no-deps','--pull','never','metabase')
print('Custom service started; waiting for application initialization.',flush=True)
for n in range(120):
 try:
  r=run('docker','exec','uhoo-metabase-metabase-1','curl','-fsS','--max-time','5','http://localhost:3000/api/health',capture_output=True,text=True)
  if json.loads(r.stdout).get('status')=='ok':break
 except (subprocess.CalledProcessError,ValueError):pass
 time.sleep(3)
else:raise RuntimeError('Custom service not ready within 360s; preserve backup and inspect before rollback.')
assert count('metabase')==state['before_switch_counts']
assert sql("SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'oss_keycloak_%'")=='4'
state['deployed_at']=time.strftime('%Y-%m-%dT%H:%M:%S%z')
state['after_switch_counts']=count('metabase')
(RELEASE/'stage.json').write_text(json.dumps(state,indent=2)+'\n')
print(json.dumps(state),flush=True)
