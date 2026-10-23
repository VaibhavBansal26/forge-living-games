import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {initialWorld,validateWorld,inspectWorld} from '../shared/world.js';
export function mountCore(app,db,{passwords,publicOrigin=null,broadcast=()=>{},attempts=new Map()}){
db.exec(`
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password TEXT NOT NULL,avatar TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,owner TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,world TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0,published TEXT,visibility TEXT NOT NULL DEFAULT 'private',updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS members(project_id TEXT NOT NULL,user_id TEXT NOT NULL,role TEXT NOT NULL,PRIMARY KEY(project_id,user_id));
CREATE TABLE IF NOT EXISTS saves(user_id TEXT NOT NULL,project_id TEXT NOT NULL,PRIMARY KEY(user_id,project_id));
CREATE TABLE IF NOT EXISTS versions(id TEXT PRIMARY KEY,project_id TEXT NOT NULL,world TEXT NOT NULL,revision INTEGER NOT NULL,created INTEGER NOT NULL);
`);
const avatarDefault={skin:'#d4a17c',hair:'#3c2c24',shirt:'#e59153',pants:'#34465c',hat:true};
if(!db.prepare('SELECT id FROM projects LIMIT 1').get()){
 const creators=[['maya','Maya Chen'],['alex','Alex Rivera'],['samira','Samira Khan']];
 for(const [id,name]of creators)db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(id,`${id}@example.invalid`,name,'disabled',JSON.stringify(avatarDefault));
 for(const [id,title,owner,theme,description]of [['moonlit','Moonlit Valley','maya','valley','A little wonder. A hidden gate. An adventure better shared. Find the lost star crystals with your friends.'],['orbital','The Last Outpost','alex','orbital','Explore a distant station and recover its missing energy crystals.'],['desert','Sands of Solara','samira','desert','Follow the lanterns through an ancient outpost and unlock its forgotten gate.']]){
 const world=JSON.stringify(initialWorld(theme));db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,0,?,?,?)').run(id,owner,title,description,world,world,'public',Date.now());
 }
}
const hashToken=t=>createHash('sha256').update(t).digest('hex');
function userFor(req){const raw=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('forge_session='))?.slice(14);if(!raw)return null;return db.prepare('SELECT u.* FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token=? AND s.expires>?').get(hashToken(raw),Date.now());}
function publicUser(u){return u?{id:u.id,name:u.name,email:u.email,avatar:JSON.parse(u.avatar)}:null;}
app.use('/api',(req,res,next)=>{req.user=userFor(req);next();});
function auth(req,res,next){if(!req.user)return res.status(401).json({error:'Sign in to continue.'});next();}
function role(p,u){if(!u)return null;if(p.owner===u.id)return 'owner';return db.prepare('SELECT role FROM members WHERE project_id=? AND user_id=?').get(p.id,u.id)?.role;}
function readable(p,u){return p&&!!role(p,u);}
function projectCard(p,u){const creator=db.prepare('SELECT name,id FROM users WHERE id=?').get(p.owner);return {id:p.id,title:p.title,description:p.description,theme:JSON.parse(p.published||p.world).theme,creator:creator.name,creatorId:creator.id,role:role(p,u),published:!!p.published,visibility:p.visibility,updated:p.updated,saved:u?!!db.prepare('SELECT 1 FROM saves WHERE user_id=? AND project_id=?').get(u.id,p.id):false,demo:['maya','alex','samira'].includes(p.owner)};}
function projectData(p,u){return {...projectCard(p,u),world:JSON.parse(p.world),revision:p.revision};}

