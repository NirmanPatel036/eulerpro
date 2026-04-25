'use client';

import { useEffect, useRef } from 'react';

/* ─────────────────────────────────────────────────────────────
   Minimal WebGL shader: animated noise aurora in brand colours
───────────────────────────────────────────────────────────── */
const VERT = `
attribute vec2 a_position;
void main(){gl_Position=vec4(a_position,0.,1.);}
`;

const FRAG = `
precision highp float;
uniform float u_time;
uniform vec2  u_res;

// ── simplex-like 2-D noise ──────────────────────────────────
vec2 hash(vec2 p){
  p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));
  return -1.+2.*fract(sin(p)*43758.5453123);
}
float noise(vec2 p){
  const float K1=.366025404;
  const float K2=.211324865;
  vec2 i=floor(p+(p.x+p.y)*K1);
  vec2 a=p-i+(i.x+i.y)*K2;
  vec2 o=(a.x>a.y)?vec2(1.,0.):vec2(0.,1.);
  vec2 b=a-o+K2;
  vec2 c=a-1.+2.*K2;
  vec3 h=max(.5-vec3(dot(a,a),dot(b,b),dot(c,c)),0.);
  vec3 n=h*h*h*h*vec3(dot(a,hash(i)),dot(b,hash(i+o)),dot(c,hash(i+vec2(1.))));
  return dot(n,vec3(70.));
}
float fbm(vec2 p){
  return .5000*noise(p)
        +.2500*noise(p*2.02)
        +.1250*noise(p*4.01)
        +.0625*noise(p*8.03);
}

// ── brand palette  ─────────────────────────────────────────
vec3 brand0=vec3(0.294,0.247,0.914);  // #4b3fe9
vec3 brand1=vec3(0.482,0.439,0.941);  // #7b70f0
vec3 brand2=vec3(0.667,0.545,0.980);  // #aa8bfa
vec3 white =vec3(0.980,0.980,1.000);

void main(){
  vec2 uv=(gl_FragCoord.xy-.5*u_res)/min(u_res.x,u_res.y);

  float t=u_time*.18;

  // warped fbm layers
  vec2 q=vec2(fbm(uv+t*.4),fbm(uv+vec2(5.2,1.3)+t*.3));
  vec2 r=vec2(fbm(uv+2.*q+vec2(1.7,9.2)+t*.2),
              fbm(uv+2.*q+vec2(8.3,2.8)+t*.15));
  float f=fbm(uv+2.4*r+t*.1);

  // remap to [0,1] with contrast
  f=.5+.5*f;
  f=pow(f,1.6);

  // mix colours
  vec3 col=mix(brand0,brand1,clamp(f*2.,0.,1.));
  col     =mix(col,   brand2,clamp(f*2.-1.,0.,1.));
  col     =mix(col,   white, clamp(f*3.-2.,0.,1.));

  // soft vignette so edges fade to transparent
  float vign=1.-smoothstep(.3,.9,length(uv*vec2(.8,1.)));
  float alpha=vign*smoothstep(0.,.15,f)*0.55;

  gl_FragColor=vec4(col*alpha, alpha);
}
`;

function initGL(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', { premultipliedAlpha: false });
    if (!gl) return null;

    function shader(type: number, src: string) {
        const s = gl!.createShader(type)!;
        gl!.shaderSource(s, src);
        gl!.compileShader(s);
        return s;
    }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const loc = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_res');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    return { gl, uTime, uRes };
}

export default function HeroShader() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = initGL(canvas);
        if (!ctx) return;
        const { gl, uTime, uRes } = ctx;

        let raf = 0;
        let start = performance.now();

        function resize() {
            const w = canvas!.offsetWidth * devicePixelRatio;
            const h = canvas!.offsetHeight * devicePixelRatio;
            canvas!.width = w;
            canvas!.height = h;
            gl.viewport(0, 0, w, h);
        }

        const ro = new ResizeObserver(resize);
        ro.observe(canvas);
        resize();

        function frame() {
            const t = (performance.now() - start) / 1000;
            gl.uniform1f(uTime, t);
            gl.uniform2f(uRes, canvas!.width, canvas!.height);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            raf = requestAnimationFrame(frame);
        }
        raf = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ display: 'block' }}
        />
    );
}
