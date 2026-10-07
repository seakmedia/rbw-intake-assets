/* Self-contained, rotatable 3D mannequin. No remote models, tracking, or libraries. */
class IntakeBodyMap {
 constructor(canvas, options) {
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.options=options;this.angle=0;this.triangles=[];this.projected=[];this.markers=[];this.drag=null;this.anim=0;
  if(!this.ctx){canvas.closest('.body-panel').hidden=true;document.querySelector('.list-alternative').open=true;document.getElementById('map-status').textContent='Use the body-area list to select your focus areas on this device.';return;}
  this.build();this.initSurfaceRenderer();
  this.markerLayer=document.createElement('div');this.markerLayer.className='marker-layer';
  const stage=document.createElement('div');stage.className='body-stage';canvas.replaceWith(stage);stage.append(canvas,this.markerLayer);
  this.markerButtons=new Map();this.markerDrag=null;
  this.pauseRotation=document.createElement('button');this.pauseRotation.type='button';this.pauseRotation.className='pause-body-rotation';this.pauseRotation.textContent='Pause rotation';this.pauseRotation.hidden=true;canvas.closest('.body-panel').querySelector('.view-buttons').before(this.pauseRotation);this.pauseRotation.addEventListener('click',()=>this.stopMotion());
  if(typeof ResizeObserver!=='undefined'){this.resizeObserver=new ResizeObserver(()=>this.draw());this.resizeObserver.observe(canvas);}else window.addEventListener('resize',()=>this.draw());
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;this.stopMotion();this.drag={x:e.clientX,y:e.clientY,start:this.angle,moved:false};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!this.drag)return;const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(Math.abs(dx)>6||Math.abs(dy)>6)this.drag.moved=true;if(this.drag.moved){this.stopMotion();this.angle=((this.drag.start+dx*.012)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);this.draw();this.notify();}});
  canvas.addEventListener('pointerup',e=>{if(!this.drag)return;const moved=this.drag.moved;this.drag=null;if(!moved)this.pick(e);});
  canvas.addEventListener('pointercancel',()=>{this.drag=null;});
  requestAnimationFrame(()=>this.draw());
 }
 build(){
  const add=(a,b,c,part,center)=>{const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]);let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const len=Math.hypot(...n)||1;n=n.map(x=>x/len);const p=a.map((v,i)=>(v+b[i]+c[i])/3);this.triangles.push({points:[a,b,c],normal:n,p,part,center});};
  const mesh=window.ClinicalBodyMesh;
  if(!mesh)throw new Error('Clinical body asset is missing');
  const vertices=mesh.vertices.map(p=>[p[0],p[1],p[2]-.09]);
  const label=p=>{const [x,y,z]=p,side=x>=0?'Left':'Right',ax=Math.abs(x);
   if(y>1.45)return 'Head';
   if(y>1.26&&ax<.19)return 'Neck';
   if(ax>(y>.95?.34:y>.5?.39:.48))return side+' '+(y>1.10?'shoulder':y>.87?'upper arm':y>.75?'elbow':y>.46?'forearm':y>.38?'wrist':'hand');
   if(y<.05)return side+' '+(y>-.16?'hip':y>-.60?'thigh':y>-.77?'knee':y>-1.28?'lower leg':y>-1.40?'ankle':'foot');
   return 'Torso';
  };
  for(const f of mesh.faces){for(let i=1;i<f.length-1;i++){const pts=[vertices[f[0]],vertices[f[i]],vertices[f[i+1]]],p=pts[0].map((v,k)=>(v+pts[1][k]+pts[2][k])/3);add(...pts,label(p),[0,0,0]);}}
  // Averaged mesh normals soften shading without changing the selectable surface.
  const normals=new Map();for(const tri of this.triangles)for(const p of tri.points){const key=p.map(v=>v.toFixed(5)).join(',');const sum=normals.get(key)||[0,0,0];tri.normal.forEach((v,i)=>sum[i]+=v);normals.set(key,sum);}for(const tri of this.triangles){const sum=[0,0,0];for(const p of tri.points){const n=normals.get(p.map(v=>v.toFixed(5)).join(',')),len=Math.hypot(...n)||1;n.forEach((v,i)=>sum[i]+=v/len);}const len=Math.hypot(...sum)||1;tri.smoothNormal=sum.map(v=>v/len);tri.vertexNormals=tri.points.map(p=>{const n=normals.get(p.map(v=>v.toFixed(5)).join(',')),l=Math.hypot(...n)||1;return n.map(v=>v/l);});}

 }
 initSurfaceRenderer(){
  try{
   const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true});if(!gl)return;
   const shader=(type,source)=>{const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;};
   const program=gl.createProgram();
   gl.attachShader(program,shader(gl.VERTEX_SHADER,`attribute vec3 position;attribute vec3 normal;uniform vec4 projection;varying vec3 lightNormal;void main(){float c=projection.z,s=projection.w;vec3 p=vec3(position.x*c-position.z*s,position.y,position.x*s+position.z*c);lightNormal=vec3(normal.x*c-normal.z*s,normal.y,normal.x*s+normal.z*c);gl_Position=vec4(p.x*projection.x,p.y*projection.y-.02,-p.z/3.0,1.0);}`));
   gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision mediump float;varying vec3 lightNormal;void main(){vec3 n=normalize(lightNormal);if(n.z<0.0)n=-n;float diffuse=max(0.0,dot(n,normalize(vec3(-.45,.5,.74))));float rim=pow(1.0-abs(n.z),3.0);vec3 color=vec3(.66,.82,.89)*(.72+.28*diffuse)+vec3(.10,.15,.17)*rim;gl_FragColor=vec4(color,1.0);}`));
   gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Surface shader link');gl.useProgram(program);
   const data=[];for(const t of this.triangles)for(let i=0;i<3;i++)data.push(...t.points[i],...t.vertexNormals[i]);
   const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
   for(const [name,offset] of [['position',0],['normal',12]]){const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,24,offset);}
   this.surfaceRenderer={canvas,gl,program,projection:gl.getUniformLocation(program,'projection'),count:data.length/6};
  }catch(error){this.surfaceRenderer=null;}
 }
 drawSmoothSurface(){const r=this.surfaceRenderer;if(!r||r.gl.isContextLost())return false;const {gl,canvas}=r;if(canvas.width!==this.canvas.width||canvas.height!==this.canvas.height){canvas.width=this.canvas.width;canvas.height=this.canvas.height;}gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.useProgram(r.program);gl.uniform4f(r.projection,2*this.scale/this.w,2*this.scale/this.h,Math.cos(this.angle),Math.sin(this.angle));gl.drawArrays(gl.TRIANGLES,0,r.count);this.ctx.drawImage(canvas,0,0,this.w,this.h);return true;}
 project(p){const c=Math.cos(this.angle),s=Math.sin(this.angle),x=p[0]*c-p[2]*s,z=p[0]*s+p[2]*c;return [this.w/2+x*this.scale,this.h*.51-p[1]*this.scale,z];}
 info(tri){let surface=Math.abs(tri.normal[2])<.4&&Math.abs(tri.normal[0])>.5?'Side':tri.p[2]>=tri.center[2]?'Front':'Back',part=tri.part;if(part.endsWith(' arm')){const side=part.split(' ')[0];part=side+' '+(tri.p[1]>.99?'shoulder':tri.p[1]>.59?'upper arm':tri.p[1]>.44?'elbow':tri.p[1]>.08?'forearm':tri.p[1]>0?'wrist':'hand');}if(part.endsWith(' leg')){const side=part.split(' ')[0];part=side+' '+(tri.p[1]>-.2?'hip':tri.p[1]>-.7?'thigh':tri.p[1]>-.89?'knee':tri.p[1]>-1.30?'lower leg':'ankle');}if(part.endsWith(' hip')&&Math.abs(tri.p[0])<.07)part=surface==='Back'?'Lower back':'Lower abdomen';/* v1.1: centre-line taps are midline, not left/right hip */if(part==='Torso'){if(tri.p[1]>1.24)part='Neck';else if(surface==='Side')part=(tri.p[0]>=0?'Left':'Right')+' torso';else if(tri.p[1]>.65)part=surface==='Front'?'Chest':'Upper back';else if(tri.p[1]>.25)part=surface==='Front'?'Abdomen':'Mid back';else part=surface==='Front'?'Lower abdomen':'Lower back';}return {part,surface};}
 draw(){if(!this.ctx)return;const rect=this.exportSize||this.canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;this.w=rect.width;this.h=rect.height;const dpr=Math.min(devicePixelRatio||1,2);if(this.canvas.width!==Math.round(this.w*dpr)||this.canvas.height!==Math.round(this.h*dpr)){this.canvas.width=Math.round(this.w*dpr);this.canvas.height=Math.round(this.h*dpr);}const ctx=this.ctx;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,this.w,this.h);this.scale=Math.min(this.h/3.85,this.w/2.45);const c=Math.cos(this.angle),s=Math.sin(this.angle);
  const shadow=ctx.createRadialGradient(this.w/2,this.h*.925,1,this.w/2,this.h*.925,this.w*.27);shadow.addColorStop(0,'rgba(113,87,139,.15)');shadow.addColorStop(1,'rgba(113,87,139,0)');ctx.save();ctx.translate(0,this.h*.925*.72);ctx.scale(1,.28);ctx.fillStyle=shadow;ctx.fillRect(0,0,this.w,this.h*4);ctx.restore();
  this.projected=this.triangles.map(t=>{const points=t.points.map(p=>this.project(p)),normal=t.smoothNormal||t.normal,n=[normal[0]*c-normal[2]*s,normal[1],normal[0]*s+normal[2]*c];return {t,points,depth:points.reduce((sum,p)=>sum+p[2],0)/3,n};}).sort((a,b)=>a.depth-b.depth);
  if(!this.drawSmoothSurface()){
  for(const item of this.projected){let n=item.n;if(n[2]<0)n=n.map(x=>-x);const light=.65+.35*Math.max(0,n[0]*-.45+n[1]*.5+n[2]*.74);const info=this.info(item.t),selected=this.markers.some(m=>m.part===info.part&&m.surface===info.surface);const base=selected?[143,196,208]:[175,213,226];const rim=Math.pow(1-Math.abs(n[2]),3)*.16;const color='rgb('+base.map((x,i)=>Math.round(Math.min(255,x*light+[150,222,240][i]*rim))).join(',')+')';ctx.beginPath();item.points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=.35;ctx.fill();ctx.stroke();}

  }
  this.drawMarkers();
 }
 drawMarkers(){
  for(const [id,button] of this.markerButtons)if(!this.markers.some(m=>m.id===id)){button.remove();this.markerButtons.delete(id);}
  this.markers.forEach((m,i)=>{
   let button=this.markerButtons.get(m.id);
   if(!button){button=document.createElement('button');button.type='button';button.className='body-marker';button.dataset.markerId=m.id;button.innerHTML='<span></span>';this.markerLayer.append(button);this.markerButtons.set(m.id,button);
    button.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();this.stopMotion();const item=this.markers.find(a=>a.id===m.id),screen=this.project(item.anchor),rect=this.canvas.getBoundingClientRect();this.markerDrag={id:m.id,original:{part:item.part,surface:item.surface,anchor:item.anchor.slice()},dx:e.clientX-rect.left-screen[0],dy:e.clientY-rect.top-screen[1]};button.setPointerCapture(e.pointerId);button.classList.add('moving');button.focus({preventScroll:true});});
    button.addEventListener('pointermove',e=>{if(this.markerDrag?.id!==m.id)return;const rect=this.canvas.getBoundingClientRect();this.moveMarker(m.id,[e.clientX-rect.left-this.markerDrag.dx,e.clientY-rect.top-this.markerDrag.dy],false);});
    const finish=(e,cancel)=>{if(this.markerDrag?.id!==m.id)return;const original=this.markerDrag.original;this.markerDrag=null;button.classList.remove('moving');if(button.hasPointerCapture(e.pointerId))button.releasePointerCapture(e.pointerId);const item=this.markers.find(a=>a.id===m.id);if(item)this.options.onMove(m.id,cancel?original:{part:item.part,surface:item.surface,anchor:item.anchor.slice()},true);};
    button.addEventListener('pointerup',e=>finish(e,false));button.addEventListener('pointercancel',e=>finish(e,true));
    button.addEventListener('keydown',e=>{const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(!moves[e.key])return;e.preventDefault();const item=this.markers.find(a=>a.id===m.id),p=this.project(item.anchor),d=moves[e.key],amount=e.shiftKey?5:1;this.moveMarker(m.id,[p[0]+d[0]*amount,p[1]+d[1]*amount],true);});
   }
   const p=this.project(m.anchor),cover=this.hitAt(p);button.hidden=!!(cover&&cover.depth>p[2]+.035&&this.markerDrag?.id!==m.id);button.style.left=p[0]+'px';button.style.top=p[1]+'px';button.style.setProperty('--marker-color',m.color||'#77539c');button.firstElementChild.textContent=i+1;button.setAttribute('aria-label',`Spot ${i+1}: ${m.part}, ${m.surface}. Drag to move, or use arrow keys for fine adjustments.`);button.title=`Move spot ${i+1} · drag or use arrow keys`;
  });
 }
 hitAt(p){let best=null;for(const item of this.projected){const [a,b,c]=item.points,den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-8)continue;const u=((b[1]-c[1])*(p[0]-c[0])+(c[0]-b[0])*(p[1]-c[1]))/den,v=((c[1]-a[1])*(p[0]-c[0])+(a[0]-c[0])*(p[1]-c[1]))/den,w=1-u-v;if(u<-.0001||v<-.0001||w<-.0001)continue;const depth=a[2]*u+b[2]*v+c[2]*w;if(!best||depth>best.depth)best={item,depth,anchor:item.t.points[0].map((x,i)=>x*u+item.t.points[1][i]*v+item.t.points[2][i]*w)};}return best;}
 moveMarker(id,p,finished){const hit=this.hitAt(p);if(!hit)return;this.options.onMove(id,{...this.info(hit.item.t),anchor:hit.anchor},finished);}
 inside(p,t){const sign=(p,a,b)=>(p[0]-b[0])*(a[1]-b[1])-(a[0]-b[0])*(p[1]-b[1]);const a=sign(p,t[0],t[1]),b=sign(p,t[1],t[2]),c=sign(p,t[2],t[0]);return !((a<0||b<0||c<0)&&(a>0||b>0||c>0));}
 pick(e){const rect=this.canvas.getBoundingClientRect(),p=[e.clientX-rect.left,e.clientY-rect.top];const hit=this.hitAt(p);if(!hit)return;this.options.onSelect({...this.info(hit.item.t),anchor:hit.anchor});}
 setMarkers(markers){if(markers.length)this.stopMotion();this.markers=markers;this.draw();}
 snapshot(degrees){if(!this.ctx)return null;const previous=this.angle;this.exportSize={width:360,height:460};this.angle=degrees*Math.PI/180;this.draw();const copy=document.createElement('canvas');copy.width=this.canvas.width;copy.height=this.canvas.height;const context=copy.getContext('2d');context.fillStyle='#ffffff';context.fillRect(0,0,copy.width,copy.height);context.drawImage(this.canvas,0,0);const ratio=copy.width/this.w;context.scale(ratio,ratio);this.markers.forEach((m,i)=>{const p=this.project(m.anchor),cover=this.hitAt(p);if(cover&&cover.depth>p[2]+.035)return;context.beginPath();context.arc(p[0],p[1],13,0,Math.PI*2);context.fillStyle=m.color;context.fill();context.strokeStyle='#fff';context.lineWidth=2;context.stroke();context.fillStyle='#fff';context.textAlign='center';context.textBaseline='middle';context.font='bold 13px Arial';context.fillText(i+1,p[0],p[1]);});const data=copy.toDataURL('image/png');this.angle=previous;this.exportSize=null;this.draw();return data;}
 notify(){const degrees=Math.round((this.angle*180/Math.PI+360)%360);this.options.onRotate(degrees);}
 stopMotion(){cancelAnimationFrame(this.anim);if(this.pauseRotation)this.pauseRotation.hidden=true;}
 introduce(){
  if(this.introduced)return;this.introduced=true;
  if(this.markers.length||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  this.stopMotion();this.pauseRotation.hidden=false;
  const start=this.angle,t0=performance.now(),duration=18000;
  const tick=now=>{
   if(!this.canvas.getClientRects().length||document.hidden||matchMedia('(prefers-reduced-motion:reduce)').matches){this.stopMotion();return;}
   const t=Math.min(1,(now-t0)/duration),ease=t*t*(3-2*t);
   this.angle=(start+Math.PI*2*ease)%(Math.PI*2);this.draw();this.notify();
   if(t<1)this.anim=requestAnimationFrame(tick);else this.stopMotion();
  };
  this.anim=requestAnimationFrame(tick);
 }
 rotate(degrees,animate=true,duration=340){this.stopMotion();const target=degrees*Math.PI/180;let delta=((target-this.angle+Math.PI*3)%(Math.PI*2))-Math.PI;const start=this.angle,t0=performance.now();if(!animate||matchMedia('(prefers-reduced-motion:reduce)').matches){this.angle=target;this.draw();this.notify();return;}const tick=now=>{const t=Math.min(1,(now-t0)/duration),ease=t*t*(3-2*t);this.angle=start+delta*ease;this.draw();this.notify();if(t<1)this.anim=requestAnimationFrame(tick);};this.anim=requestAnimationFrame(tick);}
 anchorFor(part,surface){let triangles=this.triangles.filter(t=>this.info(t).part===part);if(!triangles.length)return [0,.6,surface==='Back'?-.2:.2];if(surface==='Side'){const sign=part.startsWith('Right')?-1:1;const maxX=Math.max(...triangles.map(t=>t.p[0]*sign));const edge=triangles.filter(t=>t.p[0]*sign>maxX-.02);return edge.reduce((p,t)=>p.map((x,i)=>x+t.p[i]/edge.length),[0,0,0]);}const sign=surface==='Back'?-1:1;const max=Math.max(...triangles.map(t=>t.p[2]*sign));const face=triangles.filter(t=>t.p[2]*sign>max-.025);return face.reduce((p,t)=>p.map((x,i)=>x+t.p[i]/face.length),[0,0,0]);}
}
window.IntakeBodyMap=IntakeBodyMap;


