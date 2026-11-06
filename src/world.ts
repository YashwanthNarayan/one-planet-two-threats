// Builds the three 3D worlds (Earth, City, Forest) and drives scroll + interaction state.
// Every transformation here is a conceptual illustration, not a measured prediction.

import { Renderer, ParticleSet, Mesh, Geom, V3, box, boxUV, planeXZ, planeUV, sphere, sphereTex, cone, cylinder, ringXZ, prism, quadW, bake, merge, compose } from './engine';
import earthMapUrl from './photos/earth.jpg';
import facadeAUrl from './photos/facade-modern.jpg';
import facadeBUrl from './photos/facade-brick.jpg';
import asphaltUrl from './photos/asphalt.jpg';
import forestFloorUrl from './photos/forest-floor.jpg';

function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const CITY: V3 = [200, 0, 0];
const FOREST: V3 = [400, 0, 0];
const HOUSE_LOCAL: V3 = [0, 0, 5]; // relative to forest anchor

interface Stop { sky: V3; fog: V3; den: number; eye: V3; ctr: V3; }

// Camera stops stay outside the building grid (half-extent ~28) and above tree height.
const STOPS: Stop[] = [
    { sky: [0.012, 0.022, 0.06], fog: [0.04, 0.06, 0.12], den: 0.010, eye: [0, 0.8, 7.4], ctr: [0, 0, 0] },            // 0 hero Earth
    { sky: [0.10, 0.05, 0.05], fog: [0.20, 0.09, 0.05], den: 0.016, eye: [1.2, 0.4, 4.4], ctr: [0, 0, 0] },          // 1 warming
    { sky: [0.58, 0.32, 0.15], fog: [0.78, 0.50, 0.26], den: 0.022, eye: [237, 15, 33], ctr: [200, 2, 0] },          // 2 city hot
    { sky: [0.28, 0.12, 0.10], fog: [0.42, 0.20, 0.13], den: 0.034, eye: [233, 8, 28], ctr: [200, 3.5, 0] },         // 3 human cost
    { sky: [0.22, 0.34, 0.45], fog: [0.30, 0.40, 0.50], den: 0.005, eye: [233, 8, 27], ctr: [199, 3.5, 0] },         // 4 cooler city
    { sky: [0.52, 0.33, 0.15], fog: [0.68, 0.45, 0.23], den: 0.024, eye: [430, 10, 26], ctr: [400, 2, 2] },          // 5 forest dry
    { sky: [0.40, 0.45, 0.40], fog: [0.55, 0.60, 0.52], den: 0.015, eye: [424, 11, 22], ctr: [400, 2, 2] },          // 6 resilience
    { sky: [0.30, 0.29, 0.30], fog: [0.46, 0.44, 0.44], den: 0.034, eye: [419, 5.5, 16], ctr: [400, 2.5, 4] },       // 7 smoke
    { sky: [0.34, 0.38, 0.43], fog: [0.50, 0.54, 0.58], den: 0.005, eye: [410, 17, 15], ctr: [402.5, 1, 5] },          // 8 ignition zones
    { sky: [0.16, 0.24, 0.31], fog: [0.25, 0.35, 0.42], den: 0.012, eye: [235, 11, 30], ctr: [200, 2, 0] },          // 9 choose future
    { sky: [0.02, 0.04, 0.10], fog: [0.05, 0.09, 0.17], den: 0.012, eye: [0, 0.5, 8.2], ctr: [0, 0, 0] },            // 10 final Earth
];

const AREAS_BY_STOP: Record<string, number>[] = STOPS.map((_, i) => ({
    earth: (i <= 1 || i >= 10) ? 1 : 0,
    city: (i >= 2 && i <= 4) || i === 9 ? 1 : 0,
    forest: i >= 5 && i <= 8 ? 1 : 0,
}));

export interface WorldFlags {
    trees: boolean; roofs: boolean; centers: boolean; shade: boolean;
    fuel: boolean; rxFire: boolean; defensible: boolean; harden: boolean;
    ring: number;
    future: number;
}

interface FlashLabel { el: HTMLDivElement; pos: V3; born: number; ttl: number; }
interface Focus { target: V3; lift: number; start: number; until: number; }

export class World {
    r: Renderer;
    earthMesh!: Mesh;
    treeMeshes: Mesh[] = [];
    roofMeshes: Mesh[] = [];
    shadeMeshes: Mesh[] = [];
    centerMeshes: Mesh[] = [];
    brushMeshes: Mesh[] = [];
    ringMeshes: Mesh[] = [];
    roofOld!: Mesh; roofNew!: Mesh;
    heatSet!: ParticleSet; emberSet!: ParticleSet; smokeSet!: ParticleSet; flameSet!: ParticleSet; starSet!: ParticleSet;
    flags: WorldFlags = { trees: false, roofs: false, centers: false, shade: false, fuel: false, rxFire: false, defensible: false, harden: false, ring: 0, future: 0 };
    anim = { trees: 0, roofs: 0, centers: 0, shade: 0, fuel: 1, rxFire: 0, defensible: 0, harden: 0, future: 0 };
    progress = 0;
    smooth = 0;
    t = 0;
    private ptr = { x: 0, y: 0 };
    private ptrTarget = { x: 0, y: 0 };
    private focus: Focus | null = null;
    private labelRoot: HTMLDivElement | null = null;
    private labels: FlashLabel[] = [];

