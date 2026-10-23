export const THEMES = [
 {id:'valley',name:'Enchanted Valley',description:'Quiet forests, curious paths, a little magic.',image:'/assets/moonlit-valley.png',ground:'#7b9d65',sky:'#d4e1eb',accent:'#a6ef58'},
 {id:'orbital',name:'Orbital Station',description:'Build your next adventure among the stars.',image:'/assets/orbital-station.png',ground:'#53657b',sky:'#111e35',accent:'#69d9f2'},
 {id:'desert',name:'Desert Outpost',description:'Sunlit ruins and stories waiting to be found.',image:'/assets/desert-outpost.png',ground:'#d6af77',sky:'#f0d9bb',accent:'#eeac6c'}
];
export const ASSETS = [
 {type:'tree',name:'Oak tree',category:'Nature',icon:'Tree'},
 {type:'pine',name:'Pine tree',category:'Nature',icon:'TreeEvergreen'},
 {type:'cottage',name:'Stone cottage',category:'Buildings',icon:'House'},
 {type:'bridge',name:'Wooden bridge',category:'Structures',icon:'Bridge'},
 {type:'lantern',name:'Lantern',category:'Props',icon:'LampPendant'},
 {type:'rock',name:'Boulder',category:'Nature',icon:'Mountains'},
 {type:'door',name:'Magic gate',category:'Gameplay',icon:'Door'},
 {type:'coin',name:'Star crystal',category:'Gameplay',icon:'Diamond'},
 {type:'fence',name:'Fence',category:'Structures',icon:'Fence'},
 {type:'bench',name:'Bench',category:'Props',icon:'Armchair'},
 {type:'flower',name:'Flower patch',category:'Nature',icon:'Flower'},
 {type:'spawn',name:'Player spawn',category:'Gameplay',icon:'PersonSimpleWalk'}
];
export function initialWorld(theme='valley') {
 const objects=[]; let n=0;
 const put=(type,x,z,extra={})=>objects.push({id:`obj-${++n}`,type,name:ASSETS.find(a=>a.type===type)?.name||type,x,y:0,z,rotation:0,scale:1,color:null,...extra});
 put('cottage',-3,-3); put('cottage',4,-5,{rotation:-.35});
 [[-7,-5],[-6,3],[6,4],[7,-3],[-1,-7],[-7,-1],[4,6]].forEach(([x,z],i)=>put(i%2?'pine':'tree',x,z));
 put('bridge',0,1); put('lantern',-2,2); put('lantern',2,2); put('rock',6,-6); put('rock',-5,6);
 put('bench',-4,1); put('flower',-3,-.5); put('flower',5,-3);
 put('coin',-3,4); put('coin',5,1); put('coin',1,-5); put('door',0,-7); put('spawn',0,5);
 return {theme,objects,objective:'Find all three star crystals, then open the magic gate.',rules:[{id:'exit',trigger:'interact',target:'door',effect:'win',requires:'all_crystals'}]};
}
export function validateWorld(w) {
 if(!w||!THEMES.some(t=>t.id===w.theme)||!Array.isArray(w.objects)||w.objects.length>300) return 'Invalid world or object limit exceeded (300).';
 const ids=new Set();
 for(const o of w.objects){
  if(!o||typeof o.id!=='string'||o.id.length>100||ids.has(o.id)||!ASSETS.some(a=>a.type===o.type))return 'Invalid or duplicate object.';
  ids.add(o.id);
  if(![o.x,o.y,o.z,o.rotation,o.scale].every(Number.isFinite)||Math.abs(o.x)>12||Math.abs(o.z)>12||o.y<0||o.y>12||o.scale<.2||o.scale>4||Math.abs(o.rotation)>100)return 'Object transform out of bounds.';
  if(typeof o.name!=='string'||o.name.length>80)return 'Invalid object name.';
  if(o.color!==null&&o.color!==undefined&&!/^#[0-9a-f]{6}$/i.test(o.color))return 'Invalid color.';
 }
 if(typeof w.objective!=='string'||w.objective.length>500)return 'Invalid objective.';
 if(!Array.isArray(w.rules)||w.rules.length>30)return 'Invalid rules.';
 for(const r of w.rules)if(!r||!['interact','collect'].includes(r.trigger)||!ASSETS.some(a=>a.type===r.target)||!['win','message'].includes(r.effect)||!['all_crystals','none'].includes(r.requires)||r.message&&String(r.message).length>300)return 'Invalid rule.';
 return null;
}
export function inspectWorld(w){
 const issues=[];
 if(!w.objects.some(o=>o.type==='spawn'))issues.push('Add a player spawn.');
 if(!w.objects.some(o=>o.type==='door'))issues.push('Add a magic gate for your ending.');
 if(!w.objects.some(o=>o.type==='coin'))issues.push('Add at least one star crystal.');
 if(!w.rules.some(r=>r.effect==='win'))issues.push('Add a rule with a win effect.');
 return issues;
}
