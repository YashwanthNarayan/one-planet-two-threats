// Minimal dependency-free WebGL engine for the climate scrollytelling site.
// All 3D content is a conceptual illustration built from procedural geometry.

export type V3 = [number, number, number];

export function identity(): Float32Array {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

export function persp(fovY: number, aspect: number, near: number, far: number): Float32Array {
    const f = 1 / Math.tan(fovY / 2);
    const nf = 1 / (near - far);
    return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, 2 * far * near * nf, 0,
    ]);
}

export function lookAt(eye: V3, c: V3, up: V3): Float32Array {
    let zx = eye[0] - c[0], zy = eye[1] - c[1], zz = eye[2] - c[2];
    let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
    let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
    l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([
        xx, yx, zx, 0,
        xy, yy, zy, 0,
        xz, yz, zz, 0,
        -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
        -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
        -(zx * eye[0] + zy * eye[1] + zz * eye[2]), 1,
    ]);
}

// Compose translation * rotationY * uniform scale.
export function compose(tx: number, ty: number, tz: number, ry: number, s: number): Float32Array {
    const c = Math.cos(ry) * s, sn = Math.sin(ry) * s;
    return new Float32Array([c, 0, -sn, 0, 0, s, 0, 0, sn, 0, c, 0, tx, ty, tz, 1]);
}

export interface Geom { p: number[]; n: number[]; c: number[]; uv?: number[]; }

function pushTri(g: Geom, a: V3, b: V3, c: V3, col: V3, norm?: V3, uv?: [number, number][]): void {
    let n = norm;
    if (!n) {
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
        const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const l = Math.hypot(nx, ny, nz) || 1;
        n = [nx / l, ny / l, nz / l];
    }
    g.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    for (let i = 0; i < 3; i++) { g.n.push(n[0], n[1], n[2]); g.c.push(col[0], col[1], col[2]); }
    if (uv && g.uv) { g.uv.push(uv[0][0], uv[0][1], uv[1][0], uv[1][1], uv[2][0], uv[2][1]); }
}

function pushQuad(g: Geom, a: V3, b: V3, c: V3, d: V3, col: V3, norm?: V3): void {
    pushTri(g, a, b, c, col, norm);
    pushTri(g, a, c, d, col, norm);
}

export function box(w: number, h: number, d: number, col: V3, topCol?: V3): Geom {
    const g: Geom = { p: [], n: [], c: [] };
    const x = w / 2, y = h / 2, z = d / 2;
    const tc = topCol || col;
    pushQuad(g, [-x, y, -z], [x, y, -z], [x, y, z], [-x, y, z], tc, [0, 1, 0]);
    pushQuad(g, [-x, -y, z], [x, -y, z], [x, -y, -z], [-x, -y, -z], col, [0, -1, 0]);
    pushQuad(g, [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z], col, [0, 0, 1]);
    pushQuad(g, [x, -y, z], [x, -y, -z], [x, y, -z], [x, y, -z], col, [1, 0, 0]);
    pushQuad(g, [x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z], col, [0, 0, -1]);
    pushQuad(g, [-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z], col, [-1, 0, 0]);
    return g;
}

export function planeXZ(w: number, d: number, col: V3): Geom {
    const g: Geom = { p: [], n: [], c: [] };
    const x = w / 2, z = d / 2;
    pushQuad(g, [-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z], col, [0, 1, 0]);
    return g;
}

// Emissive quad on a vertical plane (used for lit windows).
export function quadW(w: number, h: number, col: V3): Geom {
    const g: Geom = { p: [], n: [], c: [] };
    const x = w / 2, y = h / 2;
    pushQuad(g, [-x, -y, 0], [x, -y, 0], [x, y, 0], [-x, y, 0], col, [0, 0, 1]);
    return g;
}

