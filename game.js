import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

const canvas=document.querySelector('#view');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.3;
const scene=new THREE.Scene();
scene.background=new THREE.Color('#081222');
scene.fog=new THREE.FogExp2('#081222',.012);
const camera=new THREE.PerspectiveCamera(73,innerWidth/innerHeight,.08,90);
const clock=new THREE.Clock();
const raycaster=new THREE.Raycaster();
const center=new THREE.Vector2(0,0);
const player={x:0,z:7.1,yaw:0,pitch:.055,speed:5.2,started:false,cores:0,placed:false,won:false,cooldown:0};
const keys=new Set();
const mat=(color,roughness=.7,metalness=.1,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
const mats={floor:mat('#172536',.82,.35),wall:mat('#1b2b3d',.72,.35),wallDark:mat('#101d2d',.75,.28),trim:mat('#506477',.43,.68),gold:mat('#d9904e',.4,.65),goldGlow:new THREE.MeshBasicMaterial({color:'#ffad5c'}),cyan:new THREE.MeshBasicMaterial({color:'#64ffe4'}),cyanGlass:new THREE.MeshBasicMaterial({color:'#56f7e3',transparent:true,opacity:.11,side:THREE.DoubleSide,depthWrite:false}),orange:new THREE.MeshBasicMaterial({color:'#ff9d59'}),orangeGlass:new THREE.MeshBasicMaterial({color:'#ff9b53',transparent:true,opacity:.14,side:THREE.DoubleSide,depthWrite:false}),black:mat('#08111c',.48,.25),white:mat('#dce5eb',.3,.25),crystal:mat('#ffc86a',.23,.25,{emissive:'#ff851d',emissiveIntensity:1.2}),
};
const boxGeo=new THREE.BoxGeometry(1,1,1);
function box(parent,name,pos,size,material,cast=true,receive=true){const o=new THREE.Mesh(boxGeo,material);o.name=name;o.position.set(...pos);o.scale.set(...size);o.castShadow=cast;o.receiveShadow=receive;parent.add(o);return o;}
function addLight(color,intensity,pos,distance=0){const l=new THREE.PointLight(color,intensity,distance,2);l.position.set(...pos);scene.add(l);return l;}
const world=new THREE.Group();scene.add(world);
scene.add(new THREE.HemisphereLight('#b9e8ff','#222c3d',2.1));
const keyLight=new THREE.DirectionalLight('#e3f2ff',2.2);keyLight.position.set(-5,12,8);keyLight.castShadow=true;keyLight.shadow.mapSize.set(1024,1024);keyLight.shadow.camera.left=-16;keyLight.shadow.camera.right=16;keyLight.shadow.camera.top=18;keyLight.shadow.camera.bottom=-18;scene.add(keyLight);

// Modular chamber architecture
const floor=box(world,'deck',[0,-.22,0],[24,.44,25],mats.floor,false,true);
const grid=new THREE.GridHelper(24,24,'#325063','#24394b');grid.position.y=.008;world.add(grid);
// Recessed floor seams and perimeter rails
for(let x=-10;x<=10;x+=2)box(world,'floor seam',[x,-.008,0],[.025,.012,24],mats.trim,false,false);
for(let z=-10;z<=10;z+=2)box(world,'floor seam',[0,-.008,z],[24,.012,.025],mats.trim,false,false);
// Room shell with the south fixed gate and north access gate openings
box(world,'west wall',[-12,2.4,0],[.6,4.8,24],mats.wall);
box(world,'east wall',[12,2.4,0],[.6,4.8,24],mats.wall);
box(world,'north wall',[0,2.4,-12],[24,.6,.6],mats.wall);
// South wall is split around the fixed portal
box(world,'south wall left',[-6.6,2.4,12],[10.8,4.8,.6],mats.wall);
box(world,'south wall right',[6.6,2.4,12],[10.8,4.8,.6],mats.wall);
box(world,'south lintel',[0,4.45,12],[2.4,.7,.6],mats.wall);
// Portal partition dividing the test chamber from the memory field
box(world,'partition left',[-6,2.35,0],[12,4.7,.65],mats.wallDark);
box(world,'partition right',[6,2.35,0],[12,4.7,.65],mats.wallDark);
box(world,'partition crown',[0,4.55,0],[.65,.5,.65],mats.wallDark);
// Gold receiver plate on the south face of the partition
box(world,'receiver plate backing',[0,2.05,.39],[3.55,3.8,.14],mats.black);
box(world,'receiver plate',[0,2.05,.29],[3.27,3.52,.08],mats.gold);
box(world,'plate inset',[0,2.05,.235],[2.98,3.23,.04],mats.wallDark);
for(const x of [-1.52,1.52])for(const y of [.48,3.62]){const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.05,12),mats.trim);bolt.rotation.x=Math.PI/2;bolt.position.set(x,y,.19);world.add(bolt);}
// Wall panels, ribs, and cyan guide strips
for(let z=-10;z<=10;z+=2){box(world,'wall rib',[-11.66,2.35,z],[.12,4.45,.12],mats.trim);box(world,'wall rib',[11.66,2.35,z],[.12,4.45,.12],mats.trim);}
for(let x=-10;x<=10;x+=2){box(world,'ceiling rib',[x,4.65,-11.65],[.12,.12,.12],mats.trim);}
for(const side of [-1,1]){
  const strip=box(world,'guide light',[side*11.54,.56,0],[.035,.035,22],mats.cyan,false,false);strip.material=mats.cyan;
  for(const z of [-8,-4,4,8])box(world,'wall light',[side*11.55,2.35,z],[.035,.45,.16],mats.cyan,false,false);
}
// Ceiling lamps cast soft pools of light
for(const z of [-8,-4,4,8]){box(world,'lamp housing',[0,4.58,z],[2.5,.15,.65],mats.black);const lamp=new THREE.Mesh(new THREE.BoxGeometry(2.15,.04,.32),new THREE.MeshBasicMaterial({color:'#b8fff3'}));lamp.position.set(0,4.48,z);world.add(lamp);addLight('#7fffea',2.0,[0,3.9,z],9);}
addLight('#ffad5c',2.2,[0,2.2,.1],7);

