#!/usr/bin/env node
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,existsSync,openSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const [action,dirArg='output/playwright/verify-waystroke',portArg='4173']=process.argv.slice(2);
const root=process.cwd(),dir=resolve(dirArg),stateFile=resolve(dir,'instance.json');
const hash=()=>createHash('sha256').update(readFileSync('dist/waystroke-studio/browser/index.html')).digest('hex');
async function doctor(s){
 process.kill(s.pid,0);
 const cmd=readFileSync(`/proc/${s.pid}/cmdline`,'utf8');
 if(!cmd.includes(resolve('server.js')) || readFileSync(`/proc/${s.pid}/stat`,'utf8').split(' ')[21]!==s.started)throw Error('PID identity mismatch');
 const r=await fetch(s.url),body=await r.text();
 if(r.status!==200 || createHash('sha256').update(body).digest('hex')!==s.hash || !body.includes('hero-title') || !body.includes('ngh='))throw Error('Wrong build or unusable prerender');
 if(hash()!==s.hash)throw Error('Build changed while instance is running');
 return {status:'PASS',...s};
}
if(action==='launch'){
 mkdirSync(dir,{recursive:true});
 if(existsSync(stateFile)){const prior=JSON.parse(readFileSync(stateFile));if(!prior.cleaned)throw Error('Instance state exists: doctor or cleanup first');}
 const port=Number(portArg);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid port');
 const net=await import('node:net');await new Promise((ok,no)=>{const s=net.createServer();s.once('error',no);s.listen(port,'0.0.0.0',()=>s.close(ok));});
 const log=openSync(resolve(dir,'server.log'),'a');
 const child=spawn(process.execPath,[resolve('server.js')],{cwd:root,env:{...process.env,PORT:String(port)},detached:true,stdio:['ignore',log,log]});child.unref();
 const s={pid:child.pid,started:readFileSync(`/proc/${child.pid}/stat`,'utf8').split(' ')[21],url:`http://127.0.0.1:${port}/`,root,hash:hash()};
 writeFileSync(stateFile,JSON.stringify(s,null,2));
 try{let result;for(let i=0;i<40;i++){try{result=await doctor(s);break;}catch{await new Promise(r=>setTimeout(r,250));}}if(!result)throw Error('Launch readiness failed');console.log(JSON.stringify(result));}catch(e){process.kill(s.pid,'SIGTERM');writeFileSync(stateFile,JSON.stringify({...s,cleaned:true}));throw e;}
}else if(action==='doctor') console.log(JSON.stringify(await doctor(JSON.parse(readFileSync(stateFile)))));
else if(action==='cleanup'){
 const s=JSON.parse(readFileSync(stateFile));
 if(!s.cleaned){try{const cmd=readFileSync(`/proc/${s.pid}/cmdline`,'utf8');const started=readFileSync(`/proc/${s.pid}/stat`,'utf8').split(' ')[21];if(cmd.includes(resolve('server.js'))&&started===s.started)process.kill(s.pid,'SIGTERM');else throw Error('Refusing to kill reused PID');}catch(e){if(e.code!=='ENOENT'&&e.code!=='ESRCH')throw e;}writeFileSync(stateFile,JSON.stringify({...s,cleaned:true},null,2));}
 console.log('Cleanup complete; evidence preserved in '+dir);
}else throw Error('Usage: lifecycle.mjs launch|doctor|cleanup [evidence-dir] [port]');
