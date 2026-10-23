import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {THEMES} from '../shared/world.js';

const thumbnailCache=new Map();
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...extra});
function mesh(g,geometry,color,x=0,y=0,z=0,extra={}){const m=new THREE.Mesh(geometry,mat(color,extra));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
function box(g,w,h,d,c,x=0,y=0,z=0){return mesh(g,new THREE.BoxGeometry(w,h,d),c,x,y,z);}
function ball(g,r,c,x,y,z,detail=1){return mesh(g,new THREE.IcosahedronGeometry(r,detail),c,x,y,z);}
function cylinder(g,rt,rb,h,c,x=0,y=0,z=0,n=8){return mesh(g,new THREE.CylinderGeometry(rt,rb,h,n),c,x,y,z);}
export function makeObject(type,color){
 const g=new THREE.Group();const green=color||'#76935c',wood='#815e40';
 switch(type){
 case 'tree':cylinder(g,.13,.22,1.5,wood,0,.75,0);ball(g,1.05,green,0,2,0);ball(g,.7,'#8fa66b',.6,2.2,.2);ball(g,.72,green,-.55,1.8,.2);break;
 case 'pine':cylinder(g,.13,.2,1.2,wood,0,.6,0);for(let i=0;i<3;i++)mesh(g,new THREE.ConeGeometry(1-i*.2,1.6,7),color||['#3b6c5b','#4d8065','#69936c'][i],0,1.3+i*.65,0);break;
 case 'cottage':box(g,2.5,1.8,2.1,color||'#d7c5a0',0,.9,0);const roofShape=new THREE.Shape();roofShape.moveTo(-1.5,0);roofShape.lineTo(0,1.15);roofShape.lineTo(1.5,0);roofShape.closePath();const roof=mesh(g,new THREE.ExtrudeGeometry(roofShape,{depth:2.6,bevelEnabled:false}), '#405b79',0,1.8,-1.3);for(const x of [-1.19,1.19])box(g,.12,1.8,2.12,'#8d7758',x,.9,0);box(g,2.55,.1,2.14,'#9d8766',0,1.7,0);box(g,.55,.95,.12,wood,.35,.48,1.1);for(const x of [-.8,.9]){box(g,.4,.45,.12,'#ffe4a0',x,1.05,1.12);box(g,.045,.45,.15,wood,x,1.05,1.13);}box(g,.4,1.15,.4,'#9b9483',.7,2.5,-.45);box(g,2.8,.12,2.4,'#a19e87',0,.06,0);break;
 case 'bridge':box(g,2.1,.18,3.2,wood,0,.25,0);for(let i=0;i<8;i++)box(g,2.12,.04,.04,'#b49368',0,.36,-1.35+i*.4);for(const x of [-1,1]){for(const z of [-1.4,0,1.4])box(g,.12,.9,.12,wood,x,.7,z);box(g,.1,.12,3.2,'#ad8558',x,1.1,0);}break;
 case 'rock':const r=ball(g,.8,color||'#9b9d99',0,.45,0,0);r.scale.set(1.3,.8,1);ball(g,.4,'#b0b1a6',.6,.2,.4,0);break;
 case 'lantern':box(g,.14,2,.14,wood,0,1,0);box(g,.7,.1,.1,wood,.3,1.95,0);box(g,.36,.48,.36,color||'#ffd17b',.5,1.65,0);mesh(g,new THREE.ConeGeometry(.32,.25,4),'#43505a',.5,2,0);break;
 case 'door':for(const x of [-.9,.9])box(g,.35,2.7,.5,color||'#929997',x,1.35,0);box(g,2.1,.35,.5,'#aeb4a4',0,2.7,0);const magic=box(g,1.4,2.4,.08,'#80b8b0',0,1.2,0);magic.material.transparent=true;magic.material.opacity=.4;for(let i=0;i<5;i++)ball(g,.07,'#d1f2d0',-.5+i*.25,2.6,0,0);break;
 case 'coin':mesh(g,new THREE.OctahedronGeometry(.34),color||'#e9bd65',0,.8,0,{emissive:'#a56e20',emissiveIntensity:.35,metalness:.3});cylinder(g,.3,.35,.14,'#8b9980',0,.07,0);break;
 case 'fence':for(const x of [-1,0,1])box(g,.12,1,.12,wood,x,.5,0);for(const y of [.35,.8])box(g,2.2,.13,.12,'#a17a50',0,y,0);break;
 case 'bench':box(g,1.6,.14,.6,wood,0,.55,0);box(g,1.6,.55,.1,wood,0,.9,-.28);for(const x of [-.6,.6])box(g,.12,.55,.4,'#47565a',x,.27,0);break;
 case 'flower':cylinder(g,.7,.75,.1,'#697f4b',0,.05,0);for(let i=0;i<7;i++){const x=Math.sin(i*2.4)*.5,z=Math.cos(i*2.4)*.5;box(g,.035,.35,.035,'#689953',x,.2,z);ball(g,.13,color||['#ecd699','#d49ea7','#d5bcdf'][i%3],x,.4,z,0);}break;
 case 'spawn':cylinder(g,.6,.6,.035,'#99c9bb',0,.02,0);break;
 }
 return g;
}
export function makeAvatar(a={}){const g=new THREE.Group();const skin=a.skin||'#d4a17c';cylinder(g,.22,.28,.65,a.shirt||'#e59153',0,.85,0);ball(g,.25,skin,0,1.42,0);const hair=ball(g,.26,a.hair||'#3c2c24',0,1.53,-.03);hair.scale.y=.65;for(const x of [-.14,.14]){box(g,.18,.5,.2,a.pants||'#34465c',x,.28,0);box(g,.2,.12,.3,'#433a35',x,.06,.04);}for(const x of [-.35,.35])cylinder(g,.075,.07,.55,skin,x,.88,0);if(a.hat){cylinder(g,.37,.37,.05,'#aa8053',0,1.63,0);cylinder(g,.22,.27,.22,'#bd986a',0,1.76,0);}return g;}
function disposeGroup(g){g.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
export function AssetThumb({type}){
 const [src,setSrc]=useState(()=>thumbnailCache.get(type)||null);
 useEffect(()=>{if(thumbnailCache.has(type)){setSrc(thumbnailCache.get(type));return;}try{const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(35,1,.1,100),r=new THREE.WebGLRenderer({alpha:true,antialias:true});r.setSize(160,140);r.setPixelRatio(1);scene.add(new THREE.HemisphereLight('#ffffff','#9ca5b0',3));const sun=new THREE.DirectionalLight('#fff6de',3);sun.position.set(4,7,5);scene.add(sun);const o=makeObject(type);scene.add(o);const bounds=new THREE.Box3().setFromObject(o),c=bounds.getCenter(new THREE.Vector3()),s=bounds.getSize(new THREE.Vector3()).length();cam.position.set(c.x+s*.85,c.y+s*.55,c.z+s);cam.lookAt(c);r.render(scene,cam);const data=r.domElement.toDataURL();thumbnailCache.set(type,data);setSrc(data);disposeGroup(o);r.dispose();r.forceContextLoss();}catch{}},[type]);
 return src?<img src={src} alt="" draggable={false}/>:null;
}
export function WorldView({world,selected,onSelect,onChange,onAdd,playState,onMove,onInteract,avatar,avatarOnly=false,onCursor,editable=true}){
 const host=useRef(),engine=useRef(),latest=useRef({});latest.current={world,selected,onSelect,onChange,onAdd,playState,onMove,onInteract,avatar,onCursor,editable};
 useEffect(()=>{
 const el=host.current;if(!el)return;
 let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:avatarOnly});}catch{el.textContent='This browser needs WebGL to display the 3D world.';return;}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor('#cbd9e5',avatarOnly?0:1);el.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.1,160);camera.position.set(19,20,23);camera.lookAt(0,0,0);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.5,0);controls.enableDamping=true;controls.maxPolarAngle=Math.PI/2.1;controls.minDistance=avatarOnly?2:5;controls.maxDistance=avatarOnly?9:50;
 if(avatarOnly){camera.position.set(2.4,1.8,3.7);controls.target.set(0,1,0);controls.enablePan=false;}
 scene.add(new THREE.HemisphereLight('#f7f6e9','#687b80',2.8));const sun=new THREE.DirectionalLight('#fff0d5',3.8);sun.position.set(-8,18,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-17,right:17,top:17,bottom:-17});sun.shadow.bias=-.001;scene.add(sun);
 const ground=new THREE.Group(),objects=new THREE.Group(),players=new THREE.Group();scene.add(ground,objects,players);
 if(!avatarOnly){const island=cylinder(ground,13.7,12.6,1.8,'#8c8d7c',0,-1,12);island.rotation.y=.15;const top=cylinder(ground,13.8,13.8,.22,'#7b9d65',0,-.03,0,12);island.position.z=0;for(let i=0;i<18;i++){const a=i*2.399;const r=12.6;const b=ball(ground,1.2,'#8e9383',Math.sin(a)*r,-1.2,Math.cos(a)*r,0);b.scale.set(.9,1.8,.8);}box(ground,1.5,.04,22,'#7cbbc0',0,.13,0);for(let i=0;i<12;i++)box(ground,.8,.05,.65,'#c4bf9e',-4+i*.7,.15,2.8);const grid=new THREE.GridHelper(60,60,'#a9bdc8','#b8cad3');grid.position.y=-2;scene.add(grid);ground.userData.top=top;}
 const ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);let dragging=null,down=null,moved=false,lastMove=0,frame;
 function point(e){const rect=el.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);return ray.ray.intersectPlane(plane,new THREE.Vector3());}
 function hit(e){point(e);let obj=ray.intersectObjects(objects.children,true)[0]?.object;while(obj&&!obj.userData.objectId)obj=obj.parent;return obj;}
 const pointerDown=e=>{if(avatarOnly||e.button!==0)return;down={x:e.clientX,y:e.clientY};moved=false;if(latest.current.playState)return;const o=hit(e);if(o){latest.current.onSelect?.(o.userData.objectId);if(latest.current.editable){dragging=o;controls.enabled=false;renderer.domElement.setPointerCapture(e.pointerId);}}};
 const pointerMove=e=>{const l=latest.current;const rect=el.getBoundingClientRect();l.onCursor?.((e.clientX-rect.left)/rect.width,(e.clientY-rect.top)/rect.height);if(dragging){const p=point(e);if(p){moved=!!down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>4;if(moved){dragging.position.x=Math.max(-11,Math.min(11,Math.round(p.x*2)/2));dragging.position.z=Math.max(-11,Math.min(11,Math.round(p.z*2)/2));}}}};
 const pointerUp=e=>{if(dragging&&moved)latest.current.onChange?.(dragging.userData.objectId,{x:dragging.position.x,z:dragging.position.z});if(latest.current.playState&&down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<5){const o=hit(e);if(o)latest.current.onInteract?.(o.userData.objectId);}dragging=null;down=null;controls.enabled=true;};
 const drop=e=>{e.preventDefault();const type=e.dataTransfer.getData('forge/asset');const p=point(e);if(type&&p)latest.current.onAdd?.(type,{x:Math.round(p.x),z:Math.round(p.z)});};
 const over=e=>e.preventDefault();el.addEventListener('dragover',over);el.addEventListener('drop',drop);renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointermove',pointerMove);renderer.domElement.addEventListener('pointerup',pointerUp);
 const keys=new Set();const kd=e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase());if(e.key.toLowerCase()==='e'){const st=latest.current.playState;if(st){const p=st.players?.[latest.current.playerId]||Object.values(st.players||{})[0];if(p){const obj=latest.current.world.objects.filter(o=>o.type==='door').sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];if(obj)latest.current.onInteract?.(obj.id);}}}};
 const ku=e=>keys.delete(e.key.toLowerCase());window.addEventListener('keydown',kd);window.addEventListener('keyup',ku);const blur=()=>keys.clear();window.addEventListener('blur',blur);
 const resize=new ResizeObserver(()=>{const {width,height}=el.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();});resize.observe(el);
 function tick(t){frame=requestAnimationFrame(tick);controls.update();if(latest.current.playState&&t-lastMove>50){let dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),dz=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);if(dx||dz)latest.current.onMove?.(dx,dz);lastMove=t;}for(const child of objects.children)if(child.userData.type==='coin'&&child.children[0])child.children[0].rotation.y=t*.001;renderer.render(scene,camera);}frame=requestAnimationFrame(tick);
 engine.current={scene,objects,players,ground,camera,controls};
 return()=>{cancelAnimationFrame(frame);resize.disconnect();controls.dispose();scene.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose?.();});renderer.dispose();renderer.domElement.remove();el.removeEventListener('dragover',over);el.removeEventListener('drop',drop);window.removeEventListener('keydown',kd);window.removeEventListener('keyup',ku);window.removeEventListener('blur',blur);engine.current=null;};
 },[avatarOnly]);
 useEffect(()=>{const e=engine.current;if(!e)return;for(const c of [...e.objects.children]){e.objects.remove(c);disposeGroup(c);}if(avatarOnly){e.objects.add(makeAvatar(avatar));return;}const theme=THEMES.find(t=>t.id===world.theme)||THEMES[0];e.scene.background=new THREE.Color(theme.sky);if(e.ground.userData.top)e.ground.userData.top.material.color.set(theme.ground);for(const o of world.objects){if(playState?.collected?.includes(o.id)||playState&&o.type==='spawn')continue;const group=makeObject(o.type,o.color);group.position.set(o.x,o.y,o.z);group.rotation.y=o.rotation;group.scale.setScalar(o.scale);group.userData={objectId:o.id,type:o.type};if(o.id===selected&&!playState){const outline=new THREE.BoxHelper(group,'#d2f98a');e.objects.add(outline);}e.objects.add(group);}},[world,selected,playState?.collected?.join(','),avatar,avatarOnly]);
 useEffect(()=>{const e=engine.current;if(!e||avatarOnly)return;for(const c of [...e.players.children]){e.players.remove(c);disposeGroup(c);}for(const p of Object.values(playState?.players||{})){const a=makeAvatar(p.avatar);a.position.set(p.x,0,p.z);e.players.add(a);}},[playState,avatarOnly]);
 return <div ref={host} className={avatarOnly?'avatar-canvas':'world-canvas'} aria-label={avatarOnly?'Interactive avatar preview':'Interactive 3D world. Drag objects to move. Orbit to explore.'} />;
}
