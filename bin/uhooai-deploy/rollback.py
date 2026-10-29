#!/usr/bin/env python3
"""Explicit full application rollback. Requires --restore-before-switch.
Restores the recorded database snapshot, replacing post-upgrade writes. Always
preserves an additional pre-rollback dump. Never touches other databases/volumes.
"""
import json, os, pathlib, shutil, subprocess, sys, time, urllib.request, urllib.parse
assert sys.argv[1:]==['--restore-before-switch'], 'Explicit --restore-before-switch required'
os.umask(0o077)
ROOT=pathlib.Path('/home/uhoo/metabase')
RELEASE=ROOT/'releases/uhooai-v64-a26b7ad-20261018'
state=json.loads((RELEASE/'stage.json').read_text())
BACKUP=pathlib.Path(state['backup'])
assert BACKUP.parent==ROOT/'backups'
assert (BACKUP/'metabase-before-switch.dump').is_file()
PG='uhoo-metabase-postgres-1'
def run(*a,**kw):return subprocess.run(a,check=True,**kw)
assert run('hostname',capture_output=True,text=True).stdout.strip()=='uhooai'
run('docker','compose','-f',str(ROOT/'compose.yaml'),'stop','-t','60','metabase')
with (BACKUP/('metabase-before-rollback-'+time.strftime('%Y%m%d-%H%M%S')+'.dump')).open('wb') as out:
 run('docker','exec',PG,'pg_dump','-U','metabase','-d','metabase','-Fc',stdout=out)
run('docker','exec',PG,'dropdb','-U','metabase','--force','metabase')
run('docker','exec',PG,'createdb','-U','metabase','metabase')
with (BACKUP/'metabase-before-switch.dump').open('rb') as data:
 run('docker','exec','-i',PG,'pg_restore','-U','metabase','-d','metabase','--exit-on-error','--no-owner',stdin=data)
shutil.copy2(BACKUP/'compose.yaml',ROOT/'compose.yaml')
clientfile=BACKUP/'keycloak-oss-metabase.json'
if clientfile.exists():
 kc=json.loads(run('docker','inspect','uhooai-keycloak-1',capture_output=True,text=True).stdout)[0]
 env=dict(v.split('=',1) for v in kc['Config']['Env'])
 base='http://'+kc['NetworkSettings']['Networks']['uhooai_portal']['IPAddress']+':8080'
 form=urllib.parse.urlencode({'grant_type':'password','client_id':'admin-cli','username':env['KC_BOOTSTRAP_ADMIN_USERNAME'],'password':env['KC_BOOTSTRAP_ADMIN_PASSWORD']}).encode()
 token=json.load(urllib.request.urlopen(urllib.request.Request(base+'/realms/master/protocol/openid-connect/token',data=form),timeout=10))['access_token']
 client=json.loads(clientfile.read_text())
 req=urllib.request.Request(base+'/admin/realms/enterprise-ai/clients/'+client['id'],data=json.dumps(client).encode(),headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},method='PUT')
 with urllib.request.urlopen(req,timeout=10) as r:assert r.status==204
run('docker','compose','-f',str(ROOT/'compose.yaml'),'up','-d','--no-deps','--pull','never','metabase')
print('Original Compose, application DB and Keycloak client restored. Verify runtime health and external UI before declaring rollback accepted.')
