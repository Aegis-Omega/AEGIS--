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
  mouse_x         : f32,
  mouse_y         : f32,
  canvas_aspect   : f32,
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

fn hash21(p: vec2<f32>) -> f32 {
  let q = fract(p * vec2<f32>(127.1, 311.7));
  return fract((q.x + q.y * 19.19) * 43758.5453);
}

fn hash11(n: f32) -> f32 {
  return fract(sin(n) * 43758.5453);
}

// Starfield with per-star colour tint (blue, white, amber)
fn stars(uv: vec2<f32>, density: f32, time: f32) -> vec3<f32> {
  let scale  = 300.0 * density;
  let cell   = floor(uv * scale);
  let local  = fract(uv * scale) - 0.5;
  let h      = hash21(cell);
  let offset = vec2<f32>(hash11(h), hash11(h + 7.3)) - 0.5;
  let dist   = length(local - offset * 0.7);
  let bright = hash11(h + 13.1);
  let twinkle = 0.55 + 0.45 * sin(time * (2.0 + h * 3.7) + h * 61.3);
  let mag    = smoothstep(0.04, 0.0, dist) * step(0.92, bright) * (bright - 0.92) * 14.0 * twinkle;
  // Tint: cold blue, neutral white, warm amber based on hash
  let tint_h = hash11(h + 3.7);
  var color  = vec3<f32>(0.85, 0.90, 1.00);  // default cool white
  if (tint_h < 0.25) {
    color = vec3<f32>(0.65, 0.80, 1.00);     // blue giant
  } else if (tint_h > 0.75) {
    color = vec3<f32>(1.00, 0.88, 0.60);     // amber/yellow dwarf
  }
  return color * mag;
}

fn screen_dist(uv: vec2<f32>, center: vec2<f32>, inv_aspect: f32) -> f32 {
  let p = uv - center;
  return length(vec2<f32>(p.x * inv_aspect, p.y));
}

// Multi-ring portal: main bright ring + inner dim ring + faint outer halo
// Returns (ring_intensity, interior_factor) packed as vec2
fn arch_rings(uv: vec2<f32>, sigma: f32, time: f32, inv_aspect: f32) -> vec2<f32> {
  let center = vec2<f32>(0.5, 0.45);
  let d      = screen_dist(uv, center, inv_aspect);
  let ring_r = 0.32 + sigma * 0.04 + sin(time * 0.65) * 0.010;

  let main  = exp(-abs(d - ring_r)            * abs(d - ring_r)            * 80.0);
  let inner = exp(-abs(d - ring_r * 0.55)     * abs(d - ring_r * 0.55)     * 240.0) * 0.30;
  let outer = exp(-abs(d - ring_r * 1.30)     * abs(d - ring_r * 1.30)     * 35.0)  * 0.18;

  let rings = (main + inner + outer) * smoothstep(0.65, 0.0, d);
  let interior = 1.0 - smoothstep(0.0, ring_r * 0.48, d) * 0.38;
  return vec2<f32>(rings, interior);
}

// Analytical god rays — rotating radial light shafts from arch center
fn god_rays(uv: vec2<f32>, sigma: f32, time: f32, inv_aspect: f32) -> f32 {
  let center = vec2<f32>(0.5, 0.45);
  let p      = vec2<f32>((uv.x - center.x) * inv_aspect, uv.y - center.y);
  let angle  = atan2(p.y, p.x);
  let r      = length(p);
  let primary   = pow(max(0.0, sin(angle * 6.0 + time * 0.22)), 14.0);
  let secondary = pow(max(0.0, sin(angle * 6.0 + time * 0.22 + 0.52)), 14.0) * 0.4;
  let ray_mask  = primary + secondary;
  let near_arch = exp(-abs(r - 0.32) * 3.5) * 0.6 + exp(-r * 2.2) * 0.4;
  let sigma_amp = clamp((sigma + 1.0) * 0.6, 0.1, 1.0);
  return ray_mask * near_arch * sigma_amp * smoothstep(0.04, 0.10, r);
}

// Aurora curtains — undulating horizontal bands driven by λ
fn aurora(uv: vec2<f32>, lambda: f32, time: f32) -> vec3<f32> {
  let lambda_c = clamp((lambda + 0.4) * 1.4, 0.0, 1.0);
  let wave1  = sin(uv.x * 5.2 + time * 0.35 + lambda * 3.1) * 0.07
             + sin(uv.x * 2.7 - time * 0.19) * 0.04;
  let band1  = exp(-pow((uv.y - 0.28 - wave1) * 8.5, 2.0));
  let wave2  = sin(uv.x * 7.1 - time * 0.28 + lambda * 2.3) * 0.05
             + sin(uv.x * 3.4 + time * 0.14) * 0.03;
  let band2  = exp(-pow((uv.y - 0.14 - wave2) * 11.0, 2.0));

  let green_cyan  = vec3<f32>(0.05, 0.88, 0.62) * band1 * 0.70;
  let blue_violet = vec3<f32>(0.45, 0.12, 0.95) * band2 * 0.45;
  return (green_cyan + blue_violet) * lambda_c;
}