app.post('/api/auth/:action',async(req,res)=>{
 const key=req.socket.remoteAddress;let a=attempts.get(key);if(!a||a.until<Date.now()){a={count:0,until:Date.now()+60000};attempts.set(key,a);}if(++a.count>30)return res.status(429).json({error:'Too many attempts. Try again in a minute.'});
 const {email,password,name}=req.body; if(typeof email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>180||typeof password!=='string'||password.length<8||password.length>200)return res.status(400).json({error:'Use a valid email and a password of 8–200 characters.'});
 const normalized=email.trim().toLowerCase();let u;
 if(req.params.action==='register'){
  if(typeof name!=='string'||name.trim().length<2||name.length>60)return res.status(400).json({error:'Enter a name between 2 and 60 characters.'});
  if(db.prepare('SELECT id FROM users WHERE email=?').get(normalized))return res.status(409).json({error:'This email already has an account.'});
  const salt=randomBytes(16).toString('hex'),passwordHash=await passwords.hash(password,salt),id=randomUUID();
  if(db.prepare('SELECT id FROM users WHERE email=?').get(normalized))return res.status(409).json({error:'This email already has an account.'});
  db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(id,normalized,name.trim(),`${salt}:${passwordHash}`,JSON.stringify(avatarDefault));u=db.prepare('SELECT * FROM users WHERE id=?').get(id);
 }else if(req.params.action==='login'){
  u=db.prepare('SELECT * FROM users WHERE email=?').get(normalized);const [salt,stored]=u?.password?.split(':')||[];const valid=await passwords.verify(password,salt||'invalid-account-salt',stored);
  if(!stored||!valid)return res.status(401).json({error:'Email or password is incorrect.'});
 }else return res.status(404).json({error:'Unknown action'});
 const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hashToken(token),u.id,Date.now()+7*86400000);res.cookie('forge_session',token,{httpOnly:true,sameSite:'strict',secure:req.secure||publicOrigin?.startsWith('https:')||false,maxAge:7*86400000,path:'/'});res.json(publicUser(u));
});

