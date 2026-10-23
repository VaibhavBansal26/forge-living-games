import {Chess} from 'chess.js';
import {chooseComputerMove} from './chess-ai.mjs';
import {randomUUID} from 'node:crypto';

export const PIECE_NAMES={p:'Pawn',r:'Rook',n:'Knight',b:'Bishop',q:'Queen',k:'King'};
const talkLines={p:['Small steps, great victories. I await your command.','Point me toward the front, commander.','A pawn today. A legend tomorrow.'],r:['Stone and steel answer only to you.','Give me an open file. I will hold it.','These walls have legs, commander.'],n:['The straight path is rarely the interesting one.','A leap of faith? I prefer a calculated jump.'],b:['The diagonals whisper of opportunity.','My staff is yours to command.'],q:['Show me the opening. I will finish the story.','Across any rank, file, or diagonal. Your will, commander.'],k:['My army stands with you. Choose our next move.','Keep me safe, and together we will prevail.']};
function loadGame(row){const c=new Chess();if(row.pgn)c.loadPgn(row.pgn);return c;}
export function parseArmyCommand(chess,color,text){
 const s=String(text).trim().toLowerCase().replace(/[.,!?]/g,'').replace(/\b(alpha|bravo|charlie|delta|echo|foxtrot|golf|hotel)\b/g,x=>({alpha:'a',bravo:'b',charlie:'c',delta:'d',echo:'e',foxtrot:'f',golf:'g',hotel:'h'})[x]).replace(/\b(one|two|three|four|five|six|seven|eight)\b/g,x=>({one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8'})[x]).replace(/\b([a-h])\s+([1-8])\b/g,'$1$2');
 const name=s.match(/\b(pawn|rook|knight|bishop|queen|king)\b/)?.[1];const type=Object.entries(PIECE_NAMES).find(([,n])=>n.toLowerCase()===name)?.[0];const squares=s.match(/\b[a-h][1-8]\b/g)||[];
 if(/\b(speak|talk|hello|ready|advice)\b/.test(s)){
  let square=squares[0];if(square){const p=chess.get(square);if(!p||p.color!==color||(type&&p.type!==type))throw new Error('That piece does not belong to your army.');}
  else square=chess.board().flat().find(p=>p&&p.color===color&&p.type===(type||'k'))?.square;
  if(!square)throw new Error('That piece is no longer on the board.');return {kind:'talk',square};
 }
 if(squares.length>=2){const p=chess.get(squares[0]);if(type&&p?.type!==type)throw new Error(`There is no ${name} on ${squares[0]}.`);return {kind:'move',from:squares[0],to:squares[1],promotion:/\bknight\b/.test(s)&&/promot/.test(s)?'n':'q'};}
 const moves=chess.moves({verbose:true});if(type&&squares.length===1){const candidates=moves.filter(m=>m.color===color&&m.piece===type&&m.to===squares[0]);if(candidates.length===1)return {kind:'move',from:candidates[0].from,to:candidates[0].to,promotion:'q'};if(candidates.length>1)throw new Error('Which piece? Include its starting square, for example “rook a1 to a4”.');throw new Error('Your piece cannot legally reach that square this turn.');}
 const raw=String(text).trim().replace(/^(move|play)\s+/i,'');const candidate=moves.find(m=>m.san.toLowerCase()===raw.toLowerCase());if(candidate)return {kind:'move',from:candidate.from,to:candidate.to,promotion:candidate.promotion||'q'};
 throw new Error('Try “pawn e2 to e4”, “knight to f3”, “e4”, or “king speak”.');
}
export function mountChess(app,server,{db,auth,userFor,publicOrigin=null,WebSocketServer}){
 db.exec(`CREATE TABLE IF NOT EXISTS chess_matches(id TEXT PRIMARY KEY,white_id TEXT NOT NULL,black_id TEXT,pgn TEXT NOT NULL DEFAULT '',revision INTEGER NOT NULL DEFAULT 0,log TEXT NOT NULL DEFAULT '[]',appearance TEXT NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL);`);
 const botId='forge-computer';const timers=new Map();
 const rooms=new Map();const defaultAppearance={theme:'moonstone',battle:true,voices:true};
 const get=id=>db.prepare('SELECT * FROM chess_matches WHERE id=?').get(id);
 const seat=(row,id)=>row.white_id===id?'w':row.black_id===id?'b':null;
 function state(row){const c=loadGame(row);const getUser=id=>{if(id===botId)return {id:botId,name:'Obsidian Automaton'};const u=db.prepare('SELECT id,name FROM users WHERE id=?').get(id||'');return u||null;};let status=!row.black_id?'waiting':c.isCheckmate()?'checkmate':c.isStalemate()?'stalemate':c.isThreefoldRepetition()?'repetition':c.isInsufficientMaterial()?'insufficient':c.isDraw()?'draw':c.isCheck()?'check':'playing';const clients=[...(rooms.get(row.id)||[])];return {id:row.id,fen:c.fen(),board:c.board().flat().filter(Boolean),turn:c.turn(),revision:row.revision,white:getUser(row.white_id),black:getUser(row.black_id),mode:row.black_id===botId?'computer':'friend',online:{w:clients.some(s=>s.uid===row.white_id),b:row.black_id===botId||clients.some(s=>s.uid===row.black_id)},status,gameOver:c.isGameOver(),winner:c.isCheckmate()?(c.turn()==='w'?'b':'w'):null,legalMoves:c.moves({verbose:true}).map(m=>({from:m.from,to:m.to,san:m.san,promotion:m.promotion})),history:c.history(),log:JSON.parse(row.log),appearance:JSON.parse(row.appearance)};}
 const emit=(id,msg)=>{for(const ws of rooms.get(id)||[])if(ws.readyState===1)ws.send(JSON.stringify(msg));};
 const emitState=id=>{const row=get(id);if(row)emit(id,{type:'chess-state',state:state(row)});};
 const append=(row,event)=>{const log=JSON.parse(row.log);log.push(event);return JSON.stringify(log.slice(-80));};
 function scheduleComputer(id){
  const row=get(id);if(!row||row.black_id!==botId||timers.has(id))return;
  const game=loadGame(row);if(game.turn()!=='b'||game.isGameOver())return;
  const previous=[...JSON.parse(row.log)].reverse().find(e=>e.kind==='move');
  const delay=JSON.parse(row.appearance).battle&&previous?Math.max(450,previous.at+(previous.captured?2300:1050)-Date.now()):450;
  timers.set(id,setTimeout(()=>{timers.delete(id);const current=get(id),c=loadGame(current);if(c.turn()!=='b'||c.isGameOver())return;
   const choice=chooseComputerMove(c);if(!choice)return;const move=c.move(choice);
   const event={id:randomUUID(),kind:'move',at:Date.now(),from:move.from,to:move.to,piece:move.piece,color:'b',captured:move.captured||null,flags:move.flags,san:move.san,text:move.captured?'Your defenses crumble, commander.':'My next move is ready.',master:'Obsidian Automaton',revision:current.revision+1};
   db.prepare('UPDATE chess_matches SET pgn=?,revision=revision+1,log=?,updated=? WHERE id=? AND revision=?').run(c.pgn(),append(current,event),Date.now(),id,current.revision);
   emit(id,{type:'chess-event',event});emitState(id);
  },delay));
 }
 server.on('close',()=>{for(const timer of timers.values())clearTimeout(timer);});
 app.post('/api/chess',auth,(req,res)=>{const id=randomUUID();const computer=req.body.mode==='computer';db.prepare('INSERT INTO chess_matches(id,white_id,black_id,appearance,created,updated) VALUES(?,?,?,?,?,?)').run(id,req.user.id,computer?botId:null,JSON.stringify(defaultAppearance),Date.now(),Date.now());res.status(201).json(state(get(id)));});
 app.get('/api/chess',auth,(req,res)=>res.json(db.prepare('SELECT * FROM chess_matches WHERE white_id=? OR black_id=? ORDER BY updated DESC LIMIT 20').all(req.user.id,req.user.id).map(state)));
 app.get('/api/chess/:id',auth,(req,res)=>{const row=get(req.params.id);if(!row)return res.status(404).json({error:'This battle could not be found.'});res.json(state(row));});
 app.post('/api/chess/:id/join',auth,(req,res)=>{const row=get(req.params.id);if(!row)return res.status(404).json({error:'This battle could not be found.'});if(!seat(row,req.user.id)&&!row.black_id)db.prepare('UPDATE chess_matches SET black_id=?,updated=? WHERE id=? AND black_id IS NULL').run(req.user.id,Date.now(),row.id);emitState(row.id);res.json(state(get(row.id)));});
 app.put('/api/chess/:id/appearance',auth,(req,res)=>{const row=get(req.params.id);if(!row||row.white_id!==req.user.id)return res.status(403).json({error:'Only the host can change the arena.'});const a={...JSON.parse(row.appearance)};if(['moonstone','ember','frost'].includes(req.body.theme))a.theme=req.body.theme;if(typeof req.body.battle==='boolean')a.battle=req.body.battle;db.prepare('UPDATE chess_matches SET appearance=?,updated=? WHERE id=?').run(JSON.stringify(a),Date.now(),row.id);emitState(row.id);res.json(state(get(row.id)));});
 const wss=new WebSocketServer({noServer:true,maxPayload:2048});
 server.on('upgrade',(req,socket,head)=>{
  const url=new URL(req.url,'http://localhost');if(url.pathname!=='/chess-ws')return;
  const origin=req.headers.origin;if(origin&&origin!==`http://${req.headers.host}`&&origin!==`https://${req.headers.host}`&&origin!==publicOrigin){socket.destroy();return;}
  const u=userFor(req),row=get(url.searchParams.get('match'));if(!u||!row){socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');socket.destroy();return;}
  if((rooms.get(row.id)?.size||0)>=16){socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>{ws.uid=u.id;ws.lastAction=0;ws.sessionReq=req;if(!rooms.has(row.id))rooms.set(row.id,new Set());rooms.get(row.id).add(ws);emitState(row.id);scheduleComputer(row.id);
   ws.on('message',raw=>{try{
    if(!userFor(req)){ws.close(1008,'Sign in again');return;}
    if(Date.now()-ws.lastAction<120)return;ws.lastAction=Date.now();const m=JSON.parse(raw),current=get(row.id),color=seat(current,u.id);if(!color)throw new Error('Spectators cannot command either army.');
    const c=loadGame(current);let action=m;
    if(m.type==='command'){if(typeof m.text!=='string'||m.text.length>180)throw new Error('Keep commands under 180 characters.');action=parseArmyCommand(c,color,m.text);}
    if(action.type==='talk'||action.kind==='talk'){
     const p=c.get(action.square);if(!p||p.color!==color)throw new Error('Only your own pieces will answer your command.');const lines=talkLines[p.type];const text=lines[Math.floor(Math.random()*lines.length)];const event={id:randomUUID(),kind:'talk',at:Date.now(),piece:p.type,color,square:p.square,text,master:u.name};db.prepare('UPDATE chess_matches SET log=?,updated=? WHERE id=?').run(append(current,event),Date.now(),current.id);emit(current.id,{type:'chess-event',event});emitState(current.id);return;
    }
    if(action.type!=='move'&&action.kind!=='move')throw new Error('Unknown command.');
    if(!current.black_id)throw new Error('Invite an opponent before making your first move.');
    if(c.isGameOver())throw new Error('This battle has ended. Create a new match.');
    if(c.turn()!==color)throw new Error('Your army awaits its turn. You cannot move the other player’s pieces.');
    if(m.revision!==current.revision)throw new Error('The board changed. Try your move on the latest position.');
    const previousMove=[...JSON.parse(current.log)].reverse().find(e=>e.kind==='move');if(JSON.parse(current.appearance).battle&&previousMove&&Date.now()<previousMove.at+(previousMove.captured?2250:1000))throw new Error('Let the pieces finish their battle before the next move.');
    const piece=c.get(action.from);if(!piece||piece.color!==color)throw new Error('You can command only your own army.');
    let move;try{move=c.move({from:action.from,to:action.to,promotion:['q','r','b','n'].includes(action.promotion)?action.promotion:'q'});}catch{throw new Error('That move is not legal.');}
    if(!move)throw new Error('That move is not legal.');
    const text=move.captured?`${PIECE_NAMES[move.piece]}: ${['For my commander. Stand aside!','Your watch ends here.','Stone breaks. Loyalty does not.'][Math.floor(Math.random()*3)]}`:`${PIECE_NAMES[move.piece]}: ${['As you command.','I march at your word.','Your will, my path.'][Math.floor(Math.random()*3)]}`;
    const event={id:randomUUID(),kind:'move',at:Date.now(),from:move.from,to:move.to,piece:move.piece,color,captured:move.captured||null,flags:move.flags,san:move.san,text,master:u.name,revision:current.revision+1};
    db.prepare('UPDATE chess_matches SET pgn=?,revision=revision+1,log=?,updated=? WHERE id=? AND revision=?').run(c.pgn(),append(current,event),Date.now(),current.id,current.revision);
    emit(current.id,{type:'chess-event',event});emitState(current.id);scheduleComputer(current.id);
   }catch(e){ws.send(JSON.stringify({type:'chess-error',message:e.message||'Unable to follow that command.'}));}});
   ws.on('close',()=>{rooms.get(row.id)?.delete(ws);if(!rooms.get(row.id)?.size)rooms.delete(row.id);else emitState(row.id);});
  });
 });
 return {state,get};
}