export function sphere(r: number, segs: number, rings: number, colorFn: (x: number, y: number, z: number) => V3): Geom {
    const g: Geom = { p: [], n: [], c: [] };
    const pt = (i: number, j: number): V3 => {
        const th = (i / segs) * Math.PI * 2;
        const ph = (j / rings) * Math.PI;
        return [r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)];
    };
    for (let j = 0; j < rings; j++) {
        for (let i = 0; i < segs; i++) {
            const a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1);
            const quad = (p1: V3, p2: V3, p3: V3) => {
                const nrm: V3 = [(p1[0] + p2[0] + p3[0]) / (3 * r), (p1[1] + p2[1] + p3[1]) / (3 * r), (p1[2] + p2[2] + p3[2]) / (3 * r)];
                const cx = (p1[0] + p2[0] + p3[0]) / 3 / r, cy = (p1[1] + p2[1] + p3[1]) / 3 / r, cz = (p1[2] + p2[2] + p3[2]) / 3 / r;
                pushTri(g, p1, p2, p3, colorFn(cx, cy, cz), nrm);
            };
            quad(a, b, d); quad(b, c, d);
        }
    }
    return g;
}

// Textured sphere with UVs (u = longitude, v = latitude), white vertex colors.
export function sphereTex(r: number, segs: number, rings: number): Geom {
    const g: Geom = { p: [], n: [], c: [], uv: [] };
    const pt = (i: number, j: number): V3 => {
        const th = (i / segs) * Math.PI * 2;
        const ph = (j / rings) * Math.PI;
        return [r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)];
    };
    const uvAt = (i: number, j: number): [number, number] => [i / segs, j / rings];
    for (let j = 0; j < rings; j++) {
        for (let i = 0; i < segs; i++) {
            const a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1);
            const ua = uvAt(i, j), ub = uvAt(i + 1, j), uc = uvAt(i + 1, j + 1), ud = uvAt(i, j + 1);
            const white: V3 = [1, 1, 1];
            pushTri(g, a, b, d, white, undefined, [ua, ub, ud]);
            pushTri(g, b, c, d, white, undefined, [ub, uc, ud]);
        }
    }
    // Normals from positions (analytic, smooth)
    for (let i = 0; i < g.p.length; i += 3) {
        const l = Math.hypot(g.p[i], g.p[i + 1], g.p[i + 2]) || 1;
        g.n[i] = g.p[i] / l; g.n[i + 1] = g.p[i + 1] / l; g.n[i + 2] = g.p[i + 2] / l;
    }
    return g;
}

export function cone(r: number, h: number, segs: number, col: V3): Geom {
    const g: Geom = { p: [], n: [], c: [] };
    const apex: V3 = [0, h, 0];
    for (let i = 0; i < segs; i++) {
        const a1 = (i / segs) * Math.PI * 2, a2 = ((i + 1) / segs) * Math.PI * 2;
        const p1: V3 = [r * Math.cos(a1), 0, r * Math.sin(a1)];
        const p2: V3 = [r * Math.cos(a2), 0, r * Math.sin(a2)];
        pushTri(g, p1, p2, apex, col);
        pushTri(g, [0, 0, 0], p2, p1, col, [0, -1, 0]);
    }
    return g;
}

export function cylinder(r: number, h: number, segs: number, col: V3): Geom {
    const g: Geom = { p: [], n: [], c: [] };
    for (let i = 0; i < segs; i++) {
        const a1 = (i / segs) * Math.PI * 2, a2 = ((i + 1) / segs) * Math.PI * 2;
        const c1 = Math.cos(a1), s1 = Math.sin(a1), c2 = Math.cos(a2), s2 = Math.sin(a2);
        pushQuad(g, [r * c1, 0, r * s1], [r * c2, 0, r * s2], [r * c2, h, r * s2], [r * c1, h, r * s1], col);
        pushTri(g, [0, h, 0], [r * c1, h, r * s1], [r * c2, h, r * s2], col, [0, 1, 0]);
        pushTri(g, [0, 0, 0], [r * c2, 0, r * s2], [r * c1, 0, r * s1], col, [0, -1, 0]);
    }
    return g;
}

