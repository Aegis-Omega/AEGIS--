struct VertexOut {
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

// Deterministic noise — no samplers needed
fn hash21(p: vec2<f32>) -> f32 {
  let q = fract(p * vec2<f32>(127.1, 311.7));
  return fract((q.x + q.y * 19.19) * 43758.5453);
}

fn hash11(n: f32) -> f32 {
  return fract(sin(n) * 43758.5453);
}

// Starfield: sparse bright points across the field
fn stars(uv: vec2<f32>, density: f32) -> f32 {
  let scale  = 300.0 * density;
  let cell   = floor(uv * scale);
  let local  = fract(uv * scale) - 0.5;
  let h      = hash21(cell);
  let offset = vec2<f32>(hash11(h), hash11(h + 7.3)) - 0.5;
  let dist   = length(local - offset * 0.7);
  let bright = hash11(h + 13.1);
  // Only bright stars appear (top ~8%)
  return smoothstep(0.04, 0.0, dist) * step(0.92, bright) * (bright - 0.92) * 14.0;
}

// Soft radial arch glow centered in frame
fn arch_radial(uv: vec2<f32>, sigma: f32) -> f32 {
  let center = vec2<f32>(0.5, 0.45);
  let d = length(uv - center);
  // Ring at r≈0.32, width controlled by σ amplitude
  let ring_r   = 0.32 + sigma * 0.04;
  let ring_dist = abs(d - ring_r);
  return exp(-ring_dist * ring_dist * 80.0) * smoothstep(0.6, 0.0, d);
}

// Spiral galaxy arm pattern driven by uv position + λ
fn spiral_arm(uv: vec2<f32>, lambda: f32) -> f32 {
  let p = uv - vec2<f32>(0.5, 0.5);
  let angle = atan2(p.y, p.x);
  let r = length(p);
  let arm = sin(angle * 2.0 + r * 18.0 - lambda * 6.0);
  return smoothstep(0.0, 1.0, arm) * exp(-r * 4.5) * 0.6;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
  let dims  = vec2<i32>(i32(u.width) - 1, i32(u.height) - 1);
  let coord = clamp(
    vec2<i32>(in.uv * vec2<f32>(f32(u.width), f32(u.height))),
    vec2<i32>(0, 0),
    dims,
  );

  let sigma  = textureLoad(sigma_tex,  coord, 0).r;
  let rho    = textureLoad(rho_tex,    coord, 0).r;
  let lambda = textureLoad(lambda_tex, coord, 0).r;

  // Aspect-corrected UV for circular geometry
  let aspect = f32(u.width) / f32(u.height);
  let uv     = vec2<f32>(in.uv.x, 1.0 - in.uv.y);
  let uv_sq  = vec2<f32>((uv.x - 0.5) * aspect + 0.5, uv.y);

  // ── Background ─────────────────────────────────────────────────────────────
  let bg = vec3<f32>(0.006, 0.010, 0.038);

  // ── Starfield (two density layers for parallax feel) ──────────────────────
  let star1 = stars(uv, 1.0) * 0.9;
  let star2 = stars(uv * 1.618, 0.6) * 0.55;
  let star_color = vec3<f32>(0.85, 0.90, 1.00) * (star1 + star2);

  // ── Portal arch — teal glow from σ field ──────────────────────────────────
  let arch = arch_radial(uv_sq, sigma);
  let sigma_norm = (sigma + 1.0) * 0.5;  // map roughly to [0,1]
  let teal_arch  = vec3<f32>(0.08, 0.80, 0.90) * pow(max(sigma_norm, 0.0), 1.6) * 1.4;
  let arch_bloom = vec3<f32>(0.20, 0.70, 0.85) * arch * 2.5;

  // ── Nebula clouds — violet/pink from λ field ───────────────────────────────
  let lambda_n = clamp((lambda + 0.5) * 1.2, 0.0, 1.0);
  let violet   = vec3<f32>(0.50, 0.10, 0.90) * pow(lambda_n, 1.3) * 0.85;
  let pink_rim = vec3<f32>(0.80, 0.20, 0.60) * pow(lambda_n, 2.5) * 0.5;

  // ── Spiral galaxy arms driven by λ ────────────────────────────────────────
  let arm   = spiral_arm(uv_sq, lambda);
  let galaxy = vec3<f32>(0.55, 0.75, 1.00) * arm * 0.7;

  // ── Gold particle streams from ρ gradient edges ───────────────────────────
  let rho_sharp   = pow(rho, 1.4);
  let gold_bright = vec3<f32>(1.00, 0.72, 0.08) * rho_sharp * 2.8;
  let gold_soft   = vec3<f32>(0.80, 0.50, 0.05) * pow(rho, 0.6) * 0.35;

  // ── Iridescent zero-crossing rim (arch edge) ──────────────────────────────
  let rim = exp(-sigma * sigma * 6.0);
  let iridescent = vec3<f32>(0.40, 0.95, 0.90) * rim * 0.45;

  // ── Vignette ──────────────────────────────────────────────────────────────
  let vig_uv = uv - 0.5;
  let vignette = 1.0 - dot(vig_uv, vig_uv) * 1.6;

  // ── Composite (additive HDR) ───────────────────────────────────────────────
  let hdr = (bg + star_color + teal_arch + arch_bloom
             + violet + pink_rim + galaxy
             + gold_bright + gold_soft + iridescent)
            * clamp(vignette, 0.1, 1.0);

  // Reinhard extended — preserves colour saturation better than basic Reinhard
  let lum    = dot(hdr, vec3<f32>(0.2126, 0.7152, 0.0722));
  let mapped = hdr * (1.0 + lum * 0.15) / (1.0 + hdr);

  // Gamma 2.2
  let gamma = pow(clamp(mapped, vec3<f32>(0.0), vec3<f32>(1.0)), vec3<f32>(1.0 / 2.2));

  return vec4<f32>(gamma, 1.0);
}