app.get('/api/me',(req,res)=>res.json(publicUser(req.user)));
app.post('/api/logout',auth,(req,res)=>{db.prepare('DELETE FROM sessions WHERE user_id=?').run(req.user.id);res.clearCookie('forge_session');res.json({ok:true});});
app.put('/api/avatar',auth,(req,res)=>{const a=req.body;if(!['skin','hair','shirt','pants'].every(k=>/^#[0-9a-f]{6}$/i.test(a[k]))||typeof a.hat!=='boolean')return res.status(400).json({error:'Invalid avatar'});db.prepare('UPDATE users SET avatar=? WHERE id=?').run(JSON.stringify(a),req.user.id);res.json({ok:true});});
app.get('/api/games',(req,res)=>{res.json(db.prepare("SELECT * FROM projects WHERE visibility='public' AND published IS NOT NULL ORDER BY updated DESC").all().map(p=>projectCard(p,req.user)));});
app.get('/api/games/:id',(req,res)=>{const p=db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);if(!p||!p.published||(p.visibility==='private'&&!readable(p,req.user)))return res.status(404).json({error:'This game is not published or you do not have access.'});res.json(projectCard(p,req.user));});
app.get('/api/creators/:id',(req,res)=>{const u=db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);if(!u)return res.status(404).json({error:'Creator not found'});res.json({id:u.id,name:u.name,avatar:JSON.parse(u.avatar),games:db.prepare("SELECT * FROM projects WHERE owner=? AND visibility='public' AND published IS NOT NULL").all(u.id).map(p=>projectCard(p,req.user))});});
app.get('/api/projects',auth,(req,res)=>res.json(db.prepare('SELECT DISTINCT p.* FROM projects p LEFT JOIN members m ON m.project_id=p.id WHERE p.owner=? OR m.user_id=? ORDER BY updated DESC').all(req.user.id,req.user.id).map(p=>projectCard(p,req.user))));
app.post('/api/projects',auth,(req,res)=>{const title=String(req.body.title||'Untitled world').trim().slice(0,80);const world=initialWorld(req.body.theme||'valley');const err=validateWorld(world);if(err)return res.status(400).json({error:err});const id=randomUUID();db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,0,NULL,?,?)').run(id,req.user.id,title,'A new adventure, made by you.',JSON.stringify(world),'private',Date.now());res.status(201).json(projectData(db.prepare('SELECT * FROM projects WHERE id=?').get(id),req.user));});
app.get('/api/projects/:id',auth,(req,res)=>{const p=db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);if(!readable(p,req.user))return res.status(403).json({error:'This project is private.'});res.json(projectData(p,req.user));});
app.put('/api/projects/:id',auth,(req,res)=>{const p=db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);if(!p||!['owner','editor'].includes(role(p,req.user)))return res.status(403).json({error:'Editor access required.'});const {world,revision,title,description}=req.body;const err=validateWorld(world);if(err)return res.status(400).json({error:err});if(revision!==p.revision)return res.status(409).json({error:'Another designer saved first. Their latest version has been loaded.',project:projectData(p,req.user)});const next=p.revision+1;db.prepare('UPDATE projects SET world=?,revision=?,title=?,description=?,updated=? WHERE id=?').run(JSON.stringify(world),next,String(title||p.title).slice(0,80),String(description??p.description).slice(0,500),Date.now(),p.id);const data=projectData(db.prepare('SELECT * FROM projects WHERE id=?').get(p.id),req.user);broadcast(`edit:${p.id}`,{type:'project',project:{world:data.world,revision:next,title:data.title,description:data.description},by:req.user.id});res.json(data);});
app.post('/api/projects/:id/publish',auth,(req,res)=>{const p=db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);if(!p||p.owner!==req.user.id)return res.status(403).json({error:'Only the owner can publish.'});const issues=inspectWorld(JSON.parse(p.world));if(issues.length)return res.status(400).json({error:issues.join(' ')});const visibility=['public','unlisted','private'].includes(req.body.visibility)?req.body.visibility:'public';db.prepare('UPDATE projects SET published=world,visibility=?,updated=? WHERE id=?').run(visibility,Date.now(),p.id);db.prepare('INSERT INTO versions VALUES(?,?,?,?,?)').run(randomUUID(),p.id,p.world,p.revision,Date.now());res.json({ok:true,id:p.id});});
app.post('/api/projects/:id/invite',auth,(req,res)=>{const p=db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);if(!p||p.owner!==req.user.id)return res.status(403).json({error:'Only the owner can invite designers.'});const u=db.prepare('SELECT * FROM users WHERE email=?').get(String(req.body.email).trim().toLowerCase());if(!u)return res.status(404).json({error:'Ask this designer to create an account first.'});if(u.id===p.owner)return res.status(400).json({error:'You already own this world.'});const r=req.body.role==='viewer'?'viewer':'editor';db.prepare('INSERT INTO members VALUES(?,?,?) ON CONFLICT(project_id,user_id) DO UPDATE SET role=excluded.role').run(p.id,u.id,r);res.json({ok:true,name:u.name});});
app.get('/api/projects/:id/members',auth,(req,res)=>{const p=db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);if(!readable(p,req.user))return res.status(403).json({error:'Access denied'});res.json(db.prepare('SELECT u.id,u.name,u.email,m.role FROM members m JOIN users u ON u.id=m.user_id WHERE m.project_id=?').all(p.id));});
app.post('/api/games/:id/save',auth,(req,res)=>{const p=db.prepare("SELECT * FROM projects WHERE id=? AND visibility='public' AND published IS NOT NULL").get(req.params.id);if(!p)return res.status(404).json({error:'Game not found'});const found=db.prepare('SELECT 1 FROM saves WHERE user_id=? AND project_id=?').get(req.user.id,p.id);if(found)db.prepare('DELETE FROM saves WHERE user_id=? AND project_id=?').run(req.user.id,p.id);else db.prepare('INSERT INTO saves VALUES(?,?)').run(req.user.id,p.id);res.json({saved:!found});});

return {auth,userFor,readable};
}
