const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const GLASS_STYLE = {
  width: 385,
  height: 170,
  tintR: 0.968,
  tintG: 1.0,
  tintB: 0.878,
  saturation: 1.0,
  distortion: 3.0,
  blur: 3.0,
  iconSize: 0.35,
  iconColorR: 1,
  iconColorG: 1,
  iconColorB: 1,
  shadowIntensity: 0.3,
  shadowOffsetX: 5,
  shadowOffsetY: 5,
  shadowBlur: 30,
  cornerRadius: 170,
  chromaticAberration: 1.0,
  donutThickness: 0.3,
  starPoints: 5,
  starInnerRadius: 0.4,
};

function fragmentShaderSource(useDerivatives) {
  return `
#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform sampler2D u_texture;
uniform float u_width;
uniform float u_height;
uniform vec3 u_tint;
uniform float u_saturation;
uniform float u_distortion;
uniform float u_blur;
uniform float u_imageAspect;
uniform float u_canvasAspect;
uniform float u_glassMode;
uniform float u_shadowIntensity;
uniform vec2 u_shadowOffset;
uniform float u_shadowBlur;
uniform float u_cornerRadius;
uniform float u_chromaticAberration;
uniform float u_shape;
uniform float u_donutThickness;
uniform float u_starPoints;
uniform float u_starInnerRadius;
uniform float u_seamless;
varying vec2 v_texCoord;
#define PI 3.141592653589793

vec2 getCoverUV(vec2 uv, float imageAspect, float canvasAspect) {
  vec2 coverUV = uv;
  if (imageAspect > canvasAspect) {
    float scale = canvasAspect / imageAspect;
    coverUV.x = (uv.x - 0.5) * scale + 0.5;
  } else {
    float scale = imageAspect / canvasAspect;
    coverUV.y = (uv.y - 0.5) * scale + 0.5;
  }
  return coverUV;
}

vec2 mapTexUV(vec2 uv) {
  if (u_seamless > 0.5) return uv;
  return getCoverUV(uv, u_imageAspect, u_canvasAspect);
}

float sdRoundedRect(vec2 pos, vec2 halfSize, vec4 cornerRadius) {
  cornerRadius.xy = (pos.x > 0.0) ? cornerRadius.xy : cornerRadius.zw;
  cornerRadius.x = (pos.y > 0.0) ? cornerRadius.x : cornerRadius.y;
  vec2 q = abs(pos) - halfSize + cornerRadius.x;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - cornerRadius.x;
}

float sdCircle(vec2 pos, float radius) { return length(pos) - radius; }

float sdStar(vec2 pos, float outerRadius, float innerRadius, int points) {
  float angle = atan(pos.y, pos.x);
  float radius = length(pos);
  float segmentAngle = 2.0 * PI / float(points);
  float segment = floor(angle / segmentAngle + 0.5);
  float localAngle = angle - segment * segmentAngle;
  float halfSegment = segmentAngle * 0.5;
  float t = abs(localAngle) / halfSegment;
  float targetRadius = mix(outerRadius, innerRadius, t);
  return radius - targetRadius;
}

float sdHexagon(vec2 pos, float size) {
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  pos = abs(pos);
  pos -= 2.0 * min(dot(k.xy, pos), 0.0) * k.xy;
  pos -= vec2(clamp(pos.x, -k.z * size, k.z * size), size);
  return length(pos) * sign(pos.y);
}

float sdDonut(vec2 pos, float outerRadius, float thickness) {
  float innerRadius = outerRadius * (1.0 - thickness);
  float d = length(pos);
  return max(d - outerRadius, innerRadius - d);
}

float getShapeSDF(vec2 pos) {
  if (u_shape < 0.5) return sdRoundedRect(pos, vec2(u_width, u_height), vec4(u_cornerRadius));
  if (u_shape < 1.5) return sdCircle(pos, min(u_width, u_height));
  if (u_shape < 2.5) {
    float outerRadius = min(u_width, u_height) * 0.8;
    return sdStar(pos, outerRadius, outerRadius * u_starInnerRadius, int(u_starPoints));
  }
  if (u_shape < 3.5) return sdHexagon(pos, min(u_width, u_height) * 0.8);
  return sdDonut(pos, min(u_width, u_height) * 0.8, u_donutThickness);
}

float boxSDF(vec2 uv) { return getShapeSDF(uv); }
float shadowSDF(vec2 uv) { return getShapeSDF(uv - u_shadowOffset); }

vec2 randomVec2(vec2 co) {
  return fract(sin(vec2(dot(co, vec2(127.1, 311.7)), dot(co, vec2(269.5, 183.3)))) * 43758.5453);
}

vec3 sampleWithChromaticAberration(vec2 uv, float timeOffset, float mipLevel, float aberrationStrength) {
  vec2 coverUV = mapTexUV(uv);
  vec2 offset = randomVec2(coverUV + vec2(u_time + timeOffset)) / u_resolution.x;
  vec2 noiseOffset = offset * pow(2.0, mipLevel) * (u_seamless > 0.5 ? 0.004 : 0.01);
  if (aberrationStrength <= 0.0) return texture2D(u_texture, coverUV + noiseOffset).rgb;
  vec2 direction = normalize(coverUV - vec2(0.5));
  float distance = length(coverUV - vec2(0.5));
  float aberrationOffset = aberrationStrength * distance * (u_seamless > 0.5 ? 0.016 : 0.01);
  float r = texture2D(u_texture, coverUV + direction * aberrationOffset * 1.2 + noiseOffset).r;
  float g = texture2D(u_texture, coverUV + noiseOffset).g;
  float b = texture2D(u_texture, coverUV - direction * aberrationOffset * 0.8 + noiseOffset).b;
  return vec3(r, g, b);
}

vec3 getBlurredColor(vec2 uv, float mipLevel) {
  return (
    sampleWithChromaticAberration(uv, 0.0, mipLevel, u_chromaticAberration) +
    sampleWithChromaticAberration(uv, 0.25, mipLevel, u_chromaticAberration) +
    sampleWithChromaticAberration(uv, 0.5, mipLevel, u_chromaticAberration) +
    sampleWithChromaticAberration(uv, 0.75, mipLevel, u_chromaticAberration) +
    sampleWithChromaticAberration(uv, 1.0, mipLevel, u_chromaticAberration) +
    sampleWithChromaticAberration(uv, 1.25, mipLevel, u_chromaticAberration) +
    sampleWithChromaticAberration(uv, 1.5, mipLevel, u_chromaticAberration) +
    sampleWithChromaticAberration(uv, 1.75, mipLevel, u_chromaticAberration) +
    sampleWithChromaticAberration(uv, 2.0, mipLevel, u_chromaticAberration)
  ) * 0.11111;
}

vec3 saturate(vec3 color, float factor) {
  float gray = dot(color, vec3(0.299, 0.587, 0.114));
  return mix(vec3(gray), color, factor);
}

${useDerivatives ? `
vec2 computeRefractOffset(float sdf, vec2 fragCoord) {
  if (sdf < 0.1) return vec2(0.0);
  #ifdef GL_OES_standard_derivatives
  vec2 grad = normalize(vec2(dFdx(sdf), dFdy(sdf)));
  #else
  vec2 grad = normalize(vec2(0.1, 0.1));
  #endif
  return grad * pow(abs(sdf), 12.0) * -0.05 * u_distortion;
}

float highlight(float sdf, vec2 fragCoord) {
  if (sdf < 0.1) return 0.0;
  #ifdef GL_OES_standard_derivatives
  vec2 grad = normalize(vec2(dFdx(sdf), dFdy(sdf)));
  #else
  vec2 grad = normalize(vec2(0.1, 0.1));
  #endif
  return 1.0 - clamp(pow(1.0 - abs(dot(grad, vec2(-0.707, 0.707))), 0.5), 0.0, 1.0);
}
` : `
vec2 computeRefractOffset(float sdf, vec2 fragCoord) {
  if (sdf < 0.1) return vec2(0.0);
  float epsilon = 2.0;
  vec2 h = vec2(epsilon, 0.0);
  float sdf1 = boxSDF((fragCoord + h.xy) - u_mouse);
  float sdf2 = boxSDF((fragCoord - h.xy) - u_mouse);
  float sdf3 = boxSDF((fragCoord + h.yx) - u_mouse);
  float sdf4 = boxSDF((fragCoord - h.yx) - u_mouse);
  vec2 grad = normalize(vec2(sdf1 - sdf2, sdf3 - sdf4));
  return grad * pow(abs(sdf), 12.0) * -0.05 * u_distortion;
}

float highlight(float sdf, vec2 fragCoord) {
  if (sdf < 0.1) return 0.0;
  float epsilon = 2.0;
  vec2 h = vec2(epsilon, 0.0);
  float sdf1 = boxSDF((fragCoord + h.xy) - u_mouse);
  float sdf2 = boxSDF((fragCoord - h.xy) - u_mouse);
  float sdf3 = boxSDF((fragCoord + h.yx) - u_mouse);
  float sdf4 = boxSDF((fragCoord - h.yx) - u_mouse);
  vec2 grad = normalize(vec2(sdf1 - sdf2, sdf3 - sdf4));
  return 1.0 - clamp(pow(1.0 - abs(dot(grad, vec2(-0.707, 0.707))), 0.5), 0.0, 1.0);
}
`}

float gaussianBlur(vec2 uv, float blurSize) {
  float total = 0.0;
  float totalWeight = 0.0;
  float radius = min(blurSize, 15.0);
  for (int x = -15; x <= 15; x++) {
    for (int y = -15; y <= 15; y++) {
      if (float(x) >= -radius && float(x) <= radius && float(y) >= -radius && float(y) <= radius) {
        vec2 samplePos = (uv * u_resolution + vec2(float(x), float(y))) - u_mouse;
        float weight = exp(-(float(x*x + y*y)) / (2.0 * radius * radius));
        total += weight * (1.0 - clamp(shadowSDF(samplePos), 0.0, 1.0));
        totalWeight += weight;
      }
    }
  }
  return totalWeight > 0.0 ? total / totalWeight : 0.0;
}

void main() {
  if (u_seamless > 0.5) {
    vec2 uv = v_texCoord;
    vec3 sharp = texture2D(u_texture, uv).rgb;
    float edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    float edgeFactor = 1.0 - smoothstep(0.0, 0.13, edgeDist);
    float topEdge = smoothstep(0.68, 1.0, uv.y);
    edgeFactor = clamp(max(edgeFactor, topEdge * 0.9), 0.0, 1.0);
    float frost = u_blur * mix(1.45, 2.4, edgeFactor);
    vec3 blurredTex = getBlurredColor(uv, frost);
    blurredTex *= u_tint;
    blurredTex += vec3(edgeFactor * 0.18);
    float frostMix = mix(0.66, 0.92, edgeFactor);
    gl_FragColor = vec4(mix(sharp, blurredTex, frostMix), 1.0);
    return;
  }

  vec2 fragCoord = v_texCoord * u_resolution;
  vec2 centeredUV = fragCoord - u_mouse;
  float sdf = boxSDF(centeredUV);
  float normalizedInside = (sdf / u_height) + 1.0;
  float edgeBlendFactor = pow(normalizedInside, 12.0);
  vec3 baseTex = texture2D(u_texture, mapTexUV(v_texCoord)).rgb;
  float shadowMask = u_shadowIntensity > 0.0 ? gaussianBlur(v_texCoord, u_shadowBlur) * u_shadowIntensity : 0.0;
  vec2 refractOff = computeRefractOffset(normalizedInside, fragCoord);
  vec2 sampleUV = v_texCoord + refractOff / u_resolution;
  float mipLevel = mix(3.5 * u_blur, 1.5, edgeBlendFactor);
  vec3 blurredTex = getBlurredColor(sampleUV, mipLevel);
  blurredTex = mix(blurredTex, pow(saturate(blurredTex, u_saturation), vec3(0.5)), edgeBlendFactor);
  blurredTex *= u_tint;
  if (u_glassMode > 0.5) {
    blurredTex = mix(blurredTex, blurredTex * 0.7, 0.3);
    blurredTex += mix(0.0, 0.4, clamp(highlight(normalizedInside, fragCoord) * pow(edgeBlendFactor, 3.0), 0.0, 1.0));
    float rimLight = smoothstep(0.0, 0.2, sdf) * smoothstep(1.5, 0.3, sdf) * 0.15;
    blurredTex += vec3(rimLight);
  } else {
    blurredTex += mix(0.0, 0.3, clamp(highlight(normalizedInside, fragCoord) * pow(edgeBlendFactor, 5.0), 0.0, 1.0));
    blurredTex = mix(blurredTex, blurredTex * 1.1, 0.2);
  }
  float boxMask = 1.0 - clamp(sdf, 0.0, 1.0);
  vec3 shadowedBackground = mix(baseTex, baseTex * (1.0 - shadowMask), step(0.01, shadowMask));
  gl_FragColor = vec4(mix(shadowedBackground, blurredTex, vec3(boxMask)), 1.0);
}
`;
}

