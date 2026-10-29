#!/usr/bin/env python3
"""Prepare the exact existing Keycloak client and CA trust; no secret output."""
import json, os, pathlib, secrets, shutil, subprocess, urllib.request, urllib.parse
ROOT=pathlib.Path('/home/uhoo/metabase')
RELEASE=ROOT/'releases/uhooai-v64-a26b7ad-20261018'
os.umask(0o077)
state=json.loads((RELEASE/'stage.json').read_text())
BACKUP=pathlib.Path(state['backup'])
def run(*args,**kw):return subprocess.run(args,check=True,**kw)
kc=json.loads(run('docker','inspect','uhooai-keycloak-1',capture_output=True,text=True).stdout)[0]
env=dict(v.split('=',1) for v in kc['Config']['Env'])
ip=kc['NetworkSettings']['Networks']['uhooai_portal']['IPAddress']
base='http://'+ip+':8080'
form=urllib.parse.urlencode({'grant_type':'password','client_id':'admin-cli','username':env['KC_BOOTSTRAP_ADMIN_USERNAME'],'password':env['KC_BOOTSTRAP_ADMIN_PASSWORD']}).encode()
token=json.load(urllib.request.urlopen(urllib.request.Request(base+'/realms/master/protocol/openid-connect/token',data=form),timeout=10))['access_token']
def api(path,data=None):
 req=urllib.request.Request(base+'/admin/realms/enterprise-ai/'+path,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},data=json.dumps(data).encode() if data is not None else None,method='PUT' if data is not None else 'GET')
 with urllib.request.urlopen(req,timeout=10) as r:return json.load(r) if r.status!=204 else None
clients=api('clients?clientId=oss-metabase')
assert len(clients)==1
client=api('clients/'+clients[0]['id'])
callback='https://122.224.218.82:9443/metabase/auth/keycloak/callback'
assert client['redirectUris']==[callback] and not client['publicClient'] and client['standardFlowEnabled']
secret=api('clients/'+client['id']+'/client-secret')['value']
assert secret and '\n' not in secret and '$' not in secret
(BACKUP/'keycloak-oss-metabase.json').write_text(json.dumps(client,indent=2)+'\n')
# The existing private host binding is reachable from the IdP network. Signed
# logout JWTs are still verified by the RP; the browser callback remains HTTPS.
backchannel='http://192.168.60.30:3000/auth/keycloak/backchannel-logout'
attrs=client.setdefault('attributes',{})
attrs.update({'backchannel.logout.url':backchannel,'backchannel.logout.session.required':'true','pkce.code.challenge.method':'S256'})
api('clients/'+client['id'],client)
assert api('clients/'+client['id'])['attributes']['backchannel.logout.url']==backchannel
ssofile=ROOT/'secrets/custom-sso.env'
assert not ssofile.exists(), 'Existing SSO secret config requires review before replacement'
values={
 'MB_OSS_KEYCLOAK_ENABLED':'true',
 'MB_OSS_KEYCLOAK_ISSUER':'https://122.224.218.82:9443/realms/enterprise-ai',
 'MB_OSS_KEYCLOAK_CLIENT_ID':'oss-metabase',
 'MB_OSS_KEYCLOAK_CLIENT_SECRET':secret,
 'MB_ENCRYPTION_SECRET_KEY':secrets.token_urlsafe(48),
 'MB_OSS_KEYCLOAK_PORTAL_PATH':'/portal/data',
 'MB_OSS_WORKSPACE_EMBEDDING_ENABLED':'true',
}
ssofile.write_text(''.join(k+'='+v+'\n' for k,v in values.items()))
os.chmod(ssofile,0o600)
shutil.copy2(ssofile,BACKUP/'custom-sso.env')
shutil.copy2('/srv/uhooai/data/caddy/data/caddy/pki/authorities/local/root.crt',RELEASE/'caddy-root.crt')
run('docker','cp','uhoo-metabase-metabase-1:/opt/java/openjdk/lib/security/cacerts',str(RELEASE/'uhooai-cacerts'))
os.chmod(RELEASE/'caddy-root.crt',0o644)
os.chmod(RELEASE/'uhooai-cacerts',0o644)
run('docker','run','--rm','--network','none','-v',str(RELEASE)+':/work','--entrypoint','keytool','uhooai/metabase-base:official-43a24f6','-importcert','-noprompt','-alias','uhooai-caddy-local','-file','/work/caddy-root.crt','-keystore','/work/uhooai-cacerts','-storepass','changeit')
compose=(ROOT/'compose.yaml').read_text()
old='    image: metabase/metabase:v0.64.2.5\n'
assert compose.count(old)==1
compose=compose.replace(old,'    image: '+state['image']+'\n    env_file:\n      - ./secrets/custom-sso.env\n    volumes:\n      - ./releases/uhooai-v64-a26b7ad-20261018/uhooai-cacerts:/opt/uhooai/cacerts:ro\n')
assert compose.count('JAVA_OPTS: -Xms512m -Xmx2g')==1
compose=compose.replace('JAVA_OPTS: -Xms512m -Xmx2g','JAVA_OPTS: -Xms512m -Xmx2g -Djavax.net.ssl.trustStore=/opt/uhooai/cacerts -Djavax.net.ssl.trustStorePassword=changeit')
(RELEASE/'compose.custom.yaml').write_text(compose)
state['backchannel_logout_url']=backchannel
state['sso_client']='oss-metabase'
(RELEASE/'stage.json').write_text(json.dumps(state,indent=2)+'\n')
print('Prepared exact existing Keycloak client, protected env file, CA trust store and candidate Compose. Production service unchanged.')
