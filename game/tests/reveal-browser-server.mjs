// Isolated in-memory browser QA. Never reads or writes a player's saved game.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fresh,openBox,validate} from '../dist/engine.js';
import {makeItems} from '../dist/content.js';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const economy=JSON.parse(await readFile(path.join(root,'economy.json'),'utf8'));
const items=makeItems(economy);
let fixture=openBox(fresh(economy),economy,items,1,Date.now(),()=>0);
const examples=[6,7,8].map(grade=>Object.values(items).find(i=>i.grade===grade));
fixture.pending.drops=examples.map((item,i)=>({...fixture.pending.drops[0],key:`qa-${i}`,id:item.id,price:item.price}));
for(const item of examples)fixture.seen[item.id]={...(fixture.seen[item.id]||{}),count:1,firstAt:Date.now()};
fixture.settings.sound=false;
validate(fixture,economy,items);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.wav':'audio/wav'};
http.createServer(async(req,res)=>{
 try{
  const name=new URL(req.url,'http://localhost').pathname;
  if(name==='/sw.js'){res.writeHead(404);res.end();return;}
  if(name==='/storage.js'){
   res.writeHead(200,{'Content-Type':'text/javascript'});
   return res.end(`let save=${JSON.stringify(fixture)};export async function connect(){return null}export async function read(){return structuredClone(save)}export async function write(db,state){save=structuredClone(state)}`);
  }
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':decodeURIComponent(name)));
  if(!file.startsWith(root))throw Error('outside root');
  let body=await readFile(file);
  if(name==='/app.js')body=body.toString().replace('let enteredGame = false','let enteredGame = true').replace('rewardIndex=-1,overviewUntil','rewardIndex=0,overviewUntil');
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
 }catch{res.writeHead(404);res.end();}
}).listen(Number(process.argv[2]||4175),'127.0.0.1',()=>console.log('Isolated reveal QA ready')); 