function createWhiteCanvas(size = 512) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  return c;
}

function shapeUniform(shape) {
  return { rectangle: 0, circle: 1, star: 2, hexagon: 3, donut: 4 }[shape] ?? 0;
}

function createGlassRenderer(canvas) {
  let gl;
  let program;
  let texture;
  let uniformLocations = {};
  const startTime = Date.now();
  let imageAspect = 1;

  function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function bindTextureFromImage(image) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  gl = canvas.getContext('webgl');
  if (!gl) return null;

  const hasDerivatives = !!gl.getExtension('OES_standard_derivatives');
  const vs = createShader(gl.VERTEX_SHADER, vertexShaderSource);
  const fs = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource(hasDerivatives));
  program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return null;
  }

  const names = [
    'u_time', 'u_resolution', 'u_mouse', 'u_texture', 'u_width', 'u_height',
    'u_tint', 'u_saturation', 'u_distortion', 'u_blur', 'u_imageAspect',
    'u_canvasAspect', 'u_glassMode', 'u_shadowIntensity', 'u_shadowOffset',
    'u_shadowBlur', 'u_cornerRadius', 'u_chromaticAberration', 'u_shape',
    'u_donutThickness', 'u_starPoints', 'u_starInnerRadius', 'u_seamless',
  ];
  names.forEach((name) => {
    uniformLocations[name] = gl.getUniformLocation(program, name);
  });

  const vertices = new Float32Array([-1,-1,0,1, 1,-1,1,1, -1,1,0,0, 1,1,1,0]);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(program, 'a_position');
  const texLoc = gl.getAttribLocation(program, 'a_texCoord');
  gl.enableVertexAttribArray(posLoc);
  gl.enableVertexAttribArray(texLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);
  gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 16, 8);
  texture = gl.createTexture();
  bindTextureFromImage(createWhiteCanvas());

  return {
    setTexture(source) {
      if (!source) return;
      const w = source.videoWidth || source.width;
      const h = source.videoHeight || source.height;
      if (w && h) imageAspect = w / h;
      bindTextureFromImage(source);
    },
    draw({
      mouseCssX,
      mouseCssY,
      width,
      height,
      shape = 'rectangle',
      cornerRadius,
      style = GLASS_STYLE,
      glassMode = 0,
      imageAspectOverride,
      seamless = false,
    }) {
      if (!gl || !program) return;
      const cssW = canvas.clientWidth || 1;
      const cssH = canvas.clientHeight || 1;
      const scaleX = canvas.width / cssW;
      const scaleY = canvas.height / cssH;
      const cw = canvas.width;
      const ch = canvas.height;
      gl.viewport(0, 0, cw, ch);
      gl.useProgram(program);
      const canvasAspect = cw / ch;
      const imgAspect = imageAspectOverride ?? imageAspect;
      const u = uniformLocations;
      const radius = cornerRadius ?? style.cornerRadius;
      gl.uniform1f(u.u_time, (Date.now() - startTime) / 1000);
      gl.uniform2f(u.u_resolution, cw, ch);
      gl.uniform2f(u.u_mouse, mouseCssX * scaleX, mouseCssY * scaleY);
      gl.uniform1i(u.u_texture, 0);
      gl.uniform1f(u.u_width, width * scaleX);
      gl.uniform1f(u.u_height, height * scaleY);
      gl.uniform3f(u.u_tint, style.tintR, style.tintG, style.tintB);
      gl.uniform1f(u.u_saturation, style.saturation);
      gl.uniform1f(u.u_distortion, style.distortion);
      gl.uniform1f(u.u_blur, style.blur);
      gl.uniform1f(u.u_imageAspect, imgAspect);
      gl.uniform1f(u.u_canvasAspect, canvasAspect);
      gl.uniform1f(u.u_glassMode, glassMode);
      gl.uniform1f(u.u_shadowIntensity, style.shadowIntensity);
      gl.uniform2f(
        u.u_shadowOffset,
        style.shadowOffsetX * scaleX,
        style.shadowOffsetY * scaleY
      );
      gl.uniform1f(u.u_shadowBlur, style.shadowBlur * scaleX);
      gl.uniform1f(u.u_cornerRadius, radius * scaleX);
      gl.uniform1f(u.u_chromaticAberration, style.chromaticAberration);
      gl.uniform1f(u.u_shape, shapeUniform(shape));
      gl.uniform1f(u.u_donutThickness, style.donutThickness);
      gl.uniform1f(u.u_starPoints, style.starPoints);
      gl.uniform1f(u.u_starInnerRadius, style.starInnerRadius);
      gl.uniform1f(u.u_seamless, seamless ? 1 : 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    resizeCss(cssW, cssH) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(cssW * dpr));
      canvas.height = Math.max(1, Math.floor(cssH * dpr));
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
    },
  };
}
