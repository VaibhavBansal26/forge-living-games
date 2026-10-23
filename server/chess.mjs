import {WebSocketServer} from 'ws';
import {mountChess as mount} from './chess-core.mjs';
export {parseArmyCommand} from './chess-core.mjs';
export function mountChess(app,server,options){return mount(app,server,{...options,WebSocketServer});}