    constructor(canvas: HTMLCanvasElement) {
        this.r = new Renderer(canvas);
        this.buildEarth();
        this.buildCity();
        this.buildForest();
    }

    setLabelRoot(el: HTMLDivElement): void { this.labelRoot = el; }
    setPointer(x: number, y: number): void { this.ptrTarget.x = x; this.ptrTarget.y = y; }

    // Brief on-screen label anchored to a world point (interaction feedback).
    flashLabel(text: string, pos: V3, tone: 'good' | 'warm' | 'info'): void {
        if (!this.labelRoot) return;
        const el = document.createElement('div');
        el.className = `flashlabel ${tone}`;
        el.textContent = text;
        this.labelRoot.appendChild(el);
        this.labels.push({ el, pos, born: this.t, ttl: 2.8 });
    }

    // Short cinematic emphasis: the camera leans toward where the change happens.
    pulseFocus(target: V3, lift = 0): void {
        this.focus = { target, lift, start: this.t, until: this.t + 2.6 };
    }

    buildEarth(): void {
        const rand = rng(7);
        const earth = sphereTex(2, 72, 48);
        this.earthMesh = this.r.addMesh(earth, 'earth');
        this.earthMesh.tex = this.r.loadTexture(earthMapUrl);
        const atmo = this.r.setAtmosphere(sphere(2.32, 48, 32, () => [1, 1, 1]), [0.38, 0.62, 1.0]);
        atmo.baseModel = compose(0, 0, 0, 0, 1);
        const starPos: number[] = [];
        for (let i = 0; i < 420; i++) {
            const th = rand() * Math.PI * 2, ph = Math.acos(2 * rand() - 1), rr = 55 + rand() * 60;
            starPos.push(rr * Math.sin(ph) * Math.cos(th), rr * Math.cos(ph), rr * Math.sin(ph) * Math.sin(th));
        }
        this.starSet = new ParticleSet(this.r.gl, 420, 'stars', [0, 0, 0], [0, 0, 0], [1, 1, 1], 0, 1.4, 0.85);
        for (let i = 0; i < 420; i++) {
            this.starSet.pos[i * 3] = starPos[i * 3]; this.starSet.pos[i * 3 + 1] = starPos[i * 3 + 1]; this.starSet.pos[i * 3 + 2] = starPos[i * 3 + 2];
            const b = 0.5 + rand() * 0.5;
            this.starSet.col[i * 4] = b; this.starSet.col[i * 4 + 1] = b; this.starSet.col[i * 4 + 2] = b; this.starSet.col[i * 4 + 3] = 0.9;
            this.starSet.size[i] = 0.5 + rand() * 1.3;
            this.starSet.life[i] = 0; this.starSet.vel[i * 3 + 1] = 0;
        }
        this.starSet.respawn = () => undefined;
        this.r.addParticles(this.starSet);
    }