// Flat annulus on the XZ plane, used for the home ignition zones.
export function ringXZ(rIn: number, rOut: number, segs: number, col: V3): Geom {
    const g: Geom = { p: [], n: [], c: [] };
    for (let i = 0; i < segs; i++) {
        const a1 = (i / segs) * Math.PI * 2, a2 = ((i + 1) / segs) * Math.PI * 2;
        const c1 = Math.cos(a1), s1 = Math.sin(a1), c2 = Math.cos(a2), s2 = Math.sin(a2);
        pushQuad(g, [rIn * c1, 0, rIn * s1], [rIn * c2, 0, rIn * s2], [rOut * c2, 0, rOut * s2], [rOut * c1, 0, rOut * s1], col, [0, 1, 0]);
    }
    return g;
}

// Triangular prism (house roof): width w along x, depth d along z, height h.
export function prism(w: number, h: number, d: number, col: V3): Geom {
    const g: Geom = { p: [], n: [], c: [] };
    const x = w / 2, z = d / 2;
    pushTri(g, [-x, 0, z], [x, 0, z], [0, h, z], col);
    pushTri(g, [x, 0, -z], [-x, 0, -z], [0, h, -z], col);
    pushQuad(g, [-x, 0, -z], [-x, 0, z], [0, h, z], [0, h, -z], col);
    pushQuad(g, [x, 0, z], [x, 0, -z], [0, h, -z], [0, h, z], col);
    pushQuad(g, [-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z], col, [0, -1, 0]);
    return g;
}

export function bake(g: Geom, m: Float32Array): Geom {
    const out: Geom = { p: [], n: [], c: g.c, uv: g.uv };
    const c0 = m[0], c1 = m[1], c2 = m[2], c4 = m[4], c5 = m[5], c6 = m[6], c8 = m[8], c9 = m[9], c10 = m[10];
    for (let i = 0; i < g.p.length; i += 3) {
        const x = g.p[i], y = g.p[i + 1], z = g.p[i + 2];
        out.p.push(
            c0 * x + c4 * y + c8 * z + m[12],
            c1 * x + c5 * y + c9 * z + m[13],
            c2 * x + c6 * y + c10 * z + m[14],
        );
        const nx = g.n[i], ny = g.n[i + 1], nz = g.n[i + 2];
        let tx = c0 * nx + c4 * ny + c8 * nz, ty = c1 * nx + c5 * ny + c9 * nz, tz = c2 * nx + c6 * ny + c10 * nz;
        const l = Math.hypot(tx, ty, tz) || 1;
        out.n.push(tx / l, ty / l, tz / l);
    }
    return out;
}

export function merge(geoms: Geom[]): Geom {
    const out: Geom = { p: [], n: [], c: [] };
    const withUV = geoms.some(g => g.uv);
    if (withUV) out.uv = [];
    for (const g of geoms) {
        out.p.push(...g.p); out.n.push(...g.n); out.c.push(...g.c);
        if (withUV && out.uv) {
            if (g.uv) out.uv.push(...g.uv);
            else for (let i = 0; i < g.p.length / 3; i++) out.uv.push(0, 0);
        }
    }
    return out;
}

const LIGHTING = `
vec3 applyLight(vec3 base, vec3 n, vec3 lightDir, float glow) {
    float d = max(dot(n, normalize(lightDir)), 0.0);
    float rim = pow(1.0 - max(d, 0.0), 3.0) * 0.10;
    return base * (0.44 + 0.68 * d) + base * glow + vec3(rim);
}`;

const MESH_VS = `
attribute vec3 aPos; attribute vec3 aNorm; attribute vec3 aCol;
uniform mat4 uProj; uniform mat4 uView; uniform mat4 uModel;
uniform vec3 uLight; uniform float uFogDensity; uniform float uGlow;
varying vec3 vCol; varying float vFog;
void main() {
    vec4 w = uModel * vec4(aPos, 1.0);
    vec3 n = normalize(mat3(uModel[0].xyz, uModel[1].xyz, uModel[2].xyz) * aNorm);
    float d = max(dot(n, normalize(uLight)), 0.0);
    float rim = pow(1.0 - d, 3.0) * 0.08;
    vCol = aCol * (0.44 + 0.68 * d) + aCol * uGlow + vec3(rim);
    vec4 mv = uView * w;
    float dist = length(mv.xyz);
    vFog = 1.0 - exp(-dist * uFogDensity);
    gl_Position = uProj * mv;
}`;