function portalFrame({name,pos,rotationY,color,glass,active=false}){
 const g=new THREE.Group();g.name=name;g.position.set(...pos);g.rotation.y=rotationY;world.add(g);
 const halo=new THREE.Mesh(new THREE.TorusGeometry(.79,.115,12,64),new THREE.MeshBasicMaterial({color,transparent:true,opacity:active?.95:.82}));halo.scale.y=1.48;g.add(halo);
 const inner=new THREE.Mesh(new THREE.CircleGeometry(.72,48),glass);inner.scale.y=1.42;inner.position.z=-.035;g.add(inner);
 const outer=new THREE.Mesh(new THREE.TorusGeometry(.92,.035,8,64),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.45}));outer.scale.y=1.48;outer.position.z=.025;g.add(outer);
 const cap=new THREE.Mesh(new THREE.BoxGeometry(2.4,.1,.13),mats.black);cap.position.y=1.47;g.add(cap);
 const light=new THREE.PointLight(color,active?2.8:1.8,5);light.position.set(0,0,.4);g.add(light);
 return {group:g,halo,inner,light};
}
// Target slot (the player's one movable gate) and fixed cyan gate at the south wall
const targetPortal=portalFrame({name:'one movable portal',pos:[0,1.93,.43],rotationY:0,color:'#ff9d59',glass:mats.orangeGlass,active:true});
targetPortal.group.visible=false;
const fixedPortal=portalFrame({name:'fixed cyan portal',pos:[0,1.93,11.67],rotationY:Math.PI,color:'#64ffe4',glass:mats.cyanGlass});
const targetHalo=targetPortal.halo;
const receiverPad=world.getObjectByName('plate inset');
receiverPad.material=mat('#26394a',.4,.5,{emissive:'#b16c35',emissiveIntensity:.3});

