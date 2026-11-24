/**
 * An image paint's adjustments as a Skia runtime shader over the image, matched to Figma's
 * exports pixel for pixel (within one level of 8 bits). Each pixel, unpremultiplied and in
 * gamma 2.2 light, goes through three steps in Figma's order:
 *
 * 1. Temperature, tint, and contrast in CIELab: a* and b* shift, and contrast moves L*.
 * 2. Exposure, highlights, and shadows in one pass: a Reinhard-type curve per channel whose
 *    strength is exposure plus highlights and shadows weighed by the pixel's original luminance.
 * 3. Saturation, scaling the colour's distance from its luminance.
 */

import type { RuntimeEffect, Shader } from 'canvaskit-wasm'

import type { ImageFilters } from '@pairdraw/scene-graph'

import type { SkiaRenderer } from '#core/canvas/renderer'

/**
 * The shader, held here rather than in a `.sksl` file behind a `?raw` import: Vite and Bun resolve
 * that query, but Playwright's spec transform reads such a file as JavaScript, which stops the e2e
 * suite from collecting any spec that reaches this module.
 */
// oxlint-disable-next-line pairdraw/no-hand-rolled-color -- SkSL's own function names (`encodeSrgb(`) are not CSS colors
const adjustmentsSource = `
uniform shader image;

// The plugin API's values, each from -1 to 1; contrast is the panel's, not the archive's 0.3 of it.
uniform float exposure;
uniform float contrast;
uniform float saturation;
uniform float temperature;
uniform float tint;
uniform float highlights;
uniform float shadows;

const float GAMMA = 2.2;
const float3 LUMA = float3(0.2126, 0.7152, 0.0722);
// Highlights act above, and shadows below, an encoded luminance of one half.
const float PIVOT = 0.21763764; // pow(0.5, 2.2)

float3 encodeSrgb(float3 l) {
  l = max(l, 0.0);
  return mix(12.92 * l, 1.055 * pow(l, float3(1.0 / 2.4)) - 0.055, step(0.0031308, l));
}

float3 decodeSrgb(float3 s) {
  return mix(s / 12.92, pow((s + 0.055) / 1.055, float3(2.4)), step(0.04045, s));
}

float3 toLinear(float3 s) { return pow(max(s, 0.0), float3(GAMMA)); }
float3 toEncoded(float3 l) { return pow(clamp(l, 0.0, 1.0), float3(1.0 / GAMMA)); }

// CIELab over D65 with a plain cube root, which has no linear segment near black.
const float3 WHITE = float3(0.95047, 1.0, 1.08883);
const float3x3 RGB_TO_XYZ = float3x3(
  0.4124564, 0.2126729, 0.0193339,
  0.3575761, 0.7151522, 0.1191920,
  0.1804375, 0.0721750, 0.9503041);
const float3x3 XYZ_TO_RGB = float3x3(
  3.2404542, -0.9692660, 0.0556434,
  -1.5371385, 1.8760108, -0.2040259,
  -0.4985314, 0.0415560, 1.0572252);

float3 toLab(float3 l) {
  float3 f = pow(max(RGB_TO_XYZ * l / WHITE, 0.0), float3(1.0 / 3.0));
  return float3(116.0 * f.y - 16.0, 500.0 * (f.x - f.y), 200.0 * (f.y - f.z));
}

float3 fromLab(float3 lab) {
  float fy = (lab.x + 16.0) / 116.0;
  float3 f = float3(fy + lab.y / 500.0, fy, fy - lab.z / 200.0);
  return clamp(XYZ_TO_RGB * (f * f * f * WHITE), 0.0, 1.0);
}

float smootherstep(float edge0, float edge1, float x) {
  float u = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return u * u * u * (u * (6.0 * u - 15.0) + 10.0);
}

// Temperature and tint move the colour along b* and a*, 30 at full strength. Contrast moves L* a
// stored 0.3 of the way: above 0 toward an S-curve from 20 to 80, below it toward 50 at 0.8 of that.
float3 adjustLab(float3 l) {
  float3 lab = toLab(l);
  float weight = 0.3 * contrast;
  lab.x += weight > 0.0
    ? weight * (100.0 * smootherstep(20.0, 80.0, lab.x) - lab.x)
    : 0.8 * weight * (lab.x - 50.0);
  return fromLab(lab + float3(0.0, 30.0 * tint, 30.0 * temperature));
}

// Exposure as strength w: the colour, desaturated to a quarter, goes through a Reinhard-type
// curve with gain 100^w per channel and is saturated again by 4 around the curved luminance.
// Darkening also lowers white and holds back the saturation of light colours.
float3 expose(float3 l, float luminance, float w) {
  float gain = pow(100.0, w);
  float scale = 1.0 + min(w, 0.0) / 16.0;
  float darken = -min(w, 0.0);
  float resaturation = 4.0 - 15.0 * darken * luminance * luminance / (1.0 + 5.0 * darken);
  float3 p = scale * (luminance + (l - luminance) / 4.0);
  float3 curved = gain * p / (1.0 + (gain - 1.0) * p);
  float y = scale * luminance;
  float curvedLuminance = gain * y / (1.0 + (gain - 1.0) * y);
  return clamp(curvedLuminance + resaturation * (curved - curvedLuminance), 0.0, 1.0);
}

// How much of highlights' strength reaches a pixel, from how far its luminance is from the pivot
// to white: about 0.59 of that just above the pivot, easing to 0.31 at white.
float highlightWeight(float luminance) {
  if (luminance <= PIVOT) return 0.0;
  float y = (luminance - PIVOT) / (1.0 - PIVOT);
  return y * (0.58594 + y * (0.02724 + y * (-0.98021 + y * (1.04097 - 0.35904 * y))));
}

// How much of shadows' strength reaches a pixel, from its luminance below the pivot.
float shadowWeight(float luminance) {
  if (luminance >= PIVOT) return 0.0;
  float t = 1.0 - luminance / PIVOT;
  return 0.14945 * t * (1.0 + 0.09266 * (1.0 - pow(t, 1.79578)));
}

// Saturation scales the distance from luminance: by 1 + saturation below 0, and above it moves a
// share of the way to the most saturated colour in gamut, at most twice as far out.
float3 applySaturation(float3 l) {
  float luminance = dot(l, LUMA);
  float k = 1.0 + saturation;
  if (saturation > 0.0) {
    // The furthest the colour can move from its luminance before a channel leaves [0, 1].
    float most = 1e9;
    for (int i = 0; i < 3; i++) {
      float d = l[i] - luminance;
      if (d > 1e-9) most = min(most, (1.0 - luminance) / d);
      if (d < -1e-9) most = min(most, luminance / -d);
    }
    k = min(2.0, 1.0 + saturation * (most - 1.0));
  }
  return clamp(luminance + k * (l - luminance), 0.0, 1.0);
}

half4 main(float2 position) {
  float4 color = image.eval(position);
  if (color.a <= 0.0) return half4(color);
  float3 l = toLinear(encodeSrgb(toLinearSrgb(color.rgb / color.a)));
  // Highlights and shadows weigh each pixel by its luminance before contrast moves it.
  float original = dot(l, LUMA);
  if (contrast != 0.0 || temperature != 0.0 || tint != 0.0) l = adjustLab(l);
  float strength = exposure + highlights * highlightWeight(original) + shadows * shadowWeight(original);
  if (strength != 0.0) l = expose(l, dot(l, LUMA), strength);
  if (saturation != 0.0) l = applySaturation(l);
  return half4(float4(fromLinearSrgb(decodeSrgb(toEncoded(l))) * color.a, color.a));
}
`