    buildCity(): void {
        const rand = rng(42);
        const [cx, , cz] = CITY;
        const texA = this.r.loadTexture(facadeAUrl);
        const texB = this.r.loadTexture(facadeBUrl);
        const texAsphalt = this.r.loadTexture(asphaltUrl);
        const statics: Geom[] = [];   // untextured
        const facadesA: Geom[] = [];  // modern glass
        const facadesB: Geom[] = [];  // brick
        const grounds: Geom[] = [];   // asphalt-textured

        // Asphalt ground + darker road strips (textured)
        grounds.push(bake(planeUV(92, 92, [0.62, 0.60, 0.58], 15, 15), compose(cx, -0.05, cz, 0, 1)));
        for (let i = -3; i <= 3; i++) {
            grounds.push(bake(planeUV(2.9, 92, [0.34, 0.34, 0.36], 1, 30), compose(cx + i * 12, 0.0, cz, 0, 1)));
            grounds.push(bake(planeUV(92, 2.9, [0.34, 0.34, 0.36], 30, 1), compose(cx, 0.0, cz + i * 12, 0, 1)));
        }
        // Raised sidewalk blocks
        for (let bx = -2; bx <= 2; bx++) for (let bz = -2; bz <= 2; bz++) {
            statics.push(bake(box(9.5, 0.14, 9.5, [0.48, 0.47, 0.46], [0.55, 0.54, 0.53]), compose(cx + bx * 12 + 6, 0.07, cz + bz * 12 + 6, 0, 1)));
        }
        // Lane dashes on the inner roads
        for (let i = -1; i <= 1; i++) {
            for (let z = -40; z <= 40; z += 3.4) {
                if (Math.abs(z % 12) < 2.4 || Math.abs((z % 12) + 12) < 2.4 || Math.abs((z % 12) - 12) < 2.4) continue;
                statics.push(bake(planeXZ(0.16, 1.5, [0.78, 0.76, 0.68]), compose(cx + i * 12, 0.02, cz + z, 0, 1)));
                statics.push(bake(planeXZ(1.5, 0.16, [0.78, 0.76, 0.68]), compose(cx + z, 0.02, cz + i * 12, 0, 1)));
            }
        }
        // Buildings: textured facades, setbacks, rooftop props
        for (let bx = -2; bx <= 2; bx++) {
            for (let bz = -2; bz <= 2; bz++) {
                const baseX = bx * 12 + 6, baseZ = bz * 12 + 6;
                for (let k = 0; k < 3; k++) {
                    const ox = baseX - 3 + (k % 2) * 5 + (rand() - 0.5);
                    const oz = baseZ - 3 + Math.floor(k / 2) * 6 + (rand() - 0.5);
                    const w = 2.6 + rand() * 1.8, d = 2.6 + rand() * 1.8;
                    const h = 2.5 + rand() * 8;
                    const useA = rand() < 0.55;
                    const tint: V3 = useA ? [0.9 + rand() * 0.25, 0.9 + rand() * 0.22, 0.92 + rand() * 0.2] : [0.92 + rand() * 0.2, 0.88 + rand() * 0.18, 0.85 + rand() * 0.16];
                    const grp = useA ? facadesA : facadesB;
                    const uRep = Math.max(1, Math.round(w / 3.5)), vRep = Math.max(1, Math.round(h / 4));
                    grp.push(bake(boxUV(w, h, d, tint, uRep, vRep), compose(cx + ox, h / 2 + 0.14, cz + oz, 0, 1)));
                    // Roof cap + props
                    statics.push(bake(box(w + 0.16, 0.24, d + 0.16, [0.22, 0.22, 0.24], [0.3, 0.3, 0.32]), compose(cx + ox, h + 0.12, cz + oz, 0, 1)));
                    if (rand() < 0.5) statics.push(bake(box(0.55, 0.5, 0.55, [0.36, 0.36, 0.38]), compose(cx + ox + (rand() - 0.5) * w * 0.5, h + 0.5, cz + oz + (rand() - 0.5) * d * 0.5, 0, 1)));
                    if (rand() < 0.3) statics.push(bake(cylinder(0.32, 0.85, 8, [0.55, 0.5, 0.45]), compose(cx + ox + (rand() - 0.5) * w * 0.4, h + 0.2, cz + oz + (rand() - 0.5) * d * 0.4, 0, 1)));
                    // Setback upper floor on mid-height buildings
                    if (h > 5.5 && h < 8.2) {
                        const uh = 1.6 + rand() * 1.4, uw = w * 0.7, ud = d * 0.7;
                        grp.push(bake(boxUV(uw, uh, ud, tint, Math.max(1, Math.round(uw / 3.5)), Math.max(1, Math.round(uh / 4))), compose(cx + ox, h + 0.24 + uh / 2, cz + oz, 0, 1)));
                        statics.push(bake(box(uw + 0.14, 0.2, ud + 0.14, [0.2, 0.2, 0.22]), compose(cx + ox, h + 0.24 + uh, cz + oz, 0, 1)));
                    }
                    // Cool roof slab (grows in when activated)
                    const roofTop = h > 5.5 && h < 8.2 ? h + 0.24 + 3.0 : h + 0.25;
                    const rm = this.growMesh(box(w * 0.9, 0.16, d * 0.9, [0.97, 0.98, 0.96]), 'city', cx + ox, roofTop, cz + oz, 0);
                    rm.glow = 0.18;
                    this.roofMeshes.push(rm);
                }
                // Street trees: blob canopy + trunk along the block edge
                for (let k = 0; k < 3; k++) {
                    const tx = cx + baseX - 5 + k * 5, tz = cz + baseZ - 6.2;
                    const sc = 0.85 + rand() * 0.4;
                    const tree = merge([
                        bake(cylinder(0.08, 1.15, 5, [0.32, 0.22, 0.13]), compose(0, 0, 0, 0, 1)),
                        bake(sphere(0.78, 7, 5, () => [0.14 + rand() * 0.06, 0.42 + rand() * 0.1, 0.2]), compose(0, 1.5, 0, rand() * 3, sc)),
                        bake(sphere(0.5, 6, 4, () => [0.16 + rand() * 0.06, 0.48 + rand() * 0.08, 0.22]), compose(0.4, 1.9, 0.2, 0, sc)),
                    ]);
                    this.treeMeshes.push(this.growMesh(tree, 'city', tx, 0.14, tz, 0));
                }
                // Shade structures: four posts + canopy
                if ((bx + bz) % 2 === 0) {
                    const sx = cx + baseX, sz = cz + baseZ - 6.2;
                    const posts: Geom[] = [];
                    for (const [px, pz] of [[-2.05, -0.95], [2.05, -0.95], [-2.05, 0.95], [2.05, 0.95]] as const) {
                        posts.push(bake(cylinder(0.05, 2.4, 5, [0.5, 0.52, 0.55]), compose(px, 0, pz, 0, 1)));
                    }
                    posts.push(bake(box(4.5, 0.1, 2.3, [0.92, 0.93, 0.9]), compose(0, 2.42, 0, 0, 1)));
                    this.shadeMeshes.push(this.growMesh(merge(posts), 'city', sx, 0.14, sz, 0));
                }
            }
        }
        // Cars on the inner roads
        const carCols: V3[] = [[0.62, 0.12, 0.10], [0.16, 0.25, 0.5], [0.82, 0.82, 0.85], [0.2, 0.2, 0.23], [0.5, 0.5, 0.55], [0.65, 0.45, 0.2]];
        for (let i = 0; i < 16; i++) {
            const onX = rand() < 0.5;
            const road = (Math.floor(rand() * 3) - 1) * 12;
            const along = -36 + rand() * 72;
            const lane = (rand() < 0.5 ? -0.65 : 0.65);
            const col = carCols[Math.floor(rand() * carCols.length)];
            const px = onX ? cx + road + lane : cx + along;
            const pz = onX ? cz + along : cz + road + lane;
            const ry = onX ? 0 : Math.PI / 2;
            statics.push(bake(merge([
                bake(box(0.8, 0.42, 1.85, col), compose(0, 0.32, 0, 0, 1)),
                bake(box(0.66, 0.32, 0.95, [col[0] * 0.55, col[1] * 0.55, col[2] * 0.6]), compose(0, 0.68, -0.1, 0, 1)),
            ]), compose(px, 0.02, pz, ry + (rand() - 0.5) * 0.05, 1)));
        }
        // Streetlights with warm emissive heads along two roads
        const lampGeoms: Geom[] = [];
        for (const lx of [-12, 12]) for (let z = -24; z <= 24; z += 12) {
            statics.push(bake(cylinder(0.055, 3.3, 5, [0.25, 0.26, 0.28]), compose(cx + lx + 1.8, 0, cz + z, 0, 1)));
            lampGeoms.push(bake(sphere(0.14, 6, 4, () => [1.0, 0.8, 0.5]), compose(cx + lx + 1.8, 3.35, cz + z, 0, 1)));
        }
        const lamps = this.r.addMesh(merge(lampGeoms), 'city');
        lamps.baseModel = lamps.model; lamps.glow = 0.85;
        // Distant skyline silhouettes (avoid the camera sector at +x)
        for (let i = 0; i < 18; i++) {
            const ang = 0.6 + (i / 18) * Math.PI * 2;
            if (Math.abs(((ang + Math.PI) % (Math.PI * 2)) - Math.PI) < 0.55) continue;
            const rr = 52 + rand() * 10;
            const bw = 4 + rand() * 5, bh = 6 + rand() * 13;
            statics.push(bake(box(bw, bh, bw, [0.12, 0.12, 0.15]), compose(cx + Math.cos(ang) * rr, bh / 2 - 0.1, cz + Math.sin(ang) * rr, rand() * 0.4, 1)));
        }
        // Cooling center markers: glowing beacon + ring
        for (const [ox, oz] of [[-18, -14], [8, 10], [22, -20]] as const) {
            const marker = merge([
                bake(cylinder(0.45, 3.4, 10, [0.25, 0.55, 0.95]), compose(0, 0, 0, 0, 1)),
                bake(ringXZ(1.3, 1.8, 24, [0.35, 0.65, 1.0]), compose(0, 0.08, 0, 0, 1)),
                bake(sphere(0.32, 8, 6, () => [0.55, 0.85, 1.0]), compose(0, 3.7, 0, 0, 1)),
            ]);
            const cm = this.growMesh(marker, 'city', cx + ox, 0, cz + oz, 0);
            cm.glow = 0.45;
            this.centerMeshes.push(cm);
        }
        const cityStatic = this.r.addMesh(merge(statics), 'city');
        cityStatic.baseModel = cityStatic.model;
        const groundMesh = this.r.addMesh(merge(grounds), 'city');
        groundMesh.baseModel = groundMesh.model; groundMesh.tex = texAsphalt;
        const fa = this.r.addMesh(merge(facadesA), 'city');
        fa.baseModel = fa.model; fa.tex = texA;
        const fb = this.r.addMesh(merge(facadesB), 'city');
        fb.baseModel = fb.model; fb.tex = texB;
        this.heatSet = new ParticleSet(this.r.gl, 260, 'heat', [cx, 0.5, cz], [70, 6, 70], [1.0, 0.55, 0.25], 1.6, 2.2, 0.30);
        this.r.addParticles(this.heatSet);
    }