// Entrance and extraction marking on the south-side floor
function floorRing(x,z,color,r=.95){const ring=new THREE.Mesh(new THREE.RingGeometry(r-.09,r,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(x,.018,z);world.add(ring);return ring;}
const extractRing=floorRing(0,7.05,'#64ffe4',1.05);
const extractCore=new THREE.Mesh(new THREE.CylinderGeometry(.34,.48,.12,6),mats.black);extractCore.position.set(0,.08,7.05);world.add(extractCore);
for(let i=0;i<4;i++){const rune=new THREE.Mesh(new THREE.BoxGeometry(.035,.025,.28),new THREE.MeshBasicMaterial({color:'#73f5e1'}));rune.position.set(Math.sin(i*Math.PI/2)*.79,.035,7.05+Math.cos(i*Math.PI/2)*.79);rune.rotation.y=i*Math.PI/2;world.add(rune);}
addLight('#59ffe0',1.4,[0,.4,7.05],4);
// Cores in the isolated memory field
const cores=[];
for(const [i,x] of [-7,0,7].entries()){
 const g=new THREE.Group();g.position.set(x,.85,-6.3+(i===1?-1:0));g.userData.collected=false;
 const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.42,0),mats.crystal);crystal.scale.set(.78,1.32,.78);crystal.rotation.z=.2;crystal.castShadow=true;g.add(crystal);
 const orbit=new THREE.Mesh(new THREE.TorusGeometry(.65,.025,6,40),new THREE.MeshBasicMaterial({color:'#ffbf68',transparent:true,opacity:.75}));orbit.rotation.x=Math.PI/2;g.add(orbit);
 const glow=new THREE.PointLight('#ff9c49',1.3,3);glow.position.y=.1;g.add(glow);
 const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(.52,.63,.24,8),mats.black);pedestal.position.y=-.72;g.add(pedestal);
 const baseRing=new THREE.Mesh(new THREE.TorusGeometry(.54,.035,8,32),mats.goldGlow);baseRing.rotation.x=Math.PI/2;baseRing.position.y=-.57;g.add(baseRing);
 world.add(g);cores.push(g);
}
// Distant machinery and amber hazard chevrons add depth beyond the partition
for(const x of [-9,-6,-3,3,6,9]){
 box(world,'north field console',[x,.62,-9.6],[1.05,1.25,.42],mats.wallDark);
 box(world,'console display',[x,.82,-9.37],[.72,.38,.04],x%2?mats.cyan:mats.goldGlow,false,false);
}
for(const x of [-10,-8,-6,-4,-2,2,4,6,8,10]){
 const stripe=box(world,'partition warning stripe',[x,.1,.335],[.52,.12,.018],mats.goldGlow,false,false);stripe.rotation.y=.35;
}