/** The adjustment uniforms in the shader's declaration order. */
const FILTER_UNIFORMS = [
  'exposure',
  'contrast',
  'saturation',
  'temperature',
  'tint',
  'highlights',
  'shadows'
] as const satisfies ReadonlyArray<keyof ImageFilters>

/** Whether `filters` changes any pixel. */
export function hasImageAdjustments(filters: ImageFilters | undefined): filters is ImageFilters {
  return !!filters && Object.values(filters).some((value) => value !== undefined && value !== 0)
}

/**
 * The compiled adjustments effect per CanvasKit: compiled once, not per draw, and freed with the
 * renderer that made it. The filter over an image is a runtime-effect shader made from it, which
 * Skia builds cheaply; the expensive part, compiling the SkSL, happens once.
 */
const effects = new WeakMap<SkiaRenderer['ck'], RuntimeEffect>()

function adjustmentsEffect(r: SkiaRenderer): RuntimeEffect {
  const cached = effects.get(r.ck)
  if (cached) return cached
  let error = ''
  const effect = r.ck.RuntimeEffect.Make(adjustmentsSource, (message) => {
    error = message
  })
  if (!effect) throw new Error(`Cannot compile the image adjustments: ${error}`)
  effects.set(r.ck, effect)
  return effect
}

/** Frees the adjustments effect a CanvasKit holds, as its renderer is destroyed. */
export function releaseImageAdjustments(ck: SkiaRenderer['ck']): void {
  effects.get(ck)?.delete()
  effects.delete(ck)
}

/**
 * `image` with `filters` applied to every pixel. The caller owns both shaders: it deletes the
 * returned shader after setting it on the paint, and the image shader under it, as the plain
 * image path does. The effect the filter is made from is compiled once per CanvasKit and cached,
 * so a redraw never recompiles the SkSL.
 */
export function adjustedImageShader(r: SkiaRenderer, image: Shader, filters: ImageFilters): Shader {
  const values = FILTER_UNIFORMS.map((name) => filters[name] ?? 0)
  return adjustmentsEffect(r).makeShaderWithChildren(values, [image])
}