    buildForest(): void {
        const rand = rng(99);
        const [fx, , fz] = FOREST;
        const texForest = this.r.loadTexture(forestFloorUrl);
        const geoms: Geom[] = [];
        // Distant mountain silhouettes (avoid the camera sector at +x)
        for (let i = 0; i < 9; i++) {
            const ang = 2.1 + (i / 9) * Math.PI * 2;
            const rr = 132 + rand() * 16;
            const mw = 24 + rand() * 12, mh = 8 + rand() * 5;
            geoms.push(bake(cone(mw, mh, 5, [0.16, 0.17, 0.23]), compose(fx + Math.cos(ang) * rr, -0.5, fz + Math.sin(ang) * rr, rand() * 3, 1)));
        }
        // Layered conifers, dry snags, rocks, stumps
        const camSpots: V3[] = [[30, 0, 26], [24, 0, 22], [21, 0, 17]];
        for (let i = 0; i < 120; i++) {
            const tx = fx - 40 + rand() * 80, tz = fz - 40 + rand() * 80;
            if (Math.hypot(tx - fx - HOUSE_LOCAL[0], tz - fz - HOUSE_LOCAL[2]) < 14) continue;
            if (camSpots.some(c => Math.hypot(tx - fx - c[0], tz - fz - c[2]) < 8)) continue;
            const dry = rand() < 0.45;
            const sc = 0.75 + rand() * 0.8;
            if (rand() < 0.08) { // standing dead snag
                geoms.push(bake(cylinder(0.09, 3.4 * sc, 5, [0.42, 0.36, 0.3]), compose(tx, 0, tz, 0, 1)));
                continue;
            }
            const g: [number, number, number] = dry ? [0.5 + rand() * 0.1, 0.4 + rand() * 0.06, 0.18] : [0.11 + rand() * 0.05, 0.32 + rand() * 0.08, 0.16];
            geoms.push(bake(merge([
                bake(cylinder(0.12, 1.0, 5, [0.3, 0.22, 0.13]), compose(0, 0, 0, 0, 1)),
                bake(cone(1.15, 1.8, 7, g), compose(0, 0.7, 0, rand() * 3, 1)),
                bake(cone(0.85, 1.5, 7, [g[0] * 1.06, g[1] * 1.06, g[2] * 1.06]), compose(0, 1.75, 0, rand() * 3, 1)),
                bake(cone(0.5, 1.2, 6, [g[0] * 1.12, g[1] * 1.12, g[2] * 1.12]), compose(0, 2.7, 0, rand() * 3, 1)),
            ]), compose(tx, 0, tz, rand() * 3, sc)));
        }
        for (let i = 0; i < 10; i++) { // rocks
            const rx = fx - 36 + rand() * 72, rz = fz - 36 + rand() * 72;
            if (Math.hypot(rx - fx - HOUSE_LOCAL[0], rz - fz - HOUSE_LOCAL[2]) < 8) continue;
            const rs = 0.4 + rand() * 0.8;
            geoms.push(bake(box(1.2 * rs, 0.55 * rs, 0.9 * rs, [0.42, 0.41, 0.43], [0.5, 0.49, 0.5]), compose(rx, 0.08, rz, rand() * 3, 1)));
        }
        for (let i = 0; i < 6; i++) { // stumps
            const a = rand() * Math.PI * 2, rr = 16 + rand() * 18;
            geoms.push(bake(cylinder(0.28, 0.5, 7, [0.36, 0.27, 0.17]), compose(fx + Math.cos(a) * rr, 0, fz + Math.sin(a) * rr, 0, 1)));
        }
        // House: walls, trim, door, chimney, glowing windows
        const hx = fx + HOUSE_LOCAL[0], hz = fz + HOUSE_LOCAL[2];
        geoms.push(bake(box(4.2, 2.4, 3.4, [0.8, 0.74, 0.64]), compose(hx, 1.2, hz, 0, 1)));
        geoms.push(bake(box(0.9, 1.6, 0.12, [0.35, 0.24, 0.16]), compose(hx - 0.8, 0.8, hz + 1.74, 0, 1)));
        geoms.push(bake(box(0.45, 1.0, 0.45, [0.5, 0.42, 0.38]), compose(hx + 1.3, 2.9, hz - 0.6, 0, 1)));
        geoms.push(bake(box(4.6, 0.14, 4.0, [0.55, 0.5, 0.45]), compose(hx, 0.07, hz, 0, 1))); // porch slab
        const winGeoms: Geom[] = [
            bake(quadW(0.6, 0.75, [1.0, 0.82, 0.5]), compose(hx + 0.9, 1.35, hz + 1.72, 0, 1)),
            bake(quadW(0.6, 0.75, [1.0, 0.82, 0.5]), compose(hx - 0.5, 1.35, hz + 1.72, 0, 1)),
        ];
        const windows = this.r.addMesh(merge(winGeoms), 'forest');
        windows.baseModel = windows.model; windows.glow = 0.8;
        this.roofOld = this.r.addMesh(bake(prism(4.6, 1.4, 3.8, [0.42, 0.3, 0.2]), compose(0, 0, 0, 0, 1)), 'forest');
        this.roofOld.baseModel = compose(hx, 2.4, hz, 0, 1);
        this.roofOld.growMode = 'y';
        this.roofNew = this.r.addMesh(bake(prism(4.6, 1.4, 3.8, [0.58, 0.6, 0.63]), compose(0, 0, 0, 0, 1)), 'forest');
        this.roofNew.baseModel = compose(hx, 2.4, hz, 0, 1);
        this.roofNew.growMode = 'y'; this.roofNew.grow = 0.001; this.roofNew.glow = 0.12;
        // Dry brush clusters
        for (let c = 0; c < 14; c++) {
            const ang = rand() * Math.PI * 2, rr = 2.5 + rand() * 11;
            const cxp = HOUSE_LOCAL[0] + Math.cos(ang) * rr, czp = HOUSE_LOCAL[2] + Math.sin(ang) * rr;
            const cluster: Geom[] = [];
            for (let i = 0; i < 5; i++) {
                cluster.push(bake(cone(0.45 + rand() * 0.4, 0.8 + rand() * 0.7, 5, [0.55, 0.42, 0.18]), compose((rand() - 0.5) * 3, 0, (rand() - 0.5) * 3, rand() * 3, 1)));
            }
            this.brushMeshes.push(this.growMesh(merge(cluster), 'forest', fx + cxp, 0, fz + czp, rand() * 3));
        }
        for (let c = 0; c < 8; c++) {
            const cxp = -36 + rand() * 72, czp = -36 + rand() * 72;
            const cluster: Geom[] = [];
            for (let i = 0; i < 3; i++) {
                cluster.push(bake(cone(0.6 + rand() * 0.4, 1.0 + rand() * 0.8, 5, [0.52, 0.4, 0.17]), compose((rand() - 0.5) * 3, 0, (rand() - 0.5) * 3, rand() * 3, 1)));
            }
            this.brushMeshes.push(this.growMesh(merge(cluster), 'forest', fx + cxp, 0, fz + czp, rand() * 3));
        }
        // Scorch disc that fades in under prescribed fire
        const scorch = this.r.addMesh(bake(ringXZ(0.01, 6.4, 40, [0.09, 0.08, 0.07]), compose(0, 0, 0, 0, 1)), 'forest');
        scorch.baseModel = compose(hx, 0.04, hz - 8, 0, 1);
        scorch.growMode = 'uniform'; scorch.grow = 0.001;
        this.scorchMesh = scorch;
        // Ignition zone rings (conceptual: zone distances are illustrative, not to scale)
        const ringCols: V3[] = [[0.95, 0.35, 0.2], [0.95, 0.7, 0.2], [0.35, 0.75, 0.35]];
        const ringRad: [number, number][] = [[3.2, 3.8], [6.4, 6.9], [11.2, 11.6]];
        for (let i = 0; i < 3; i++) {
            const rm = this.r.addMesh(bake(ringXZ(ringRad[i][0], ringRad[i][1], 48, ringCols[i]), compose(0, 0, 0, 0, 1)), 'forest');
            rm.baseModel = compose(hx, 0.05 + i * 0.02, hz, 0, 1);
            rm.glow = 0.0;
            this.ringMeshes.push(rm);
        }
        const forestStatic = this.r.addMesh(merge(geoms), 'forest');
        forestStatic.baseModel = forestStatic.model;
        const ground = this.r.addMesh(bake(planeUV(92, 92, [1.0, 0.98, 0.92], 18, 18), compose(fx, -0.05, fz, 0, 1)), 'forest');
        ground.baseModel = ground.model; ground.tex = texForest;
        this.emberSet = new ParticleSet(this.r.gl, 200, 'ember', [fx, 0.4, fz], [70, 5, 70], [1.0, 0.45, 0.12], 1.2, 1.6, 0.55);
        this.smokeSet = new ParticleSet(this.r.gl, 320, 'smoke', [fx, 1.5, fz], [75, 8, 75], [0.55, 0.54, 0.55], 0.5, 9.0, 0.16);
        this.smokeSet.intensity = 0;
        this.flameSet = new ParticleSet(this.r.gl, 180, 'flame', [hx, 0.2, hz - 8], [14, 1, 5], [1.0, 0.5, 0.1], 2.6, 2.6, 0.7);
        this.flameSet.intensity = 0;
        this.r.addParticles(this.emberSet);
        this.r.addParticles(this.smokeSet);
        this.r.addParticles(this.flameSet);
    }

