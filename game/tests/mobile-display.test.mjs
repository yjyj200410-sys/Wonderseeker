import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../dist/mobile-display.js',import.meta.url),'utf8');
function setup({supported=true,reject=false,installed=false}={}){
 const handlers={},listeners={},toast={textContent:'',classList:{add(){},remove(){}}};
 const button={textContent:'',setAttribute(k,v){this[k]=v},addEventListener(k,v){handlers[k]=v}};
 const root={classList:{toggle(){}}};
 const doc={documentElement:root,fullscreenElement:null,createElement:()=>button,body:{append(){}},getElementById:()=>toast,addEventListener(k,v){listeners[k]=v}};
 if(supported)root.requestFullscreen=async()=>{if(reject)throw Error('denied');doc.fullscreenElement=root};
 doc.exitFullscreen=async()=>{doc.fullscreenElement=null};
 vm.runInNewContext(source,{document:doc,navigator:{},matchMedia:q=>({matches:q.includes('display-mode')?installed:true}),setTimeout:()=>1,clearTimeout(){},Element:class{}});
 return {button,doc,toast,click:handlers.click};
}
test('fullscreen control enters and exits with synchronized accessible state',async()=>{
 const s=setup();await s.click();assert.equal(s.doc.fullscreenElement,s.doc.documentElement);assert.equal(s.button['aria-pressed'],'true');assert.equal(s.button.hidden,true);
 await s.click();assert.equal(s.doc.fullscreenElement,null);assert.equal(s.button['aria-pressed'],'false');
});
test('unsupported and denied fullscreen keep the game usable and explain the fallback',async()=>{
 for(const options of [{supported:false},{reject:true}]){const s=setup(options);await s.click();assert.equal(s.doc.fullscreenElement,null);assert.ok(s.toast.textContent.length>0);assert.equal(s.button['aria-pressed'],'false');}
 assert.equal(setup({installed:true}).button.hidden,true);
});