const MESH_FS = `
precision mediump float;
varying vec3 vCol; varying float vFog;
uniform vec3 uFogColor;
void main() { gl_FragColor = vec4(mix(vCol, uFogColor, clamp(vFog, 0.0, 1.0)), 1.0); }`;

const TEX_VS = `
attribute vec3 aPos; attribute vec3 aNorm; attribute vec2 aUV;
uniform mat4 uProj; uniform mat4 uView; uniform mat4 uModel;
uniform float uFogDensity;
varying vec2 vUV; varying float vFog; varying vec3 vN;
void main() {
    vec4 w = uModel * vec4(aPos, 1.0);
    vN = normalize(mat3(uModel[0].xyz, uModel[1].xyz, uModel[2].xyz) * aNorm);
    vUV = aUV;
    vec4 mv = uView * w;
    float dist = length(mv.xyz);
    vFog = 1.0 - exp(-dist * uFogDensity);
    gl_Position = uProj * mv;
}`;

const TEX_FS = `
precision mediump float;
varying vec2 vUV; varying float vFog; varying vec3 vN;
uniform sampler2D uMap; uniform vec3 uFogColor; uniform vec3 uLight; uniform float uGlow;
void main() {
    vec3 base = texture2D(uMap, vUV).rgb;
    float d = max(dot(normalize(vN), normalize(uLight)), 0.0);
    vec3 col = base * (0.38 + 0.78 * d) + base * uGlow;
    gl_FragColor = vec4(mix(col, uFogColor, clamp(vFog, 0.0, 1.0)), 1.0);
}`;

const ATM_VS = `
attribute vec3 aPos; attribute vec3 aNorm;
uniform mat4 uProj; uniform mat4 uView; uniform mat4 uModel;
varying vec3 vN;
void main() {
    vec4 w = uModel * vec4(aPos, 1.0);
    vec3 n = normalize(mat3(uModel[0].xyz, uModel[1].xyz, uModel[2].xyz) * aNorm);
    vN = normalize(mat3(uView) * n);
    gl_Position = uProj * uView * w;
}`;

const ATM_FS = `
precision mediump float;
varying vec3 vN;
uniform vec3 uColor; uniform float uStrength;
void main() {
    float i = pow(max(0.62 - dot(normalize(vN), vec3(0.0, 0.0, 1.0)), 0.0), 2.4);
    gl_FragColor = vec4(uColor * i * uStrength, 1.0);
}`;

const PTS_VS = `
attribute vec3 aPos; attribute float aSize; attribute vec4 aCol;
uniform mat4 uProj; uniform mat4 uView;
varying vec4 vCol;
void main() {
    vec4 mv = uView * vec4(aPos, 1.0);
    gl_Position = uProj * mv;
    gl_PointSize = aSize * (240.0 / max(1.0, -mv.z));
    vCol = aCol;
}`;