const ui={
 intro:document.querySelector('#intro'),start:document.querySelector('#startButton'),win:document.querySelector('#winScreen'),restart:document.querySelector('#restartButton'),
 loading:document.querySelector('#loading'),objective:document.querySelector('#objectiveText'),hint:document.querySelector('#objectiveHint'),mission:document.querySelector('#missionText'),count:document.querySelector('#coreCount'),toast:document.querySelector('#toast'),place:document.querySelector('#placeButton'),
 stickZone:document.querySelector('#stickZone'),stickKnob:document.querySelector('#stickKnob'),
};
let toastTimer=0;
function toast(message){ui.toast.textContent=message;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),2100);}
function updateObjective(){
 ui.count.textContent=String(player.cores).padStart(2,'0');
 if(player.cores>=3){ui.objective.textContent='Return to the extraction pad';ui.hint.textContent='Cross either gate, then step into the cyan floor ring';ui.mission.textContent='EXTRACTION IS LIVE';}
 else if(player.placed){ui.objective.textContent='Cross the fixed cyan gate';ui.hint.textContent=`Recover ${3-player.cores} more memory core${player.cores===2?'':'s'} in the north field`;ui.mission.textContent='GATE LINK ESTABLISHED';}
 else{ui.objective.textContent='Place your portal on the brass receiver';ui.hint.textContent='Aim at the gold wall plate · press E';ui.mission.textContent='LOCATE THE RECEIVER';}
}
function setPortal(){
 if(player.placed){toast('ONE PORTAL ONLY · THE LINK IS ALREADY LIVE');return;}
 raycaster.setFromCamera(center,camera);
 const hit=raycaster.intersectObject(receiverPad,false)[0];
 if(!hit){toast('AIM AT THE BRASS RECEIVER PLATE');return;}
 player.placed=true;targetPortal.group.visible=true;targetPortal.group.position.set(0,1.93,.43);
 targetHalo.material.opacity=1;fixedPortal.halo.material.opacity=.95;
 receiverPad.material.emissive.set('#6c391c');receiverPad.material.emissiveIntensity=.1;
 updateObjective();toast('PORTAL PLACED · THE LINK IS LIVE');
}
function setStart(){if(player.started)return;player.started=true;ui.intro.classList.add('hidden');toast('ONE PORTAL. THREE CORES. FIND YOUR WAY BACK.');}
function resetGame(){
 player.x=0;player.z=7.1;player.yaw=0;player.pitch=-.025;player.cores=0;player.placed=false;player.won=false;player.cooldown=0;player.started=true;
 for(const c of cores){c.userData.collected=false;c.visible=true;}
 targetPortal.group.visible=false;ui.win.classList.add('hidden');ui.intro.classList.add('hidden');updateObjective();toast('TEST CHAMBER RESET');
}
ui.start.addEventListener('click',setStart);ui.restart.addEventListener('click',resetGame);ui.place.addEventListener('click',setPortal);

const isMobile=matchMedia('(max-width: 700px)').matches||('ontouchstart'in window&&innerWidth<900);
document.querySelector('#desktopHelp').style.display=isMobile?'none':'';
document.querySelector('#mobileControls').style.display=isMobile?'block':'';
let stickPointer=null,stick={x:0,y:0};
ui.stickZone.addEventListener('pointerdown',e=>{e.preventDefault();stickPointer=e.pointerId;ui.stickZone.setPointerCapture(e.pointerId);updateStick(e);});
ui.stickZone.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)updateStick(e);});
function releaseStick(e){if(e.pointerId!==stickPointer)return;stickPointer=null;stick.x=stick.y=0;ui.stickKnob.style.transform='translate(0px, 0px)';}
ui.stickZone.addEventListener('pointerup',releaseStick);ui.stickZone.addEventListener('pointercancel',releaseStick);
function updateStick(e){const r=ui.stickZone.getBoundingClientRect();const dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);const cap=34,mag=Math.hypot(dx,dy),scale=mag>cap?cap/mag:1;stick.x=dx*scale/cap;stick.y=dy*scale/cap;ui.stickKnob.style.transform=`translate(${dx*scale}px, ${dy*scale}px)`;}
let lookPointer=null,lastLook={x:0,y:0};
canvas.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'&&!isMobile){lookPointer=e.pointerId;lastLook.x=e.clientX;lastLook.y=e.clientY;canvas.setPointerCapture(e.pointerId);}
 else if(e.pointerType!=='mouse'&&e.clientX>innerWidth*.42&&e.clientY<innerHeight-110){lookPointer=e.pointerId;lastLook.x=e.clientX;lastLook.y=e.clientY;canvas.setPointerCapture(e.pointerId);}
});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer)return;const dx=e.clientX-lastLook.x,dy=e.clientY-lastLook.y;lastLook.x=e.clientX;lastLook.y=e.clientY;player.yaw-=dx*.0046;player.pitch=THREE.MathUtils.clamp(player.pitch-dy*.0038,-.72,.66);});
function releaseLook(e){if(e.pointerId===lookPointer)lookPointer=null;}
canvas.addEventListener('pointerup',releaseLook);canvas.addEventListener('pointercancel',releaseLook);
window.addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyE'&&!e.repeat)setPortal();if(e.code==='Enter'&&!player.started)setStart();});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());

