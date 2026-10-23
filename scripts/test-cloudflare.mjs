import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const directory=mkdtempSync(join(tmpdir(),'forge-cloudflare-'));
const port=process.env.FORGE_EDGE_TEST_PORT||'4180';let output='';
const worker=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--local','--port',port,'--persist-to',directory,'--show-interactive-dev-session=false'],{env:{...process.env,WRANGLER_SEND_METRICS:'false'},stdio:['ignore','pipe','pipe']});
worker.stdout.on('data',d=>output+=d);worker.stderr.on('data',d=>output+=d);
try{
 let ready=false;for(let i=0;i<100;i++){if(worker.exitCode!==null)throw Error('Emulator failed: '+output);try{ready=(await fetch(`http://localhost:${port}/api/health`)).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,300));}
 if(!ready)throw Error('Cloudflare emulator was not ready: '+output);
 console.log('Testing the Cloudflare runtime with an isolated temporary database.');
 const tests=spawn(process.execPath,['--test','--test-concurrency=1','tests/core.test.mjs','tests/chess.test.mjs'],{env:{...process.env,FORGE_TEST_PORT:port,FORGE_TEST_EXTERNAL:'1'},stdio:'inherit'});
 const code=await new Promise(resolve=>tests.on('exit',resolve));process.exitCode=code??1;
}finally{
 worker.kill('SIGINT');if(worker.exitCode===null)await new Promise(resolve=>worker.once('exit',resolve));rmSync(directory,{recursive:true,force:true});
}
