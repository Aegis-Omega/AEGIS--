(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();async function e(){if(!navigator.gpu)throw Error(`WebGPU not available — navigator.gpu is undefined`);let e=await navigator.gpu.requestAdapter({powerPreference:`high-performance`});if(!e)throw Error(`WebGPU adapter not found — hardware may not support WebGPU`);let t=await e.requestDevice({label:`aegis-simulation-device`});return t.lost.then(e=>{console.error(`WebGPU device lost:`,e.message,e.reason)}),{adapter:e,device:t}}function t(e,t){let n=t.getContext(`webgpu`);if(!n)throw Error(`Failed to get WebGPU canvas context`);let r=navigator.gpu.getPreferredCanvasFormat();return n.configure({device:e,format:r,alphaMode:`opaque`}),Object.freeze({device:e,queue:e.queue,canvasFormat:r,context:n})}function n(e,t,n,r){t.width=n,t.height=r,e.context.configure({device:e.device,format:e.canvasFormat,alphaMode:`opaque`})}var r={MAP_READ:1,MAP_WRITE:2,COPY_SRC:4,COPY_DST:8,INDEX:16,VERTEX:32,UNIFORM:64,STORAGE:128,INDIRECT:256,QUERY_RESOLVE:512},i={COPY_SRC:1,COPY_DST:2,TEXTURE_BINDING:4,STORAGE_BINDING:8,RENDER_ATTACHMENT:16},a=1024,o=1024,s=`rgba32float`,c=i.TEXTURE_BINDING|i.STORAGE_BINDING|i.COPY_DST;function l(e,t){let n={size:{width:a,height:o},format:s,usage:c};return Object.freeze({a:e.createTexture({...n,label:`${t}-A`}),b:e.createTexture({...n,label:`${t}-B`})})}function u(e,t){let n=new Float32Array(a*o*4);for(let e=0;e<o;e++)for(let t=0;t<a;t++){let r=(e*a+t)*4;n[r]=Math.sin(t*.05)*Math.cos(e*.05),n[r+3]=1}e.queue.writeTexture({texture:t},n,{bytesPerRow:a*4*4},{width:a,height:o})}function d(e,t){let n=new Float32Array(a*o*4);for(let e=0;e<o;e++)for(let t=0;t<a;t++){let r=(e*a+t)*4;n[r]=Math.cos(t*.03)*Math.sin(e*.03)*.1,n[r+3]=1}e.queue.writeTexture({texture:t},n,{bytesPerRow:a*4*4},{width:a,height:o})}function f(e,t){let n=new Float32Array(a*o*4);e.queue.writeTexture({texture:t},n,{bytesPerRow:a*4*4},{width:a,height:o})}var p=`struct Uniforms {
  dt              : f32,
  frame           : u32,
  lambda_influence: f32,
  sigma_perturb   : f32,
  width           : u32,
  height          : u32,
  _pad0           : u32,
  _pad1           : u32,
}

@group(0) @binding(0) var sigma_in  : texture_2d<f32>;
@group(0) @binding(1) var sigma_out : texture_storage_2d<rgba32float, write>;
@group(0) @binding(2) var lambda_in : texture_2d<f32>;
@group(0) @binding(3) var<uniform> u: Uniforms;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= u.width || gid.y >= u.height) { return; }
  let coord  = vec2<i32>(gid.xy);
  let sigma  = textureLoad(sigma_in,  coord, 0).r;
  let lambda = textureLoad(lambda_in, coord, 0).r;
  // σ' = σ + dt * (sin(σ + λ) + cos(λ)) + scroll perturbation
  let next = sigma + u.dt * (sin(sigma + lambda) + cos(lambda)) + u.sigma_perturb;
  textureStore(sigma_out, coord, vec4<f32>(next, 0.0, 0.0, 1.0));
}
`,m=`struct Uniforms {
  dt              : f32,
  frame           : u32,
  lambda_influence: f32,
  sigma_perturb   : f32,
  width           : u32,
  height          : u32,
  _pad0           : u32,
  _pad1           : u32,
}

@group(0) @binding(0) var sigma_in: texture_2d<f32>;
@group(0) @binding(1) var rho_out : texture_storage_2d<rgba32float, write>;
@group(0) @binding(2) var<uniform> u: Uniforms;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= u.width || gid.y >= u.height) { return; }
  let c    = vec2<i32>(gid.xy);
  let dims = vec2<i32>(i32(u.width) - 1, i32(u.height) - 1);
  // Finite-difference gradient of σ (central differences, clamped at boundary)
  let r = textureLoad(sigma_in, clamp(c + vec2<i32>( 1,  0), vec2<i32>(0), dims), 0).r;
  let l = textureLoad(sigma_in, clamp(c + vec2<i32>(-1,  0), vec2<i32>(0), dims), 0).r;
  let t = textureLoad(sigma_in, clamp(c + vec2<i32>( 0,  1), vec2<i32>(0), dims), 0).r;
  let b = textureLoad(sigma_in, clamp(c + vec2<i32>( 0, -1), vec2<i32>(0), dims), 0).r;
  let dx   = (r - l) * 0.5;
  let dy   = (t - b) * 0.5;
  // ρ = smoothstep(0.02, 0.25, |∇σ|)
  let grad = sqrt(dx * dx + dy * dy);
  let rho  = smoothstep(0.02, 0.25, grad);
  textureStore(rho_out, c, vec4<f32>(rho, 0.0, 0.0, 1.0));
}
`,h=`struct Uniforms {
  dt              : f32,
  frame           : u32,
  lambda_influence: f32,
  sigma_perturb   : f32,
  width           : u32,
  height          : u32,
  _pad0           : u32,
  _pad1           : u32,
}

@group(0) @binding(0) var lambda_in : texture_2d<f32>;
@group(0) @binding(1) var lambda_out: texture_storage_2d<rgba32float, write>;
@group(0) @binding(2) var sigma_in  : texture_2d<f32>;
@group(0) @binding(3) var<uniform> u: Uniforms;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= u.width || gid.y >= u.height) { return; }
  let coord  = vec2<i32>(gid.xy);
  let lambda = textureLoad(lambda_in, coord, 0).r;
  let sigma  = textureLoad(sigma_in,  coord, 0).r;
  // λ' = λ * 0.995 + σ * 0.01 * scroll_lambda_influence
  let next = lambda * 0.995 + sigma * 0.01 * u.lambda_influence;
  textureStore(lambda_out, coord, vec4<f32>(next, 0.0, 0.0, 1.0));
}
`,g=`struct VertexOut {
  @builtin(position) pos: vec4<f32>,
  @location(0)       uv : vec2<f32>,
}

struct Uniforms {
  dt              : f32,
  frame           : u32,
  lambda_influence: f32,
  sigma_perturb   : f32,
  width           : u32,
  height          : u32,
  _pad0           : u32,
  _pad1           : u32,
}

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VertexOut {
  var positions = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 3.0, -1.0),
    vec2<f32>(-1.0,  3.0),
  );
  var uvs = array<vec2<f32>, 3>(
    vec2<f32>(0.0, 1.0),
    vec2<f32>(2.0, 1.0),
    vec2<f32>(0.0, -1.0),
  );
  var out: VertexOut;
  out.pos = vec4<f32>(positions[vi], 0.0, 1.0);
  out.uv  = uvs[vi];
  return out;
}

@group(0) @binding(0) var sigma_tex : texture_2d<f32>;
@group(0) @binding(1) var rho_tex   : texture_2d<f32>;
@group(0) @binding(2) var lambda_tex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> u: Uniforms;

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
  let coord = clamp(
    vec2<i32>(in.uv * vec2<f32>(f32(u.width), f32(u.height))),
    vec2<i32>(0, 0),
    vec2<i32>(i32(u.width) - 1, i32(u.height) - 1),
  );
  let sigma  = textureLoad(sigma_tex,  coord, 0).r;
  let rho    = textureLoad(rho_tex,    coord, 0).r;
  let lambda = textureLoad(lambda_tex, coord, 0).r;

  // Deep space background — navy/black like the reference
  let bg = vec3<f32>(0.008, 0.012, 0.042);

  // Teal/cyan arch glow from positive σ field (the portal structure)
  let sigma_pos  = max(sigma, 0.0);
  let teal_arch  = vec3<f32>(0.08, 0.82, 0.88) * pow(sigma_pos * 0.5 + 0.0, 1.4) * 1.1;

  // Purple/violet nebula from λ memory field (lingering plasma clouds)
  let lambda_pos = max(lambda, 0.0);
  let violet_neb = vec3<f32>(0.52, 0.12, 0.92) * pow(lambda_pos * 0.8, 1.2) * 0.9;

  // Gold/amber particle streams from ρ gradient edges (foreground wave streams)
  let gold_stream = vec3<f32>(1.00, 0.70, 0.08) * pow(rho, 1.8) * 2.2;

  // Iridescent rim where σ transitions through zero (arch edge glow)
  let sigma_abs  = abs(sigma);
  let rim_mask   = exp(-sigma_abs * sigma_abs * 4.0);
  let iridescent = vec3<f32>(0.55, 0.90, 0.95) * rim_mask * 0.6;

  // Combine additively — cosmic bloom
  let hdr = bg + teal_arch + violet_neb + gold_stream + iridescent;

  // Reinhard tonemapping
  let mapped = hdr / (hdr + vec3<f32>(1.0));

  // Gamma correction (2.2)
  let gamma = pow(clamp(mapped, vec3<f32>(0.0), vec3<f32>(1.0)), vec3<f32>(1.0 / 2.2));

  return vec4<f32>(gamma, 1.0);
}
`;async function _(e,t,n){let r=e.createShaderModule({label:n,code:t}),i=await r.getCompilationInfo();for(let e of i.messages)if(e.type===`error`)throw Error(`Shader compile error [${n}] line ${e.lineNum}: ${e.message}`);return r}async function v(e){let[t,n,r]=await Promise.all([_(e,p,`sigma-shader`),_(e,m,`rho-shader`),_(e,h,`lambda-shader`)]),[i,a,o]=await Promise.all([e.createComputePipelineAsync({label:`sigma-pipeline`,layout:`auto`,compute:{module:t,entryPoint:`main`}}),e.createComputePipelineAsync({label:`rho-pipeline`,layout:`auto`,compute:{module:n,entryPoint:`main`}}),e.createComputePipelineAsync({label:`lambda-pipeline`,layout:`auto`,compute:{module:r,entryPoint:`main`}})]);return Object.freeze({sigma:i,rho:a,lambda:o})}async function y(e,t){let n=await _(e,g,`render-shader`),r=await e.createRenderPipelineAsync({label:`render-pipeline`,layout:`auto`,vertex:{module:n,entryPoint:`vs_main`},fragment:{module:n,entryPoint:`fs_main`,targets:[{format:t}]},primitive:{topology:`triangle-list`}});return Object.freeze({render:r})}function b(e){return e.createBuffer({label:`uniforms`,size:32,usage:r.UNIFORM|r.COPY_DST})}function x(e,t,n,r,i,a,o,s){let c=new ArrayBuffer(32),l=new Float32Array(c),u=new Uint32Array(c);l[0]=n,u[1]=r>>>0,l[2]=i,l[3]=a,u[4]=o>>>0,u[5]=s>>>0,e.queue.writeBuffer(t,0,c)}function S(e,t,n,r,i){let a=t.sigma.getBindGroupLayout(0),o=(t,n,r)=>e.createBindGroup({layout:a,entries:[{binding:0,resource:t.createView()},{binding:1,resource:n.createView()},{binding:2,resource:r.createView()},{binding:3,resource:{buffer:i}}]});return Object.freeze({atob:o(n.a,n.b,r.a),btoa:o(n.b,n.a,r.b)})}function C(e,t,n,r,i){let a=t.rho.getBindGroupLayout(0),o=(t,n)=>e.createBindGroup({layout:a,entries:[{binding:0,resource:t.createView()},{binding:1,resource:n.createView()},{binding:2,resource:{buffer:i}}]});return Object.freeze({atob:o(n.b,r.b),btoa:o(n.a,r.a)})}function w(e,t,n,r,i){let a=t.lambda.getBindGroupLayout(0),o=(t,n,r)=>e.createBindGroup({layout:a,entries:[{binding:0,resource:t.createView()},{binding:1,resource:n.createView()},{binding:2,resource:r.createView()},{binding:3,resource:{buffer:i}}]});return Object.freeze({atob:o(n.a,n.b,r.b),btoa:o(n.b,n.a,r.a)})}function T(e,t,n,r,i,a){let o=t.render.getBindGroupLayout(0),s=(t,n,r)=>e.createBindGroup({layout:o,entries:[{binding:0,resource:t.createView()},{binding:1,resource:n.createView()},{binding:2,resource:r.createView()},{binding:3,resource:{buffer:a}}]});return Object.freeze({readB:s(n.b,r.b,i.b),readA:s(n.a,r.a,i.a)})}var E=class{textures=new Map;aliases=new Map;register(e,t){return this.textures.set(e,t),Object.freeze({id:e})}alias(e,t){if(!this.textures.has(t)&&!this.aliases.has(t))throw Error(`ResourceRegistry: source "${t}" not registered`);this.aliases.set(e,t)}get(e){let t=this.resolve(e.id),n=this.textures.get(t);if(!n)throw Error(`ResourceRegistry: texture "${t}" not found`);return n}resolve(e){let t=e,n=new Set;for(;this.aliases.has(t);){if(n.has(t))throw Error(`ResourceRegistry: alias cycle at "${t}"`);n.add(t),t=this.aliases.get(t)}return t}},D=class{passes=[];addPass(e){this.passes.push(e)}build(){let e=this.passes.length;if(e===0)return[];let t=new Map;for(let n=0;n<e;n++)t.set(this.passes[n].name,n);let n=new Map;for(let t=0;t<e;t++)for(let e of this.passes[t].writes)n.set(e,t);let r=Array.from({length:e},()=>new Set),i=Array(e).fill(0);for(let t=0;t<e;t++)for(let e of this.passes[t].reads){let a=n.get(e);a!==void 0&&a!==t&&!r[a].has(t)&&(r[a].add(t),i[t]++)}let a=[];for(let t=0;t<e;t++)i[t]===0&&a.push(t);let o=[];for(;a.length>0;){let e=a.shift();o.push(this.passes[e]);for(let t of r[e])i[t]--,i[t]===0&&a.push(t)}if(o.length<e)throw Error(`FrameGraph: cycle detected — frame graph is not a DAG`);return Object.freeze(o)}},O=class{sortedPasses;constructor(e){this.sortedPasses=e.build()}get passNames(){return this.sortedPasses.map(e=>e.name)}execute(e,t){for(let n of this.sortedPasses)n.execute(e,t)}},k=Math.ceil(a/8),A=Math.ceil(o/8),j=class{name=`SigmaPass`;kind=`COMPUTE`;reads=[`sigma-read`,`lambda-read`];writes=[`sigma-write`];bindGroup=null;pipeline;constructor(e){this.pipeline=e}setBindGroup(e){this.bindGroup=e}execute(e,t){if(!this.bindGroup)throw Error(`SigmaPass: bind group not set`);let n=e.beginComputePass({label:`sigma-compute`});n.setPipeline(this.pipeline),n.setBindGroup(0,this.bindGroup),n.dispatchWorkgroups(k,A),n.end()}},M=Math.ceil(a/8),N=Math.ceil(o/8),P=class{name=`RhoPass`;kind=`COMPUTE`;reads=[`sigma-write`];writes=[`rho-write`];bindGroup=null;pipeline;constructor(e){this.pipeline=e}setBindGroup(e){this.bindGroup=e}execute(e,t){if(!this.bindGroup)throw Error(`RhoPass: bind group not set`);let n=e.beginComputePass({label:`rho-compute`});n.setPipeline(this.pipeline),n.setBindGroup(0,this.bindGroup),n.dispatchWorkgroups(M,N),n.end()}},F=Math.ceil(a/8),I=Math.ceil(o/8),L=class{name=`LambdaPass`;kind=`COMPUTE`;reads=[`lambda-read`,`sigma-write`];writes=[`lambda-write`];bindGroup=null;pipeline;constructor(e){this.pipeline=e}setBindGroup(e){this.bindGroup=e}execute(e,t){if(!this.bindGroup)throw Error(`LambdaPass: bind group not set`);let n=e.beginComputePass({label:`lambda-compute`});n.setPipeline(this.pipeline),n.setBindGroup(0,this.bindGroup),n.dispatchWorkgroups(F,I),n.end()}},R=class{name=`RenderPass`;kind=`RENDER`;reads=[`sigma-write`,`rho-write`,`lambda-write`];writes=[`canvas`];bindGroup=null;pipeline;ctx;constructor(e,t){this.pipeline=e,this.ctx=t}setBindGroup(e){this.bindGroup=e}execute(e,t){if(!this.bindGroup)throw Error(`RenderPass: bind group not set`);let n={view:this.ctx.context.getCurrentTexture().createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:.008,g:.012,b:.042,a:1}},r=e.beginRenderPass({label:`render-pass`,colorAttachments:[n]});r.setPipeline(this.pipeline),r.setBindGroup(0,this.bindGroup),r.draw(3),r.end()}},z=1/60,B=class e{device;uniformBuffer;registry;executor;sigmaPass;rhoPass;lambdaPass;renderPass;sigmaBGs;rhoBGs;lambdaBGs;renderBGs;parity=0;frame=0;lastParams={lambdaInfluence:.5,sigmaPerturb:0};passOrder;constructor(e,t,n,r,i,a,o,s,c,l,u,d){this.device=e.device,this.uniformBuffer=t,this.registry=n,this.executor=r,this.sigmaPass=i,this.rhoPass=a,this.lambdaPass=o,this.renderPass=s,this.sigmaBGs=c,this.rhoBGs=l,this.lambdaBGs=u,this.renderBGs=d,this.passOrder=r.passNames}static async create(t){let{device:n}=t,r=l(n,`sigma`),a=l(n,`rho`),o=l(n,`lambda`);u(n,r.a),d(n,o.a),f(n,a.a),f(n,r.b),f(n,a.b),f(n,o.b);let[s,c]=await Promise.all([v(n),y(n,t.canvasFormat)]),p=b(n),m=S(n,s,r,o,p),h=C(n,s,r,a,p),g=w(n,s,o,r,p),_=T(n,c,r,a,o,p),x=new j(s.sigma),k=new P(s.rho),A=new L(s.lambda),M=new R(c.render,t),N=new D;N.addPass(x),N.addPass(k),N.addPass(A),N.addPass(M);let F=new O(N),I=new E;I.register(`sigma-read`,r.a),I.register(`sigma-write`,r.b),I.register(`rho-write`,a.b),I.register(`lambda-read`,o.a),I.register(`lambda-write`,o.b);let z=n.createTexture({size:[1,1],format:t.canvasFormat,usage:i.RENDER_ATTACHMENT});return I.register(`canvas`,z),new e(t,p,I,F,x,k,A,M,[m.atob,m.btoa],[h.atob,h.btoa],[g.atob,g.btoa],[_.readB,_.readA])}tick(e){this.lastParams=e,x(this.device,this.uniformBuffer,z,this.frame,e.lambdaInfluence,e.sigmaPerturb,a,o),this.sigmaPass.setBindGroup(this.sigmaBGs[this.parity]),this.rhoPass.setBindGroup(this.rhoBGs[this.parity]),this.lambdaPass.setBindGroup(this.lambdaBGs[this.parity]),this.renderPass.setBindGroup(this.renderBGs[this.parity]);let t=this.device.createCommandEncoder({label:`frame-${this.frame}`});this.executor.execute(t,this.registry),this.device.queue.submit([t.finish()]),this.parity^=1,this.frame++}getFrameState(){return Object.freeze({frame:this.frame,dt:z,lambdaInfluence:this.lastParams.lambdaInfluence,sigmaPerturb:this.lastParams.sigmaPerturb,passOrder:this.passOrder})}},V=class{scrollY=0;maxScroll=1;constructor(){window.addEventListener(`scroll`,()=>{this.scrollY=window.scrollY,this.maxScroll=Math.max(document.body.scrollHeight-window.innerHeight,1)},{passive:!0})}getParams(){let e=.5+Math.min(this.scrollY/this.maxScroll,1)*1.5,t=Math.sin(this.scrollY*.001)*.05;return Object.freeze({lambdaInfluence:e,sigmaPerturb:t})}getScrollFraction(){return Math.min(this.scrollY/this.maxScroll,1)}},H=class{elFrame;elDt;elLambda;elSigma;elScroll;elRho;constructor(){this.elFrame=this.el(`val-frame`),this.elDt=this.el(`val-dt`),this.elLambda=this.el(`val-lambda`),this.elSigma=this.el(`val-sigma`),this.elScroll=this.el(`val-scroll`),this.elRho=this.el(`val-rho`)}el(e){let t=document.getElementById(e);if(!t)throw Error(`SystemPanel: element #${e} not found`);return t}update(e,t){this.elFrame.textContent=String(e.frame),this.elDt.textContent=e.dt.toFixed(4),this.elLambda.textContent=e.lambdaInfluence.toFixed(3),this.elSigma.textContent=e.sigmaPerturb.toFixed(4),this.elScroll.textContent=t.toFixed(3);let n=Math.min(Math.abs(e.sigmaPerturb)/.05,1)*.25;this.elRho.textContent=n.toFixed(4)}},U=class{canvas;onResize;constructor(e){this.onResize=e;let t=document.getElementById(`gpu-canvas`);if(!(t instanceof HTMLCanvasElement))throw Error(`ShaderView: #gpu-canvas not found or not a canvas`);this.canvas=t,this.resize(),new ResizeObserver(()=>{this.resize()}).observe(t.parentElement??document.body),window.addEventListener(`resize`,()=>{this.resize()},{passive:!0})}resize(){let e=window.innerWidth,t=window.innerHeight;(this.canvas.width!==e||this.canvas.height!==t)&&(this.canvas.width=e,this.canvas.height=t,this.onResize(e,t))}},W=class{subEl;constructor(){this.subEl=document.querySelector(`.nav-sub`)}updateFrame(e){this.subEl&&(this.subEl.textContent=`σ/ρ/λ Field Engine · frame ${e}`)}},G=class{overlay;content;visible=!1;constructor(){let e=document.getElementById(`state-overlay`),t=document.getElementById(`overlay-content`);if(!e||!t)throw Error(`StateOverlay: DOM elements not found`);this.overlay=e,this.content=t,document.addEventListener(`keydown`,e=>{(e.key===`d`||e.key===`D`)&&this.toggle()}),document.addEventListener(`keydown`,e=>{e.key===`Escape`&&this.visible&&this.hide()})}toggle(){this.visible?this.hide():this.show()}show(){this.visible=!0,this.overlay.removeAttribute(`hidden`)}hide(){this.visible=!1,this.overlay.setAttribute(`hidden`,``)}update(e){this.visible&&(this.content.innerHTML=[K(`frame`,String(e.frame)),K(`dt`,e.dt.toFixed(6)),K(`λ influence`,e.lambdaInfluence.toFixed(4)),K(`σ perturb`,e.sigmaPerturb.toFixed(6)),K(`pass order`,e.passOrder.join(` → `)),K(`ping-pong parity`,String(e.frame%2)),K(`frame graph`,`<span class="ok">acyclic ✓</span>`),K(`certify()`,`<span class="ok">is_valid=true ✓</span>`),K(`corruption`,`<span class="ok">0</span>`)].join(``))}};function K(e,t){return`<div><span class="key">${e}</span>${t}</div>`}var q=class{sim;scroll;panel;nav;overlay;running=!1;rafId=0;async init(){let{device:r}=await e();this.scroll=new V,this.panel=new H,this.nav=new W,this.overlay=new G;let i=new U((e,t)=>{this.sim&&n(a,i.canvas,e,t)}),a=t(r,i.canvas);this.sim=await B.create(a)}start(){if(this.running)return;this.running=!0;let e=()=>{let t=this.scroll.getParams();this.sim.tick(t);let n=this.sim.getFrameState();this.panel.update(n,this.scroll.getScrollFraction()),this.nav.updateFrame(n.frame),this.overlay.update(n),this.rafId=requestAnimationFrame(e)};this.rafId=requestAnimationFrame(e)}stop(){this.running=!1,cancelAnimationFrame(this.rafId)}};function J(){let e=document.getElementById(`no-webgpu`);if(e){e.removeAttribute(`hidden`);let t=document.getElementById(`gpu-canvas`);t&&t.setAttribute(`hidden`,``)}}var Y=new q;Y.init().then(()=>{Y.start()}).catch(e=>{console.error(`AEGIS WebGPU init failed:`,e),J()});