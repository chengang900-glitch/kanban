/** Seed synthetic ordinary accounts in the loopback-only fixture. Never accepts a remote URL. */
const origin = 'http://127.0.0.1:33419';
const base = `${origin}/metabase`;
const request = async (path, options={}) => {
  const response=await fetch(`${base}${path}`,options);
  const data=await response.json();
  if(!response.ok) throw new Error(`${path}: HTTP ${response.status}: ${JSON.stringify(data)}`);
  return data;
};
const json = data=>({method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
const properties = await request('/api/session/properties');
if(!properties['setup-token']) throw new Error('Only seed a new isolated database');
const session = await request('/api/setup', json({token:properties['setup-token'],prefs:{site_name:'Isolated OSS QA',site_locale:'en'},user:{email:'admin@example.invalid',first_name:'Fixture',last_name:'Admin',password:'Fixture-Only-Password-42!'}}));
const adminHeaders = {'content-type':'application/json','X-Metabase-Session':session.id,Origin:origin};
for(const subject of ['user-a','user-b']) {
 const user=await request('/api/user',{...json({email:`${subject}@example.invalid`,first_name:subject,last_name:'Fixture',password:'Fixture-Only-Password-42!'}),headers:adminHeaders});
 await request('/auth/keycloak/bindings',{...json({user_id:user.id,subject}),headers:adminHeaders});
 console.log(`${subject}: ordinary user ${user.id}, explicitly bound`);
}
const databases = await request('/api/database',{headers:adminHeaders});
console.log(`Local sample databases: ${databases.data?.length ?? databases.length}`);
