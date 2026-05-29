// EPISTEMIC TIER: T2 (engineering hypothesis) — φ holographic correspondence
// WGSL fragment shader: dual-eigenvalue φ projection onto a 2D substrate.
// Expansion axis:   cos(x·φ + y·INV_PHI), sin(y·φ - x·INV_PHI)
// Contraction axis: cos(x·INV_PHI - y·φ), sin(y·INV_PHI + x·φ)
// Superposition → interference pattern → smoothstep ring render.
// R = macro (φ channel) · G = micro (INV_PHI channel) · B = intensity.

export const HOLOGRAPHIC_SHADER_WGSL = /* wgsl */`
struct Uniforms {
  time:       f32,
  resolution: vec2<f32>,
  padding:    f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4<f32> {
  let x = f32((vi & 1u) << 1u) - 1.0;
  let y = f32((vi & 2u))       - 1.0;
  return vec4<f32>(x, y, 0.0, 1.0);
}

const PHI:     f32 = 1.61803398875;
const INV_PHI: f32 = 0.61803398875;

@fragment
fn fs_main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  let st = (pos.xy - u.resolution * 0.5) / min(u.resolution.x, u.resolution.y);
  let t  = u.time * 0.3;

  // Expansion eigenvector (φ scale)
  let ex = vec2<f32>(
    cos(st.x * PHI     + st.y * INV_PHI + t),
    sin(st.y * PHI     - st.x * INV_PHI + t * 0.7)
  );

  // Contraction eigenvector (INV_PHI scale)
  let cx = vec2<f32>(
    cos(st.x * INV_PHI - st.y * PHI     - t * 0.5),
    sin(st.y * INV_PHI + st.x * PHI     + t * 1.1)
  );

  // Superposition — interference amplitude
  let psi = ex + cx;
  let amp = length(psi);          // ∈ [0, 2√2]

  // Interference fringes — two nested smoothstep rings
  let edge = fract(amp * INV_PHI);
  let fringe = smoothstep(0.2, 0.25, edge) * (1.0 - smoothstep(0.25, 0.3, edge));

  // φ-channel separation
  let macro_ch = dot(ex, ex) * 0.5;   // R — φ dominant
  let micro_ch = dot(cx, cx) * 0.5;   // G — INV_PHI dominant
  let intensity = fringe * (0.6 + 0.4 * sin(amp * PHI + t));

  return vec4<f32>(
    macro_ch * intensity,
    micro_ch * intensity,
    intensity * INV_PHI,
    1.0
  );
}
`
