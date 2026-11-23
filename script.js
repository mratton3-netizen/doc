(() => {
  'use strict';
  const root=document.documentElement, reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let motion=!reduced.matches;
  const menu=document.querySelector('.menu-toggle'), nav=document.querySelector('.nav'), motionButton=document.querySelector('.motion-toggle');
  function closeMenu(){menu.setAttribute('aria-expanded','false');nav.classList.remove('open');}
  menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open);});
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('click',e=>{if(!e.target.closest('.header'))closeMenu();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});
  document.querySelectorAll('.glass-button').forEach(button=>button.addEventListener('pointerdown',e=>{if(!motion)return;const rect=button.getBoundingClientRect(),ripple=document.createElement('span');ripple.className='button-ripple';ripple.setAttribute('aria-hidden','true');ripple.style.cssText=`--x:${e.clientX-rect.left}px;--y:${e.clientY-rect.top}px`;button.appendChild(ripple);setTimeout(()=>ripple.remove(),1000);}));
  const image=document.getElementById('sea-texture'),canvas=document.getElementById('ocean');
  let gl=null;try{gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});}catch(_){}
  let program=null,uniforms=null,texture=null,time=0,previous=0,frame=0,running=false,visible=true;
  const rings=Array.from({length:3},()=>[-10,-10,-100]);let ringIndex=0;
  function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);return null;}return s;}
  function setup(){
    if(!gl||!image.naturalWidth)return;
    const vertex=compile(gl.VERTEX_SHADER,`attribute vec2 a;varying vec2 uv;void main(){uv=a*.5+.5;gl_Position=vec4(a,0.,1.);}`);
    const fragment=compile(gl.FRAGMENT_SHADER,`precision mediump float;
      varying vec2 uv;uniform sampler2D sea;uniform vec2 size;uniform vec2 imageSize;uniform float time;uniform vec3 rings[3];
      void main(){
        vec2 p=uv;float t=time*.23;
        vec2 flow=vec2(sin(p.y*14.+sin(p.x*5.2+t*.7)*.65+t)*.0022+sin(p.y*29.-t*.64)*.0007,cos(p.x*9.7-p.y*7.3+t*.6)*.0015+sin(p.y*20.+t*.5)*.0008);
        for(int i=0;i<3;i++){float age=time-rings[i].z;vec2 delta=(p-rings[i].xy)*vec2(size.x/size.y,1.);float d=length(delta);float wave=d-age*.075;float amount=sin(wave*105.)*exp(-abs(wave)*30.)*exp(-max(age,0.)*.8)*.003*step(0.,age);flow+=normalize(delta+vec2(.0001))*amount;}
        vec2 coord=p+flow;float screenRatio=size.x/size.y;float photoRatio=imageSize.x/imageSize.y;
        if(screenRatio>photoRatio){coord.y=(coord.y-.5)*photoRatio/screenRatio+.5;}else{coord.x=(coord.x-.5)*screenRatio/photoRatio+.5;}
        vec3 color=texture2D(sea,clamp(coord,vec2(.003),vec2(.997))).rgb;
        float glint=sin(p.y*20.+sin(p.x*9.+t)*.35+t*.55)*sin(p.x*12.-p.y*8.+t*.45);
        color*=.9+glint*.028;gl_FragColor=vec4(color,1.);
      }`);
    if(!vertex||!fragment)return;
    program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)){program=null;return;}
    gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
    texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    uniforms={size:gl.getUniformLocation(program,'size'),imageSize:gl.getUniformLocation(program,'imageSize'),time:gl.getUniformLocation(program,'time'),rings:gl.getUniformLocation(program,'rings[0]')};
    draw();canvas.classList.add('ready');start();
  }
  function draw(){if(!gl||!program||gl.isContextLost())return;const dpr=Math.min(devicePixelRatio||1,innerWidth<700?1:1.3),w=Math.round(canvas.clientWidth*dpr),h=Math.round(canvas.clientHeight*dpr);if(!w||!h)return;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}gl.uniform2f(uniforms.size,w,h);gl.uniform2f(uniforms.imageSize,image.naturalWidth,image.naturalHeight);gl.uniform1f(uniforms.time,time);gl.uniform3fv(uniforms.rings,new Float32Array(rings.flat()));gl.drawArrays(gl.TRIANGLES,0,6);}
  function tick(now){if(!motion||!visible||document.hidden){running=false;previous=0;return;}if(!previous||now-previous>=32){if(previous)time+=Math.min((now-previous)/1000,.1);previous=now;draw();}frame=requestAnimationFrame(tick);}
  function start(){if(program&&motion&&visible&&!document.hidden&&!running){running=true;previous=0;frame=requestAnimationFrame(tick);}}
  function setMotion(value){motion=value;root.classList.toggle('no-motion',!motion);motionButton.setAttribute('aria-pressed',String(motion));motionButton.querySelector('span').textContent=`Движение воды: ${motion?'вкл.':'выкл.'}`;if(motion)start();else{cancelAnimationFrame(frame);running=false;previous=0;draw();}}
  image.addEventListener('load',setup,{once:true});if(image.complete&&image.naturalWidth)setup();
  document.querySelector('.hero').addEventListener('pointerdown',e=>{if(!motion||e.target.closest('a,button'))return;const rect=canvas.getBoundingClientRect();rings[ringIndex]=[(e.clientX-rect.left)/rect.width,1-(e.clientY-rect.top)/rect.height,time];ringIndex=(ringIndex+1)%rings.length;});
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)start();},{threshold:0}).observe(canvas);
  window.addEventListener('resize',()=>{if(innerWidth>900)closeMenu();draw();});document.addEventListener('visibilitychange',()=>{if(!document.hidden)start();});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(frame);running=false;canvas.classList.remove('ready');});
  motionButton.addEventListener('click',()=>setMotion(!motion));reduced.addEventListener('change',e=>setMotion(!e.matches));setMotion(motion);
})();
