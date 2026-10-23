// Small deterministic chess engine. No network requests or model credentials.
const values={p:100,n:320,b:330,r:500,q:900,k:0};
function score(game){if(game.isCheckmate())return game.turn()==='w'?100000:-100000;if(game.isDraw())return 0;return game.board().flat().filter(Boolean).reduce((sum,p)=>sum+(p.color==='b'?1:-1)*(values[p.type]+(p.type==='p'?(p.color==='b'?7-Number(p.square[1]):Number(p.square[1])-2)*7:0)),0);}
export function chooseComputerMove(game){
 let best=null,bestScore=-Infinity;
 for(const move of game.moves({verbose:true})){
  game.move(move);let worst=Infinity;
  if(game.isGameOver())worst=score(game);
  else for(const reply of game.moves({verbose:true})){game.move(reply);worst=Math.min(worst,score(game));game.undo();}
  game.undo();if(worst>bestScore){bestScore=worst;best={from:move.from,to:move.to,promotion:move.promotion};}
 }
 return best;
}
