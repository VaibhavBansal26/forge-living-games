import React,{useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const palettes={moonstone:{bg:'#182032',light:'#c9c5b5',dark:'#4d5268',trim:'#bda574',white:'#e4d6b8',black:'#5b5473',glow:'#a8baed'},ember:{bg:'#281b23',light:'#d2b89a',dark:'#6f4441',trim:'#ca925e',white:'#eed6ac',black:'#813d46',glow:'#edb18b'},frost:{bg:'#152936',light:'#d2e7e5',dark:'#3c6578',trim:'#9bb7bf',white:'#dcf0ea',black:'#3a6c8c',glow:'#9ae8e5'}};
const squarePos=s=>new THREE.Vector3(s.charCodeAt(0)-97-3.5,.18,3.5-(Number(s[1])-1));
function material(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:.45,metalness:.18,...extra});}
function add(g,geo,color,x,y,z,extra={}){const m=new THREE.Mesh(geo,material(color,extra));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
function box(g,w,h,d,c,x=0,y=0,z=0){return add(g,new THREE.BoxGeometry(w,h,d),c,x,y,z);}
function cyl(g,t,b,h,c,x=0,y=0,z=0,n=12){return add(g,new THREE.CylinderGeometry(t,b,h,n),c,x,y,z);}
function sphere(g,r,c,x,y,z){return add(g,new THREE.SphereGeometry(r,12,10),c,x,y,z);}
function character(type,color,pal){
 const g=new THREE.Group(),c=color==='w'?pal.white:pal.black,gold=color==='w'?'#c0a064':'#a894c7',face=color==='w'?'#eadbc1':'#8d83a0',height={p:.8,r:1.1,n:1.05,b:1.2,q:1.35,k:1.45}[type];
 cyl(g,.33,.38,.12,gold,0,.06,0);cyl(g,.29,.33,.1,c,0,.16,0);
 if(type==='r'){
  box(g,.46,.65,.46,c,0,.54,0);box(g,.63,.12,.63,gold,0,.91,0);for(const [x,z] of [[-.23,-.23],[-.23,.23],[.23,-.23],[.23,.23]])box(g,.17,.22,.17,c,x,1.06,z);
  for(const x of [-.36,.36]){const arm=box(g,.17,.49,.2,c,x,.56,0);arm.name=x>0?'rightArm':'leftArm';}for(const x of [-.1,.1])sphere(g,.035,'#d8c9f3',x,.68,.245);box(g,.16,.14,.03,'#282538',0,.42,.25);
 }else if(type==='n'){
  cyl(g,.21,.28,.38,c,0,.4,0);const neck=box(g,.28,.45,.32,c,0,.74,0);neck.rotation.x=-.22;const head=box(g,.29,.27,.47,c,0,1,.12);for(const x of [-.09,.09])add(g,new THREE.ConeGeometry(.055,.2,4),gold,x,1.22,-.02);for(const x of [-.16,.16])sphere(g,.035,'#e1d2a6',x,1.06,.2);box(g,.12,.42,.08,gold,0,.83,-.19);
 }else{
  cyl(g,type==='p'?.17:.2,.28,height*.45,c,0,.3+height*.12,0);for(const x of [-.095,.095])box(g,.12,.22,.15,c,x,.26,.03);
  const headY=height*.73;sphere(g,type==='p'?.13:.15,face,0,headY,0);for(const x of [-.053,.053])sphere(g,.018,'#30303b',x,headY+.015,.125);
  for(const x of [-.25,.25]){const arm=cyl(g,.055,.06,height*.33,c,x,height*.45,0);arm.rotation.z=x>0?-.14:.14;arm.name=x>0?'rightArm':'leftArm';sphere(g,.055,face,x,height*.32,.03);}
  if(type==='p'){add(g,new THREE.ConeGeometry(.16,.18,8),gold,0,headY+.15,0);box(g,.04,.37,.06,'#b6c8cf',.31,.48,.1);box(g,.17,.035,.06,gold,.31,.3,.1);const shield=box(g,.2,.27,.055,gold,-.3,.45,.15);shield.rotation.z=.1;}
  if(type==='b'){add(g,new THREE.ConeGeometry(.17,.4,8),c,0,headY+.26,0);cyl(g,.2,.2,.035,gold,0,headY+.085,0);box(g,.035,.84,.035,gold,.32,.6,0);sphere(g,.07,pal.glow,.32,1.04,0);}
  if(type==='k'||type==='q'){cyl(g,.17,.17,.12,gold,0,headY+.17,0);for(let i=0;i<(type==='k'?5:7);i++){const a=i*Math.PI*2/(type==='k'?5:7);add(g,new THREE.ConeGeometry(.045,.15,5),gold,Math.sin(a)*.14,headY+.29,Math.cos(a)*.14);}if(type==='k'){box(g,.04,.18,.04,gold,0,height+.02,0);box(g,.13,.04,.04,gold,0,height+.05,0);}else{box(g,.035,.95,.035,gold,.32,.62,.02);sphere(g,.085,pal.glow,.32,1.12,.02);}}
 }
 g.userData={piece:type,color};return g;
}
function dispose(g){g.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose?.();});}
export function BattleBoard({state,seat,selected,legal,onSquare,event}){
 const host=useRef(),eng=useRef(),latest=useRef({});latest.current={state,seat,selected,legal,onSquare,event};
 useEffect(()=>{
  const el=host.current;el.dataset.animation='idle';let r;try{r=new THREE.WebGLRenderer({antialias:true});}catch{el.textContent='Switch to Tactical view if WebGL is unavailable.';return;}
  r.setPixelRatio(Math.min(devicePixelRatio,2));r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFShadowMap;r.outputColorSpace=THREE.SRGBColorSpace;el.append(r.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.1,100);camera.position.set(7.6,10.8,10.8);const controls=new OrbitControls(camera,r.domElement);controls.target.set(0,.1,0);controls.enableDamping=true;controls.minDistance=7;controls.maxDistance=24;controls.maxPolarAngle=Math.PI/2.5;controls.enablePan=false;
  const ambient=new THREE.HemisphereLight('#e5e8ff','#443451',2.2);scene.add(ambient);const sun=new THREE.DirectionalLight('#ffe3b8',3.5);sun.position.set(-4,12,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-7,right:7,top:7,bottom:-7});sun.shadow.bias=-.001;scene.add(sun);const rim=new THREE.DirectionalLight('#b6b6ff',2);rim.position.set(5,6,-8);scene.add(rim);
  const arena=new THREE.Group(),pieces=new THREE.Group(),markers=new THREE.Group(),debris=new THREE.Group();scene.add(arena,pieces,markers,debris);const e={scene,camera,controls,r,arena,pieces,markers,debris,map:new Map(),lastRevision:-1,lastEvent:null,animation:null,theme:null,seat:null};eng.current=e;
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null,frame;
  const pd=ev=>down={x:ev.clientX,y:ev.clientY};const pu=ev=>{if(!down||Math.hypot(ev.clientX-down.x,ev.clientY-down.y)>5)return;const rect=el.getBoundingClientRect();pointer.set((ev.clientX-rect.left)/rect.width*2-1,-(ev.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);let obj=ray.intersectObjects([...pieces.children,...arena.children],true).find(h=>{let o=h.object;while(o){if(o.userData.square)return true;o=o.parent;}return false;})?.object;while(obj&&!obj.userData.square)obj=obj.parent;if(obj&&!e.animation)latest.current.onSquare(obj.userData.square);down=null;};r.domElement.addEventListener('pointerdown',pd);r.domElement.addEventListener('pointerup',pu);
  const resize=new ResizeObserver(()=>{const rect=el.getBoundingClientRect();r.setSize(rect.width,rect.height);camera.aspect=rect.width/rect.height;camera.zoom=Math.min(1,Math.max(.62,camera.aspect/1.05));camera.updateProjectionMatrix();});resize.observe(el);
  function rebuild(){for(const o of [...pieces.children]){pieces.remove(o);dispose(o);}e.map.clear();const pal=palettes[latest.current.state.appearance.theme]||palettes.moonstone;for(const p of latest.current.state.board){const g=character(p.type,p.color,pal);g.position.copy(squarePos(p.square));g.rotation.y=p.color==='b'?Math.PI:0;g.userData.square=p.square;pieces.add(g);e.map.set(p.square,g);}e.lastRevision=latest.current.state.revision;}
  e.rebuild=rebuild;
  function shatter(victim,pal){victim.updateWorldMatrix(true,true);const pos=victim.position.clone();for(const child of victim.children){if(!child.isMesh)continue;const clone=new THREE.Mesh(child.geometry.clone(),child.material.clone());child.matrixWorld.decompose(clone.position,clone.quaternion,clone.scale);clone.userData.velocity=new THREE.Vector3((Math.random()-.5)*3,1+Math.random()*2,(Math.random()-.5)*3);clone.userData.spin=new THREE.Vector3(Math.random()*3,Math.random()*3,Math.random()*3);debris.add(clone);}for(let i=0;i<14;i++){const m=box(debris,.06+Math.random()*.1,.1,.1,pal,pos.x,pos.y+.4,pos.z);m.userData.velocity=new THREE.Vector3((Math.random()-.5)*4,Math.random()*3,(Math.random()-.5)*4);m.userData.spin=new THREE.Vector3(3,2,4);}victim.visible=false;}
  let last=0;
  function tick(t){frame=requestAnimationFrame(tick);const dt=Math.min((t-last)/1000,.04);last=t;controls.update();const a=e.animation;
   if(a){const age=(t-a.start)/1000;el.dataset.animation=age<.85?'marching':age<1.25&&a.victim?'attacking':a.victim?'shattering':'arriving';const walk=Math.min(age/.85,1);if(a.attacker){a.attacker.position.lerpVectors(a.from,a.to,walk);a.attacker.position.y=.18+Math.abs(Math.sin(walk*Math.PI*6))*.075*(walk<1?1:0);for(const m of a.attacker.children)if(m.name==='rightArm'||m.name==='leftArm')m.rotation.x=Math.sin(walk*Math.PI*8)*.3;}
    if(a.rook)a.rook.position.lerpVectors(a.rookFrom,a.rookTo,walk);
    if(a.victim&&age>.85){if(age<1.25){a.victim.rotation.z=Math.sin(age*55)*.12;if(a.attacker)a.attacker.rotation.x=Math.sin((age-.85)/.4*Math.PI)*.3;}else if(!a.shattered){shatter(a.victim,a.color);a.shattered=true;}}
    for(const d of debris.children){d.position.addScaledVector(d.userData.velocity,dt);d.userData.velocity.y-=7*dt;d.rotation.x+=d.userData.spin.x*dt;d.rotation.z+=d.userData.spin.z*dt;if(d.position.y<.25){d.position.y=.25;d.userData.velocity.multiplyScalar(.7);d.userData.velocity.y=Math.abs(d.userData.velocity.y)*.2;}d.material.transparent=true;d.material.opacity=Math.max(0,1-(age-1.35)/.9);}
    if(age>(a.victim?2.2:.95)){for(const d of [...debris.children]){debris.remove(d);dispose(d);}e.animation=null;el.dataset.animation='idle';rebuild();}
   }else if(e.lastRevision!==latest.current.state.revision)rebuild();r.render(scene,camera);
  }frame=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(frame);resize.disconnect();controls.dispose();dispose(scene);r.dispose();r.forceContextLoss();r.domElement.remove();eng.current=null;};
 },[]);
 useEffect(()=>{const e=eng.current;if(!e)return;const pal=palettes[state.appearance.theme]||palettes.moonstone;if(e.theme!==state.appearance.theme){e.theme=state.appearance.theme;e.scene.background=new THREE.Color(pal.bg);e.scene.fog=new THREE.Fog(pal.bg,18,44);for(const o of [...e.arena.children]){e.arena.remove(o);dispose(o);}box(e.arena,9.1,.36,9.1,pal.trim,0,-.1,0);box(e.arena,8.75,.1,8.75,'#282634',0,.1,0);for(let rank=0;rank<8;rank++)for(let file=0;file<8;file++){const square=String.fromCharCode(97+file)+(rank+1),p=squarePos(square);const tile=box(e.arena,.98,.12,.98,(rank+file)%2===0?pal.dark:pal.light,p.x,.16,p.z);tile.userData.square=square;}const floor=add(e.arena,new THREE.CylinderGeometry(14,14,.3,64),'#262635',0,-.55,0);for(const x of [-5.5,5.5])for(const z of [-5.5,5.5]){cyl(e.arena,.3,.43,1.4,'#535064',x,.1,z);cyl(e.arena,.45,.3,.2,pal.trim,x,.85,z);const orb=sphere(e.arena,.14,pal.glow,x,1.1,z);orb.material.emissive=new THREE.Color(pal.glow);orb.material.emissiveIntensity=2;const light=new THREE.PointLight(pal.glow,8,6);light.position.set(x,1.2,z);e.arena.add(light);}e.lastRevision=-1;}
 if(e.seat!==seat){e.seat=seat;e.camera.position.set(seat==='b'?-7.6:7.6,10.8,seat==='b'?-10.8:10.8);}
 if(event?.kind==='move'&&event.id!==e.lastEvent){e.lastEvent=event.id;const attacker=e.map.get(event.from);if(attacker&&state.appearance.battle){if(e.animation){for(const d of [...e.debris.children]){e.debris.remove(d);dispose(d);}e.animation=null;e.rebuild();}const victimSquare=event.flags?.includes('e')?event.to[0]+event.from[1]:event.to;const victim=event.captured?e.map.get(victimSquare):null;const castle=event.flags?.includes('k')?'king':event.flags?.includes('q')?'queen':null;const rookFrom=castle?(castle==='king'?'h':'a')+event.from[1]:null;const rookTo=castle?(castle==='king'?'f':'d')+event.from[1]:null;e.animation={start:performance.now(),attacker,victim,from:squarePos(event.from),to:squarePos(event.to),color:event.color==='w'?pal.white:pal.black,rook:rookFrom?e.map.get(rookFrom):null,rookFrom:rookFrom?squarePos(rookFrom):null,rookTo:rookTo?squarePos(rookTo):null};}}
 if(!e.animation&&e.lastRevision!==state.revision)e.rebuild();
 },[state.revision,state.appearance.theme,state.appearance.battle,seat,event?.id]);
 useEffect(()=>{const e=eng.current;if(!e)return;for(const o of [...e.markers.children]){e.markers.remove(o);dispose(o);}const put=(s,color,r)=>{const p=squarePos(s);const m=add(e.markers,new THREE.RingGeometry(r-.035,r,48),color,p.x,.24,p.z,{emissive:color,emissiveIntensity:.6,side:THREE.DoubleSide});m.rotation.x=-Math.PI/2;};if(selected)put(selected,'#f3ce81',.44);for(const s of legal||[])put(s,'#a3d9bc',.19);},[selected,(legal||[]).join(',')]);
 return <div className="battle-board" ref={host} aria-label="3D wizard chess board. Select your piece, then a highlighted destination."/>;
}