// Spiral galaxy arm
fn spiral_arm(uv: vec2<f32>, lambda: f32, time: f32, inv_aspect: f32) -> f32 {
  let p     = vec2<f32>((uv.x - 0.5) * inv_aspect, uv.y - 0.5);
  let angle = atan2(p.y, p.x);
  let r     = length(p);
  let arm   = sin(angle * 2.0 + r * 18.0 - lambda * 6.0 + time * 0.18);
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

  let uv         = vec2<f32>(in.uv.x, 1.0 - in.uv.y);
  let inv_aspect = 1.0 / max(u.canvas_aspect, 0.1);
  let time       = f32(u.frame) * 0.016;

  let bg = vec3<f32>(0.006, 0.010, 0.038);

  let star_color = stars(uv, 1.0, time) * 0.9
                 + stars(uv * 1.618, 0.6, time * 0.71) * 0.55;

  let arch_out   = arch_rings(uv, sigma, time, inv_aspect);
  let arch       = arch_out.x;
  let interior   = arch_out.y;
  let sigma_norm = (sigma + 1.0) * 0.5;
  let teal_arch  = vec3<f32>(0.08, 0.80, 0.90) * pow(max(sigma_norm, 0.0), 1.6) * 1.4 * interior;
  let arch_bloom = vec3<f32>(0.20, 0.70, 0.85) * arch * 2.5;

  let rays       = god_rays(uv, sigma, time, inv_aspect);
  let ray_color  = vec3<f32>(0.35, 0.80, 0.95) * rays * 1.2;

  let aurora_color = aurora(uv, lambda, time);

  let breathe  = sin(time * 0.28) * 0.5 + 0.5;
  let lambda_n = clamp((lambda + 0.5) * 1.2, 0.0, 1.0);
  let violet   = vec3<f32>(0.50 + breathe * 0.12, 0.08, 0.90 - breathe * 0.10)
                 * pow(lambda_n, 1.3) * 0.85;
  let pink_rim = vec3<f32>(0.80, 0.20 + breathe * 0.08, 0.60)
                 * pow(lambda_n, 2.5) * 0.5;

  let arm    = spiral_arm(uv, lambda, time, inv_aspect);
  let galaxy = vec3<f32>(0.55, 0.75, 1.00) * arm * 0.7;

  let rho_sharp   = pow(rho, 1.4);
  let gold_bright = vec3<f32>(1.00, 0.72, 0.08) * rho_sharp * 2.8;
  let gold_soft   = vec3<f32>(0.80, 0.50, 0.05) * pow(rho, 0.6) * 0.35;

  let rim        = exp(-sigma * sigma * 6.0);
  let iridescent = vec3<f32>(0.40, 0.95, 0.90) * rim * 0.45;

  var cursor_glow = vec3<f32>(0.0);
  if (u.mouse_x >= 0.0) {
    let hover     = u.mouse_y < 0.0;
    let actual_y  = select(u.mouse_y, -(u.mouse_y + 1.0), hover);
    let intensity = select(1.0, 0.40, hover);
    let m_uv      = vec2<f32>(u.mouse_x, 1.0 - actual_y);
    let m_dist    = length(uv - m_uv);
    let inner     = exp(-m_dist * m_dist * 800.0) * intensity;
    let outer     = exp(-m_dist * m_dist * 80.0) * 0.3 * intensity;
    cursor_glow   = vec3<f32>(1.00, 0.85, 0.50) * (inner + outer);
  }

  let vig_p    = vec2<f32>((uv.x - 0.5) * inv_aspect, uv.y - 0.5);
  let vignette = 1.0 - dot(vig_p, vig_p) * 1.6;

  let hdr = (bg + star_color + teal_arch + arch_bloom + ray_color
             + aurora_color + violet + pink_rim + galaxy
             + gold_bright + gold_soft + iridescent + cursor_glow)
            * clamp(vignette, 0.1, 1.0);

  let lum    = dot(hdr, vec3<f32>(0.2126, 0.7152, 0.0722));
  let mapped = hdr * (1.0 + lum * 0.15) / (1.0 + hdr);

  let gamma = pow(clamp(mapped, vec3<f32>(0.0), vec3<f32>(1.0)), vec3<f32>(1.0 / 2.2));

  return vec4<f32>(gamma, 1.0);
}