function teleport(toNorth){
 if(player.cooldown>0)return;
 if(toNorth){player.z=-1.24;player.x=THREE.MathUtils.clamp(player.x,-.55,.55);}
 else{player.z=10.72;player.x=THREE.MathUtils.clamp(player.x,-.55,.55);}
 player.cooldown=.85;camera.position.set(player.x,1.65,player.z);
 toast(toNorth?'LINK TRANSIT · NORTH FIELD':'LINK TRANSIT · TEST CHAMBER');
}
function updateMovement(dt){
 if(!player.started||player.won)return;
 let strafe=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+stick.x;
 let forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-stick.y;
 const len=Math.hypot(strafe,forward);if(len>1){strafe/=len;forward/=len;}
 const fx=-Math.sin(player.yaw),fz=-Math.cos(player.yaw),rx=Math.cos(player.yaw),rz=-Math.sin(player.yaw);
 const speed=player.speed*dt,nx=player.x+(rx*strafe+fx*forward)*speed,nz=player.z+(rz*strafe+fz*forward)*speed;
 let x=THREE.MathUtils.clamp(nx,-11.28,11.28),z=THREE.MathUtils.clamp(nz,-11.28,11.28);
 if(player.cooldown<=0&&player.placed){
  if(player.z<11.22&&nz>=11.22&&Math.abs(x)<.98){teleport(true);return;}
  if(player.z>.34&&nz<=.34&&Math.abs(x)<.88){teleport(true);return;}
  if(player.z<-.34&&nz>=-.34&&Math.abs(x)<.88){teleport(false);return;}
 }
 if(z>=-.35&&z<=.35){if(player.z>.35)z=.36;else if(player.z<-.35)z=-.36;}
 if(z>11.18)z=11.18;
 player.x=x;player.z=z;
}
function updateCores(dt,time){
 for(const c of cores){if(c.userData.collected)continue;c.rotation.y=time*.72+c.position.x*.08;c.position.y=.85+Math.sin(time*2.15+c.position.x)*.09;
  if(player.started&&Math.hypot(player.x-c.position.x,player.z-c.position.z)<1.12){c.userData.collected=true;c.visible=false;player.cores++;updateObjective();toast(`MEMORY CORE ${String(player.cores).padStart(2,'0')} / 03 RECOVERED`);}
 }
 if(player.started&&player.cores===3&&player.z>5.7&&player.z<8.4&&Math.abs(player.x)<1.25){player.won=true;ui.win.classList.remove('hidden');}
}

function resize(){renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);
function frame(){
 requestAnimationFrame(frame);
 const dt=Math.min(clock.getDelta(),.04),time=clock.elapsedTime;
 player.cooldown=Math.max(0,player.cooldown-dt);
 updateMovement(dt);updateCores(dt,time);
 camera.position.set(player.x,1.65,player.z);
 camera.rotation.order='YXZ';camera.rotation.set(player.pitch,player.yaw,0,'YXZ');
 targetPortal.halo.rotation.z=Math.sin(time*1.8)*.04;
 fixedPortal.halo.rotation.z=Math.sin(time*1.35+1)*.025;
 for(const c of cores){if(c.visible)c.children[1].rotation.z=-time*.7;}
 extractRing.material.opacity=.62+Math.sin(time*2.7)*.22;
 renderer.render(scene,camera);
}
updateObjective();
frame();
window.addEventListener('load',()=>setTimeout(()=>ui.loading.classList.add('done'),450));
setTimeout(()=>ui.loading.classList.add('done'),1800);

