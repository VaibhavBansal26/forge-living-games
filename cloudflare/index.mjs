import {DurableObject} from 'cloudflare:workers';
import {EventEmitter} from 'node:events';
import {mountCore} from '../server/core.mjs';
import {mountChess} from '../server/chess-core.mjs';
import {mountWorldSockets} from '../server/world-sockets.mjs';
import {Router,sqliteAdapter,WorkerSocket,upgradeRequest,passwords} from './runtime.mjs';

// One durable coordinator is suitable for the current small community prototype.
// Static assets are served separately and do not wake it up.
export class ForgeCommunity extends DurableObject {
 constructor(ctx,env){
  super(ctx,env);this.sockets=new Map();this.router=new Router();this.server=new EventEmitter();
  const db=sqliteAdapter(ctx.storage.sql);let worlds;this.attempts=new Map((ctx.storage.kv.get('auth-attempts')||[]).filter(([,a])=>a.until>Date.now()));
  const {auth,userFor,readable}=mountCore(this.router,db,{passwords,attempts:this.attempts,broadcast:(...args)=>worlds?.broadcast(...args)});
  const owner=this;
  class SocketServer {
   constructor(options){this.maxPayload=options.maxPayload;}
   handleUpgrade(req,socket,head,callback){
    let raw=socket.existing;
    if(!raw){const pair=new WebSocketPair();raw=pair[1];ctx.acceptWebSocket(raw);socket.response=new Response(null,{status:101,webSocket:pair[0]});raw.serializeAttachment({request:req});}
    const wrapper=new WorkerSocket(raw,this.maxPayload);owner.sockets.set(raw,wrapper);callback(wrapper);
   }
  }
  mountChess(this.router,this.server,{db,auth,userFor,WebSocketServer:SocketServer});
  worlds=mountWorldSockets(this.server,{db,userFor,readable,WebSocketServer:SocketServer,roomState:new Map(ctx.storage.kv.get('world-rooms')||[])});this.worlds=worlds;
  this.router.get('/api/health',(req,res)=>res.json({ok:true,hosting:'cloudflare-free'}));
  for(const raw of ctx.getWebSockets()){
   const attachment=raw.deserializeAttachment();if(!attachment?.request){raw.close(1008,'Reconnect');continue;}
   const socket={existing:raw,destroy(){raw.close(1008,'Sign in again');},write(){}};
   this.server.emit('upgrade',attachment.request,socket,null);
  }
 }
 persistWorlds(){this.ctx.storage.kv.put('world-rooms',[...this.worlds.roomState]);}
 async fetch(request){
  const url=new URL(request.url);
  if(request.headers.get('Upgrade')?.toLowerCase()==='websocket'){
   if(!['/chess-ws','/ws'].includes(url.pathname))return new Response('Not found',{status:404});
   if(request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)return new Response('Origin not allowed',{status:403});
   const req=upgradeRequest(request),socket={response:null,destroy(){this.response=new Response('Access denied',{status:403});},write(){}};
   this.server.emit('upgrade',req,socket,null);this.persistWorlds();return socket.response||new Response('Access denied',{status:403});
  }
  const response=await this.router.fetch(request);if(url.pathname.startsWith('/api/auth/'))this.ctx.storage.kv.put('auth-attempts',[...this.attempts].filter(([,a])=>a.until>Date.now()));return response;
 }
 webSocketMessage(raw,message){
  const socket=this.sockets.get(raw);if(!socket)return raw.close(1011,'Reconnect');
  if(typeof message!=='string'||new TextEncoder().encode(message).length>socket.maxPayload)return raw.close(1009,'Message too large');
  socket.emit('message',message);this.persistWorlds();
 }
 webSocketClose(raw,code,reason){const socket=this.sockets.get(raw);socket?.emit('close');this.sockets.delete(raw);this.persistWorlds();raw.close([1005,1006,1015].includes(code)?1000:code,reason);}
 webSocketError(raw){this.sockets.get(raw)?.emit('close');this.sockets.delete(raw);this.persistWorlds();}
}
export default {
 async fetch(request,env){const path=new URL(request.url).pathname;
  if(path.startsWith('/api/')||path==='/chess-ws'||path==='/ws')return env.FORGE.getByName('community-v1').fetch(request);
  return env.ASSETS.fetch(request);
 }
};
