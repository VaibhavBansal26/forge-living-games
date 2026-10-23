export function mountWorldSockets(server,{db,userFor,readable,publicOrigin=null,WebSocketServer,roomState=new Map()}){
 const WebSocket={OPEN:1};const wss=new WebSocketServer({noServer:true,maxPayload:4096});
const rooms=new Map();
function broadcast(room,msg){for(const client of rooms.get(room)||[])if(client.readyState===WebSocket.OPEN)client.send(JSON.stringify(msg));}
function presence(room){broadcast(room,{type:'presence',users:[...(rooms.get(room)||[])].map(c=>({id:c.uid,name:c.name,avatar:c.avatar}))});}
server.on('upgrade',(req,socket,head)=>{
 if(new URL(req.url,'http://localhost').pathname==='/chess-ws')return;
 if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`&&req.headers.origin!==publicOrigin){socket.destroy();return;}
 const u=userFor(req);if(!u){socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');socket.destroy();return;}
 const url=new URL(req.url,'http://localhost');const p=db.prepare('SELECT * FROM projects WHERE id=?').get(url.searchParams.get('project'));const mode=url.searchParams.get('mode');
 if(!p||!['edit','play'].includes(mode)||(mode==='edit'&&!readable(p,u))||(mode==='play'&&!(p.published&&p.visibility!=='private'||readable(p,u)))){socket.destroy();return;}
 const code=(url.searchParams.get('room')||'default').replace(/[^a-zA-Z0-9-]/g,'').slice(0,40)||'default';
 const room=mode==='edit'?`edit:${p.id}`:`play:${p.id}:${code}`;
 if((rooms.get(room)?.size||0)>=8){socket.destroy();return;}
 wss.handleUpgrade(req,socket,head,ws=>{
 ws.uid=u.id;ws.name=u.name;ws.avatar=JSON.parse(u.avatar);ws.lastMove=0;
 if(!rooms.has(room))rooms.set(room,new Set());rooms.get(room).add(ws);
 if(mode==='play'&&!roomState.has(room)){const world=JSON.parse(readable(p,u)&&url.searchParams.get('preview')==='1'?p.world:p.published||p.world);roomState.set(room,{world,players:{},collected:[],won:false});}
 const st=roomState.get(room);if(st){const spawn=st.world.objects.find(o=>o.type==='spawn')||{x:0,z:5};st.players[u.id]||={id:u.id,name:u.name,avatar:ws.avatar,x:spawn.x,z:spawn.z};broadcast(room,{type:'state',state:st});}
 presence(room);
 ws.on('message',raw=>{try{if(!userFor(req)){ws.close(1008,'Sign in again');return;}const m=JSON.parse(raw);if(mode==='edit'){if(m.type==='cursor'&&Number.isFinite(m.x)&&Number.isFinite(m.y))broadcast(room,{type:'cursor',id:u.id,name:u.name,x:Math.max(0,Math.min(1,m.x)),y:Math.max(0,Math.min(1,m.y))});return;}
 if(m.type==='move'&&Date.now()-ws.lastMove>=30){ws.lastMove=Date.now();const player=st.players[u.id];const dx=Math.max(-1,Math.min(1,Number(m.dx)||0)),dz=Math.max(-1,Math.min(1,Number(m.dz)||0));const len=Math.hypot(dx,dz)||1;const x=Math.max(-10,Math.min(10,player.x+dx/len*.28)),z=Math.max(-10,Math.min(10,player.z+dz/len*.28));const blocked=st.world.objects.some(o=>['cottage','rock'].includes(o.type)&&Math.hypot(x-o.x,z-o.z)<(o.type==='cottage'?1.4:.65)*o.scale);if(!blocked){player.x=x;player.z=z;}
 for(const o of st.world.objects)if(o.type==='coin'&&!st.collected.includes(o.id)&&Math.hypot(player.x-o.x,player.z-o.z)<1){st.collected.push(o.id);applyRules('collect',o);}
 broadcast(room,{type:'state',state:st});
 }else if(m.type==='interact'){const player=st.players[u.id];const o=st.world.objects.find(o=>o.id===m.target);if(o&&Math.hypot(player.x-o.x,player.z-o.z)<2.5){applyRules('interact',o);broadcast(room,{type:'state',state:st});}}
 function applyRules(trigger,o){for(const r of st.world.rules){if(r.trigger!==trigger||r.target!==o.type)continue;if(r.requires==='all_crystals'&&st.collected.length<st.world.objects.filter(o=>o.type==='coin').length){ws.send(JSON.stringify({type:'notice',message:'Find all the star crystals before opening the gate.'}));continue;}if(r.effect==='win')st.won=true;else ws.send(JSON.stringify({type:'notice',message:r.message||'Something stirs in the world.'}));}}
 }catch{ws.send(JSON.stringify({type:'notice',message:'Invalid action.'}));}});
 ws.on('close',()=>{rooms.get(room)?.delete(ws);if(st&&![...(rooms.get(room)||[])].some(c=>c.uid===u.id))delete st.players[u.id];if(!rooms.get(room)?.size){rooms.delete(room);roomState.delete(room);}else{presence(room);if(st)broadcast(room,{type:'state',state:st});}});
 });
});

return {broadcast,roomState};
}
