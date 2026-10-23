import {EventEmitter} from 'node:events';

// Minimal route adapter: keep the same API handlers on Node and Workers.
export class Router {
 constructor(){this.layers=[];}
 use(prefix,fn){this.layers.push({prefix,handlers:[fn]});}
 route(method,path,handlers){const keys=[];const pattern=path.split('/').map(p=>p.startsWith(':')?(keys.push(p.slice(1)),'([^/]+)'):p).join('/');this.layers.push({method,re:new RegExp(`^${pattern}$`),keys,handlers});}
 get(path,...f){this.route('GET',path,f);}post(path,...f){this.route('POST',path,f);}put(path,...f){this.route('PUT',path,f);}
 async fetch(request){
  const url=new URL(request.url),headers=Object.fromEntries(request.headers);let body={};
  if(['POST','PUT','DELETE'].includes(request.method)){
   if(headers.origin&&headers.origin!==url.origin)return Response.json({error:'Origin not allowed'},{status:403});
   if(Number(headers['content-length'])>512*1024)return Response.json({error:'Request too large'},{status:413});
   const reader=request.body?.getReader(),chunks=[];let size=0;
   if(reader){while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>512*1024){await reader.cancel();return Response.json({error:'Request too large'},{status:413});}chunks.push(value);}}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}const text=new TextDecoder().decode(bytes);
   try{body=text?JSON.parse(text):{};if(!body||typeof body!=='object')throw Error();}catch{return Response.json({error:'Invalid JSON'},{status:400});}
  }
  const req={url:url.pathname+url.search,headers,body,method:request.method,secure:url.protocol==='https:',socket:{remoteAddress:headers['cf-connecting-ip']||'local'},params:{}};
  let status=200,response;const out=new Headers({'Content-Type':'application/json','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});
  const res={status(n){status=n;return this;},json(value){response=new Response(JSON.stringify(value),{status,headers:out});return this;},cookie(name,value,options={}){out.append('Set-Cookie',`${name}=${value}; Path=/; HttpOnly; SameSite=Strict${options.secure?'; Secure':''}; Max-Age=${Math.floor((options.maxAge||0)/1000)}`);},clearCookie(name){out.append('Set-Cookie',`${name}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${req.secure?'; Secure':''}`);}};
  try{
   for(const layer of this.layers){let match;
    if(layer.prefix){if(!url.pathname.startsWith(layer.prefix+'/')&&url.pathname!==layer.prefix)continue;}
    else{if(layer.method!==request.method||!(match=url.pathname.match(layer.re)))continue;req.params=Object.fromEntries(layer.keys.map((k,i)=>[k,decodeURIComponent(match[i+1])]));}
    for(const handler of layer.handlers){let next=false;await handler(req,res,()=>{next=true;});if(response)return response;if(!next)break;}
   }
   return Response.json({error:'Not found'},{status:404});
  }catch(error){console.error('API failed:',error.message);return Response.json({error:'The request could not be completed.'},{status:500});}
 }
}
export function sqliteAdapter(sql){return {exec(text){for(const statement of text.split(';').map(x=>x.trim()).filter(Boolean))sql.exec(statement);},prepare(query){return {get(...args){return sql.exec(query,...args).toArray()[0];},all(...args){return sql.exec(query,...args).toArray();},run(...args){const result=sql.exec(query,...args);result.toArray();return {changes:result.rowsWritten};}};}};}

export class WorkerSocket extends EventEmitter {
 constructor(raw,maxPayload=4096){super();this.raw=raw;this.maxPayload=maxPayload;}
 get readyState(){return this.raw.readyState;}
 send(data){try{if(this.readyState===1)this.raw.send(data);}catch{/* Peer disconnected. */}}
 close(code=1000,reason=''){this.raw.close(code,reason);}
}
export function upgradeRequest(request){const url=new URL(request.url);return {url:url.pathname+url.search,headers:Object.fromEntries(request.headers),secure:url.protocol==='https:',socket:{remoteAddress:request.headers.get('cf-connecting-ip')||'local'}};}

export const passwords={
 async hash(password,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256);return 'pbkdf2$'+Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('');},
 async verify(password,salt,stored){const actual=await this.hash(password,salt);if(!stored||actual.length!==stored.length)return false;let mismatch=0;for(let i=0;i<actual.length;i++)mismatch|=actual.charCodeAt(i)^stored.charCodeAt(i);return mismatch===0;}
};