    scorchMesh!: Mesh;

    growMesh(g: Geom, area: string, tx: number, ty: number, tz: number, ry: number): Mesh {
        const m = this.r.addMesh(g, area);
        m.baseModel = compose(tx, ty, tz, ry, 1);
        m.growMode = 'uniform';
        m.grow = 0.001;
        return m;
    }

    setFlag(name: keyof WorldFlags, value: boolean | number): void {
        (this.flags as Record<string, boolean | number>)[name] = value;
    }

    setProgress(p: number): void { if (!Number.isFinite(p)) return; this.progress = Math.max(0, Math.min(1, p)); }

    frame(dt: number): void {
        this.t += dt;
        const lerpTo = (cur: number, target: number, speed: number) => cur + (target - cur) * Math.min(1, dt * speed);
        const a = this.anim, f = this.flags;
        a.trees = lerpTo(a.trees, f.trees ? 1 : 0, 2.2);
        a.roofs = lerpTo(a.roofs, f.roofs ? 1 : 0, 2.2);
        a.centers = lerpTo(a.centers, f.centers ? 1 : 0, 2.2);
        a.shade = lerpTo(a.shade, f.shade ? 1 : 0, 2.2);
        a.fuel = lerpTo(a.fuel, f.fuel ? 0 : 1, 2.2);
        a.defensible = lerpTo(a.defensible, f.defensible ? 1 : 0, 2.2);
        a.rxFire = lerpTo(a.rxFire, f.rxFire ? 1 : 0, 1.6);
        a.future = lerpTo(a.future, f.future, 1.8);

        // Smooth the scroll-driven progress so the camera glides
        this.smooth = lerpTo(this.smooth, this.progress, 4.5);

        if (!Number.isFinite(this.smooth)) this.smooth = this.progress;
        const n = STOPS.length - 1;
        const sp = Math.max(0, Math.min(n - 1e-6, this.smooth * n));
        const i0 = Math.min(n - 1, Math.floor(sp));
        let frac = sp - i0;
        frac = frac * frac * (3 - 2 * frac);
        const s0 = STOPS[i0], s1 = STOPS[i0 + 1];
        const mix3 = (u: V3, v: V3): V3 => [u[0] + (v[0] - u[0]) * frac, u[1] + (v[1] - u[1]) * frac, u[2] + (v[2] - u[2]) * frac];
        let eye = mix3(s0.eye, s1.eye);
        let ctr = mix3(s0.ctr, s1.ctr);
        let sky = mix3(s0.sky, s1.sky);
        let fog = mix3(s0.fog, s1.fog);
        let den = s0.den + (s1.den - s0.den) * frac;
        den += Math.sin(Math.PI * frac) * 0.035;

        const w0 = AREAS_BY_STOP[i0], w1 = AREAS_BY_STOP[i0 + 1];
        const areaWeights: Record<string, number> = {};
        for (const k of Object.keys(w0)) areaWeights[k] = w0[k] + (w1[k] - w0[k]) * frac;

        const s = this.smooth * 10;
        const fut = a.future * areaWeights.city * (s > 8.4 && s < 9.9 ? 1 : 0);
        if (fut > 0.01) {
            sky = [sky[0] + 0.10 * fut, sky[1] + 0.14 * fut, sky[2] + 0.10 * fut];
            fog = [fog[0] + 0.12 * fut, fog[1] + 0.16 * fut, fog[2] + 0.12 * fut];
        }
        const cityHeat = areaWeights.city > 0 ? Math.max(0.05, 1 - a.trees * 0.4 - a.roofs * 0.25 - a.shade * 0.2 - fut * 0.7) : 0;
        this.heatSet.intensity = cityHeat;
        this.heatSet.active = this.heatSet.intensity > 0.02;
        this.emberSet.intensity = areaWeights.forest * Math.max(0.1, a.fuel) * (1 - a.rxFire * 0.6);
        this.emberSet.active = this.emberSet.intensity > 0.02;
        const smokeTarget = s > 6.4 && s < 7.7 ? 1 : 0.25 * areaWeights.forest * (1 - (1 - a.fuel) * 0.5);
        this.smokeSet.intensity = lerpTo(this.smokeSet.intensity, smokeTarget, 1.5);
        this.smokeSet.active = this.smokeSet.intensity > 0.02 && areaWeights.forest > 0;
        this.flameSet.intensity = a.rxFire * areaWeights.forest;
        this.flameSet.active = this.flameSet.intensity > 0.02;
        this.starSet.intensity = areaWeights.earth;
        this.starSet.active = areaWeights.earth > 0.02;

        const gTrees = Math.max(0.001, Math.min(1, a.trees + fut * 0.9));
        const gRoofs = Math.max(0.001, Math.min(1, a.roofs + fut * 0.9));
        const gShade = Math.max(0.001, Math.min(1, a.shade + fut * 0.5));
        const gCenters = Math.max(0.001, Math.min(1, a.centers + fut * 0.9));
        for (const m of this.treeMeshes) m.grow = gTrees;
        for (const m of this.roofMeshes) m.grow = gRoofs;
        for (const m of this.shadeMeshes) m.grow = gShade;
        for (const m of this.centerMeshes) m.grow = gCenters;
        const brushLeft = Math.max(0.02, a.fuel * (1 - a.rxFire * 0.55) * (1 - a.defensible * 0.75));
        for (const m of this.brushMeshes) m.grow = brushLeft;
        this.scorchMesh.grow = Math.max(0.001, a.rxFire);
        this.roofOld.grow = Math.max(0.001, 1 - a.harden);
        this.roofNew.grow = Math.max(0.001, a.harden);
        for (let i = 0; i < this.ringMeshes.length; i++) {
            const on = f.ring === i + 1;
            this.ringMeshes[i].grow = on ? 1 + Math.sin(this.t * 4) * 0.05 : 1;
            this.ringMeshes[i].glow = on ? 0.55 : 0;
        }
        this.earthMesh.baseModel = compose(0, 0, 0, this.t * 0.12, 1);
        if (this.r.atmoMesh) this.r.atmoMesh.baseModel = compose(0, 0, 0, 0, 1);

        // Cinematic focus pulse toward the thing that just changed
        if (this.focus) {
            const fo = this.focus;
            if (this.t > fo.until) this.focus = null;
            else {
                const age = this.t - fo.start, left = fo.until - this.t;
                const k = Math.min(1, age / 0.5, left / 0.8);
                const kk = k * k * (3 - 2 * k) * 0.62;
                ctr = [ctr[0] + (fo.target[0] - ctr[0]) * kk, ctr[1] + (fo.target[1] - ctr[1]) * kk, ctr[2] + (fo.target[2] - ctr[2]) * kk];
                eye = [eye[0] + (fo.target[0] - eye[0]) * kk * 0.4, eye[1] + (fo.target[1] + fo.lift - eye[1]) * kk * 0.4, eye[2] + (fo.target[2] - eye[2]) * kk * 0.4];
            }
        }

        const bob = Math.sin(this.t * 0.5) * 0.08;
        // Pull the camera back on narrow (portrait) viewports so scenes stay framed.
        const asp0 = this.r.canvas.clientWidth / Math.max(1, this.r.canvas.clientHeight);
        const pull = asp0 < 1 ? 1 + (1 - asp0) * 1.25 : 1;
        // Pointer parallax
        this.ptr.x = lerpTo(this.ptr.x, this.ptrTarget.x, 3);
        this.ptr.y = lerpTo(this.ptr.y, this.ptrTarget.y, 3);
        const dx = eye[0] - ctr[0], dz = eye[2] - ctr[2];
        const dl = Math.hypot(dx, dz) || 1;
        const rx = dz / dl, rz = -dx / dl; // right vector on the ground plane
        const pk = Math.min(6, dl * 0.06);
        const eyeB: V3 = [
            ctr[0] + (eye[0] - ctr[0]) * pull + rx * this.ptr.x * pk,
            ctr[1] + (eye[1] + bob - ctr[1]) * pull + this.ptr.y * pk * 0.5,
            ctr[2] + (eye[2] - ctr[2]) * pull + rz * this.ptr.x * pk,
        ];

        // Flash labels follow their world anchors
        for (let i = this.labels.length - 1; i >= 0; i--) {
            const L = this.labels[i];
            const age = this.t - L.born;
            if (age > L.ttl) { L.el.remove(); this.labels.splice(i, 1); continue; }
            const scr = this.r.project(L.pos);
            if (!scr) { L.el.style.opacity = '0'; continue; }
            const fadeIn = Math.min(1, age / 0.25), fadeOut = Math.min(1, (L.ttl - age) / 0.6);
            L.el.style.opacity = String(Math.min(fadeIn, fadeOut));
            L.el.style.transform = `translate(${Math.round(scr.x)}px, ${Math.round(scr.y - age * 14)}px) translate(-50%, -100%)`;
        }

        for (const ps of this.r.sets) ps.update(dt);

        const light: V3 = areaWeights.earth > 0.5 ? [0.5, 0.65, 1.15] : [0.6, 1.0, 0.45];
        const aspect = this.r.canvas.clientWidth / Math.max(1, this.r.canvas.clientHeight);
        this.r.render(eyeB, ctr, sky, fog, den, light, areaWeights, aspect);
    }
}
