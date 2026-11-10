import { useEffect, useRef, useState } from 'react';

const vertex = `attribute vec2 position; varying vec2 uv;
void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const fragment = `precision mediump float;
varying vec2 uv;
uniform sampler2D photo;
uniform float time;
uniform float activity;
uniform float mono;
uniform vec2 resolution;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float bayer(vec2 p){vec2 q=mod(floor(p),4.);return mod(q.x*2.+q.y*3.,4.)/4.;}
void main(){
  vec2 p=uv;
  // A short analog sync slip, rather than continuous face distortion.
  float band=step(.996, sin(time*.37+p.y*2.));
  p.x+=band*sin(time*13.)*.008;
  vec2 cells=vec2(112.,102.);
  p=(floor(p*cells)+.5)/cells;
  vec4 tex=texture2D(photo,clamp(p,0.,1.));
  float luma=dot(tex.rgb,vec3(.299,.587,.114));
  float dither=(bayer(p*cells)-.375)*.07;
  vec3 colour=floor(clamp(tex.rgb+dither,0.,1.)*15.)/15.;
  float levels=floor(clamp(luma+dither,0.,1.)*8.)/8.;
  vec3 phosphor=vec3(.54,1.,.44)*(levels*.9+.035);
  colour=mix(colour*.9,phosphor,mono);
  // Scanlines, a travelling refresh band and low-level electronic grain.
  float scan=.91+.09*sin(uv.y*resolution.y*3.14159);
  float refresh=exp(-pow((fract(time*.12)-uv.y)*24.,2.))*.055;
  float grain=(hash(floor(uv*resolution)+floor(time*12.))-.5)*.035;
  colour*=scan*(.985+.015*sin(time*9.));
  colour+=refresh+grain+activity*.018*sin(time*27.);
  float alpha=tex.a*smoothstep(0.,.12,uv.y);
  gl_FragColor=vec4(max(colour,0.)*alpha,alpha);
}`;

export default function PhotoTransmission({ speaking }: { speaking: boolean }) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const speakingRef=useRef(speaking);
  const [ready,setReady]=useState(false);
  const [mono,setMono]=useState(true);
  const monoRef=useRef(mono);
  speakingRef.current=speaking; monoRef.current=mono;
  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas)return;
    const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:true});
    if(!gl)return;
    let frame=0,disposed=false,loaded=false,previous=0;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const compile=(type:number,source:string)=>{const shader=gl.createShader(type)!;gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);return null;}return shader;};
    const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
    if(!vs||!fs){if(vs)gl.deleteShader(vs);if(fs)gl.deleteShader(fs);return;}
    const program=gl.createProgram()!;gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);return;}
    gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const t=gl.getUniformLocation(program,'time'),a=gl.getUniformLocation(program,'activity'),m=gl.getUniformLocation(program,'mono'),r=gl.getUniformLocation(program,'resolution');
    gl.uniform1i(gl.getUniformLocation(program,'photo'),0);
    const image=new Image();
    const draw=(now:number)=>{
      if(disposed)return;
      // Cap this portrait at 30 fps and skip hidden-document work.
      if(loaded&&!document.hidden&&now-previous>32){
        previous=now;
        const w=Math.max(1,Math.round(canvas.clientWidth)),h=Math.max(1,Math.round(canvas.clientHeight));
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
        gl.uniform1f(t,reduced?0:now/1000);gl.uniform1f(a,speakingRef.current?1:0);gl.uniform1f(m,monoRef.current?1:0);gl.uniform2f(r,w,h);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      }
      frame=requestAnimationFrame(draw);
    };
    image.onload=()=>{if(disposed)return;gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);loaded=true;setReady(true);};
    image.src='/portraits/harry-cutout-v1.png';
    const contextLost=(event:Event)=>{event.preventDefault();setReady(false);cancelAnimationFrame(frame);};
    canvas.addEventListener('webglcontextlost',contextLost);
    frame=requestAnimationFrame(draw);
    return()=>{disposed=true;cancelAnimationFrame(frame);image.onload=null;canvas.removeEventListener('webglcontextlost',contextLost);gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);};
  },[]);
  return <div className="photo-transmission"><div className="photo-screen" role="img" aria-label="Pixelated photograph of Harry Webb"><img src="/portraits/harry-cutout-v1.png" alt="Harry Webb" style={{visibility:ready?'hidden':'visible'}} /><canvas ref={canvasRef} aria-hidden="true" style={{opacity:ready?1:0}} /></div><button className="phosphor-switch" aria-pressed={mono} onClick={()=>setMono(v=>!v)}>{mono?'● PHOSPHOR':'○ COLOUR'}</button></div>;
}