const PTS_FS = `
precision mediump float;
varying vec4 vCol;
void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float a = smoothstep(0.5, 0.08, d) * vCol.a;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vCol.rgb, a);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(sh));
    return sh;
}

function program(gl: WebGLRenderingContext, vs: string, fs: string): WebGLProgram {
    const p = gl.createProgram()!;
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
    return p;
}

export class Mesh {
    vboP: WebGLBuffer; vboN: WebGLBuffer; vboC: WebGLBuffer; vboUV: WebGLBuffer | null = null;
    count: number;
    model: Float32Array = identity();
    baseModel: Float32Array = identity();
    visible = true;
    area = '';
    grow = 1; // animated scale on top of baseModel
    growMode: 'uniform' | 'y' = 'uniform';
    glow = 0;
    tex: WebGLTexture | null = null;
    constructor(gl: WebGLRenderingContext, g: Geom, area: string) {
        this.count = g.p.length / 3;
        this.area = area;
        this.vboP = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboP);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.p), gl.STATIC_DRAW);
        this.vboN = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboN);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.n), gl.STATIC_DRAW);
        this.vboC = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboC);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.c), gl.STATIC_DRAW);
        if (g.uv) {
            this.vboUV = gl.createBuffer()!;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vboUV);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.uv), gl.STATIC_DRAW);
        }
    }
}

export class ParticleSet {
    n: number;
    pos: Float32Array; vel: Float32Array; col: Float32Array; size: Float32Array; life: Float32Array;
    bufP: WebGLBuffer; bufC: WebGLBuffer; bufS: WebGLBuffer;
    kind: string;
    origin: V3; spread: V3; rise: number; alpha: number;
    active = true;
    intensity = 1;
    constructor(gl: WebGLRenderingContext, n: number, kind: string, origin: V3, spread: V3, rgb: V3, rise: number, size: number, alpha: number) {
        this.n = n; this.kind = kind; this.origin = origin; this.spread = spread; this.rise = rise; this.alpha = alpha;
        this.pos = new Float32Array(n * 3); this.vel = new Float32Array(n * 3);
        this.col = new Float32Array(n * 4); this.size = new Float32Array(n); this.life = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            this.respawn(i, true);
            this.col[i * 4] = rgb[0]; this.col[i * 4 + 1] = rgb[1]; this.col[i * 4 + 2] = rgb[2]; this.col[i * 4 + 3] = alpha;
            this.size[i] = size * (0.6 + Math.random() * 0.8);
        }
        this.bufP = gl.createBuffer()!; this.bufC = gl.createBuffer()!; this.bufS = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufC); gl.bufferData(gl.ARRAY_BUFFER, this.col, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufS); gl.bufferData(gl.ARRAY_BUFFER, this.size, gl.STATIC_DRAW);
    }
    respawn(i: number, randomLife: boolean): void {
        this.pos[i * 3] = this.origin[0] + (Math.random() - 0.5) * this.spread[0];
        this.pos[i * 3 + 1] = this.origin[1] + (this.kind === 'smoke' ? Math.random() * this.spread[1] : Math.random() * 1.5);
        this.pos[i * 3 + 2] = this.origin[2] + (Math.random() - 0.5) * this.spread[2];
        this.vel[i * 3] = (Math.random() - 0.5) * 0.35 + (this.kind === 'smoke' ? 0.55 : 0);
        this.vel[i * 3 + 1] = this.rise * (0.6 + Math.random() * 0.8);
        this.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.35;
        this.life[i] = randomLife ? Math.random() : 0;
    }
    update(dt: number): void {
        if (!this.active) return;
        const speed = this.kind === 'flame' ? 2.4 : this.kind === 'smoke' ? 0.5 : 0.8;
        for (let i = 0; i < this.n; i++) {
            this.life[i] += dt * 0.16 * speed;
            if (this.life[i] > 1) this.respawn(i, false);
            this.pos[i * 3] += this.vel[i * 3] * dt;
            this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
            this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
            this.col[i * 4 + 3] = this.alpha * (1 - this.life[i]) * this.intensity;
        }
    }
}

export class Renderer {
    gl: WebGLRenderingContext;
    progM: WebGLProgram; progP: WebGLProgram; progT: WebGLProgram; progA: WebGLProgram;
    locM: Record<string, WebGLUniformLocation | number | null> = {};
    locP: Record<string, WebGLUniformLocation | number | null> = {};
    locT: Record<string, WebGLUniformLocation | number | null> = {};
    locA: Record<string, WebGLUniformLocation | number | null> = {};
    meshes: Mesh[] = [];
    sets: ParticleSet[] = [];
    atmoMesh: Mesh | null = null;
    atmoColor: V3 = [0.35, 0.6, 1.0];
    lastPJ: Float32Array = identity();
    lastVW: Float32Array = identity();
    canvas: HTMLCanvasElement;
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
        if (!gl) throw new Error('WebGL unavailable');
        this.gl = gl;
        this.progM = program(gl, MESH_VS, MESH_FS);
        this.progP = program(gl, PTS_VS, PTS_FS);
        this.progT = program(gl, TEX_VS, TEX_FS);
        this.progA = program(gl, ATM_VS, ATM_FS);
        for (const k of ['uProj', 'uView', 'uModel', 'uLight', 'uFogColor', 'uFogDensity', 'uGlow']) this.locM[k] = gl.getUniformLocation(this.progM, k);
        for (const k of ['aPos', 'aNorm', 'aCol']) this.locM[k] = gl.getAttribLocation(this.progM, k);
        for (const k of ['uProj', 'uView']) this.locP[k] = gl.getUniformLocation(this.progP, k);
        for (const k of ['aPos', 'aSize', 'aCol']) this.locP[k] = gl.getAttribLocation(this.progP, k);
        for (const k of ['uProj', 'uView', 'uModel', 'uLight', 'uFogColor', 'uFogDensity', 'uGlow', 'uMap']) this.locT[k] = gl.getUniformLocation(this.progT, k);
        for (const k of ['aPos', 'aNorm', 'aUV']) this.locT[k] = gl.getAttribLocation(this.progT, k);
        for (const k of ['uProj', 'uView', 'uModel', 'uColor', 'uStrength']) this.locA[k] = gl.getUniformLocation(this.progA, k);
        for (const k of ['aPos', 'aNorm']) this.locA[k] = gl.getAttribLocation(this.progA, k);
        gl.enable(gl.DEPTH_TEST);
    }
    loadTexture(url: string): WebGLTexture {
        const gl = this.gl;
        const tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([24, 48, 92]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        const upload = (source: TexImageSource) => {
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.generateMipmap(gl.TEXTURE_2D);
        };
        // fetch+blob avoids ORB blocks on plain <img> subresource loads
        fetch(url).then(r => {
            if (!r.ok) throw new Error('tex ' + r.status);
            return r.blob();
        }).then(b => createImageBitmap(b)).then(bmp => upload(bmp)).catch(() => {
            const img = new Image();
            img.onload = () => upload(img);
            img.src = url;
        });
        return tex;
    }
    setAtmosphere(g: Geom, color: V3): Mesh {
        const m = new Mesh(this.gl, g, 'atmo');
        this.atmoMesh = m;
        this.atmoColor = color;
        return m;
    }
    addMesh(g: Geom, area: string): Mesh {
        const m = new Mesh(this.gl, g, area);
        this.meshes.push(m);
        return m;
    }
    addParticles(s: ParticleSet): void { this.sets.push(s); }
    resize(): void {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = Math.floor(this.canvas.clientWidth * dpr), h = Math.floor(this.canvas.clientHeight * dpr);
        if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    }
    private modelFor(m: Mesh): Float32Array {
        const s = m.grow;
        const b = m.baseModel;
        if (s === 1) return b;
        return m.growMode === 'y'
            ? new Float32Array([b[0], b[1], b[2], 0, b[4] * s, b[5] * s, b[6] * s, 0, b[8], b[9], b[10], 0, b[12], b[13], b[14], 1])
            : new Float32Array([b[0] * s, b[1] * s, b[2] * s, 0, b[4] * s, b[5] * s, b[6] * s, 0, b[8] * s, b[9] * s, b[10] * s, 0, b[12], b[13], b[14], 1]);
    }
    render(eye: V3, center: V3, sky: V3, fogColor: V3, fogDensity: number, light: V3, areaWeights: Record<string, number>, aspect: number): void {
        const gl = this.gl;
        this.resize();
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(sky[0], sky[1], sky[2], 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const pj = persp(0.9, aspect, 0.1, 900);
        const vw = lookAt(eye, center, [0, 1, 0]);
        this.lastPJ = pj; this.lastVW = vw;
        // Solid meshes
        gl.useProgram(this.progM);
        gl.uniformMatrix4fv(this.locM.uProj as WebGLUniformLocation, false, pj);
        gl.uniformMatrix4fv(this.locM.uView as WebGLUniformLocation, false, vw);
        gl.uniform3fv(this.locM.uLight as WebGLUniformLocation, light);
        gl.uniform3fv(this.locM.uFogColor as WebGLUniformLocation, fogColor);
        gl.uniform1f(this.locM.uFogDensity as WebGLUniformLocation, fogDensity);
        gl.enableVertexAttribArray(this.locM.aPos as number);
        gl.enableVertexAttribArray(this.locM.aNorm as number);
        gl.enableVertexAttribArray(this.locM.aCol as number);
        // Textured meshes
        gl.useProgram(this.progT);
        gl.uniformMatrix4fv(this.locT.uProj as WebGLUniformLocation, false, pj);
        gl.uniformMatrix4fv(this.locT.uView as WebGLUniformLocation, false, vw);
        gl.uniform3fv(this.locT.uLight as WebGLUniformLocation, light);
        gl.uniform3fv(this.locT.uFogColor as WebGLUniformLocation, fogColor);
        gl.uniform1f(this.locT.uFogDensity as WebGLUniformLocation, fogDensity);
        gl.uniform1i(this.locT.uMap as WebGLUniformLocation, 0);
        for (const m of this.meshes) {
            if (!m.visible) continue;
            const w = areaWeights[m.area] === undefined ? 1 : areaWeights[m.area];
            if (w <= 0.01) continue;
            const model = this.modelFor(m);
            if (m.tex && m.vboUV) {
                gl.useProgram(this.progT);
                gl.uniformMatrix4fv(this.locT.uModel as WebGLUniformLocation, false, model);
                gl.uniform1f(this.locT.uGlow as WebGLUniformLocation, m.glow);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, m.tex);
                gl.bindBuffer(gl.ARRAY_BUFFER, m.vboP);
                gl.vertexAttribPointer(this.locT.aPos as number, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(this.locT.aPos as number);
                gl.bindBuffer(gl.ARRAY_BUFFER, m.vboN);
                gl.vertexAttribPointer(this.locT.aNorm as number, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(this.locT.aNorm as number);
                gl.bindBuffer(gl.ARRAY_BUFFER, m.vboUV);
                gl.vertexAttribPointer(this.locT.aUV as number, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(this.locT.aUV as number);
                gl.drawArrays(gl.TRIANGLES, 0, m.count);
            } else {
                gl.useProgram(this.progM);
                gl.uniformMatrix4fv(this.locM.uModel as WebGLUniformLocation, false, model);
                gl.uniform1f(this.locM.uGlow as WebGLUniformLocation, m.glow);
                gl.bindBuffer(gl.ARRAY_BUFFER, m.vboP);
                gl.vertexAttribPointer(this.locM.aPos as number, 3, gl.FLOAT, false, 0, 0);
                gl.bindBuffer(gl.ARRAY_BUFFER, m.vboN);
                gl.vertexAttribPointer(this.locM.aNorm as number, 3, gl.FLOAT, false, 0, 0);
                gl.bindBuffer(gl.ARRAY_BUFFER, m.vboC);
                gl.vertexAttribPointer(this.locM.aCol as number, 3, gl.FLOAT, false, 0, 0);
                gl.drawArrays(gl.TRIANGLES, 0, m.count);
            }
        }
        // Atmosphere halo (additive, backfaces)
        if (this.atmoMesh && (areaWeights.earth === undefined ? 1 : areaWeights.earth) > 0.01) {
            const m = this.atmoMesh;
            gl.useProgram(this.progA);
            gl.uniformMatrix4fv(this.locA.uProj as WebGLUniformLocation, false, pj);
            gl.uniformMatrix4fv(this.locA.uView as WebGLUniformLocation, false, vw);
            gl.uniformMatrix4fv(this.locA.uModel as WebGLUniformLocation, false, m.baseModel);
            gl.uniform3fv(this.locA.uColor as WebGLUniformLocation, this.atmoColor);
            gl.uniform1f(this.locA.uStrength as WebGLUniformLocation, 1.5 * (areaWeights.earth || 0));
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
            gl.depthMask(false);
            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.FRONT);
            gl.bindBuffer(gl.ARRAY_BUFFER, m.vboP);
            gl.vertexAttribPointer(this.locA.aPos as number, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(this.locA.aPos as number);
            gl.bindBuffer(gl.ARRAY_BUFFER, m.vboN);
            gl.vertexAttribPointer(this.locA.aNorm as number, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(this.locA.aNorm as number);
            gl.drawArrays(gl.TRIANGLES, 0, m.count);
            gl.cullFace(gl.BACK);
            gl.disable(gl.CULL_FACE);
            gl.depthMask(true);
            gl.disable(gl.BLEND);
        }
        // Particles
        gl.useProgram(this.progP);
        gl.uniformMatrix4fv(this.locP.uProj as WebGLUniformLocation, false, pj);
        gl.uniformMatrix4fv(this.locP.uView as WebGLUniformLocation, false, vw);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        gl.enableVertexAttribArray(this.locP.aPos as number);
        gl.enableVertexAttribArray(this.locP.aSize as number);
        gl.enableVertexAttribArray(this.locP.aCol as number);
        for (const s of this.sets) {
            if (!s.active || s.intensity <= 0.01) continue;
            gl.bindBuffer(gl.ARRAY_BUFFER, s.bufP);
            gl.bufferData(gl.ARRAY_BUFFER, s.pos, gl.DYNAMIC_DRAW);
            gl.vertexAttribPointer(this.locP.aPos as number, 3, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, s.bufS);
            gl.vertexAttribPointer(this.locP.aSize as number, 1, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, s.bufC);
            gl.bufferData(gl.ARRAY_BUFFER, s.col, gl.DYNAMIC_DRAW);
            gl.vertexAttribPointer(this.locP.aCol as number, 4, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.POINTS, 0, s.n);
        }
        gl.depthMask(true);
        gl.disable(gl.BLEND);
    }
    // Project a world point to CSS pixels over the canvas; null when off-screen/behind.
    project(p: V3): { x: number; y: number } | null {
        const vp = matMul(this.lastPJ, this.lastVW);
        const x = p[0], y = p[1], z = p[2];
        const cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12];
        const cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13];
        const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
        if (cw <= 0.01) return null;
        const nx = cx / cw, ny = cy / cw;
        if (nx < -1.15 || nx > 1.15 || ny < -1.15 || ny > 1.15) return null;
        return { x: (nx + 1) / 2 * this.canvas.clientWidth, y: (1 - ny) / 2 * this.canvas.clientHeight };
    }
}

// Textured box: four walls carry tiled UVs (uRep x vRep repeats), top/bottom
// faces get degenerate UVs (covered by roof caps / hidden).
export function boxUV(w: number, h: number, d: number, col: V3, uRep: number, vRep: number): Geom {
    const g: Geom = { p: [], n: [], c: [], uv: [] };
    const x = w / 2, y = h / 2, z = d / 2;
    const wall = (a: V3, b: V3, c: V3, dd: V3, n: V3, uR: number) => {
        pushTri(g, a, b, c, col, n, [[0, vRep], [uR, vRep], [uR, 0]]);
        pushTri(g, a, c, dd, col, n, [[0, vRep], [uR, 0], [0, 0]]);
    };
    wall([-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z], [0, 0, 1], uRep);
    wall([x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z], [0, 0, -1], uRep);
    wall([x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z], [1, 0, 0], uRep * (d / w));
    wall([-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z], [-1, 0, 0], uRep * (d / w));
    pushQuad(g, [-x, y, -z], [x, y, -z], [x, y, z], [-x, y, z], col, [0, 1, 0]);
    pushQuad(g, [-x, -y, z], [x, -y, z], [x, -y, -z], [-x, -y, -z], col, [0, -1, 0]);
    // Degenerate UVs for top/bottom
    for (let i = 0; i < 12; i++) g.uv!.push(0.001, 0.001);
    return g;
}

// Textured ground plane with tiled UVs.
export function planeUV(w: number, d: number, col: V3, uRep: number, vRep: number): Geom {
    const g: Geom = { p: [], n: [], c: [], uv: [] };
    const x = w / 2, z = d / 2;
    pushTri(g, [-x, 0, -z], [x, 0, -z], [x, 0, z], col, [0, 1, 0], [[0, 0], [uRep, 0], [uRep, vRep]]);
    pushTri(g, [-x, 0, -z], [x, 0, z], [-x, 0, z], col, [0, 1, 0], [[0, 0], [uRep, vRep], [0, vRep]]);
    return g;
}

// Multiply two column-major mat4s (a * b).
export function matMul(a: Float32Array, b: Float32Array): Float32Array {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
        o[c * 4 + r] = s;
    }
    return o;
}
