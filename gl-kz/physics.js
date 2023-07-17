'use strict';

const EPSILON = Math.pow(2, -10);

class BSPWorld {
    constructor (root) {
        this.root = root;
    }
    traceHull(hull, vel) {
        let hits = [];
        let hvel = hull.v.map(v => vec3.add(vec3.create(), v, vel));
        traverseBSP(this.root, hull, hvel, vel, hits);
        return hits;
    }
}

function traverseBSP(root, hull, hvel, vel, hits) {
    if (Array.isArray(root)) {
        // Leaf: [Brush]
        for (const brush of root)
            hits.push(time_TwoBrush(brush, hull, vel));
    } else {
        // Node: { n: Vec4, f: Node|Leaf, b: Node|Leaf }
        let in_f = false;
        let in_b = false;
        for (const v of hull.v) {
            let dist = vec3.dot(v, root.n) + root.n[3];
            if (dist >= 0) in_f = true;
            if (dist <= 0) in_b = true;
        }
        for (const v of hvel) {
            let dist = vec3.dot(v, root.n) + root.n[3];
            if (dist >= 0) in_f = true;
            if (dist <= 0) in_b = true;
        }
        if (in_f) traverseBSP(root.f, hull, hvel, vel, hits);
        if (in_b) traverseBSP(root.b, hull, hvel, vel, hits);
    }
}

function time_PlaneVert(n, vtx, vel) {
    const ndis = vec3.dot(vtx, n) + n[3];
    const nvec = vec3.dot(vel, n);
    if (ndis < -EPSILON) return ndis;       // behind
    if (nvec > -EPSILON) return Infinity;   // leaving
    if (ndis < +EPSILON) return 0;          // near
    return ndis / -nvec;
}

function time_TwoBrush(b0, b1, vel) {
    // BRUSH: { n: [NORMAL], v: [VERTEX] }
    let t_f0 = -Infinity;
    let n_f0 = null;
    let t_f1 = -Infinity;
    let n_f1 = null;
    for (const n of b0.n) {
        let min = Infinity;
        for (const v of b1.v) min = Math.min(min, time_PlaneVert(n, v, vel));
        if (-EPSILON <= t_f0 && t_f0 <= 0 && -EPSILON <= min && min <= 0)
            return [Infinity, null]; // touching two faces, skip
        if (min >= t_f0) {
            t_f0 = min;
            n_f0 = n;
        }
    }
    let negv = vec3.negate(vec3.create(), vel);
    for (const n of b1.n) {
        let min = Infinity;
        for (const v of b0.v) min = Math.min(min, time_PlaneVert(n, v, negv));
        if (-EPSILON <= t_f1 && t_f1 <= 0 && -EPSILON <= min && min <= 0)
            return [Infinity, null]; // touching two faces, skip
        if (min >= t_f1) {
            t_f1 = min;
            n_f1 = vec3.negate(vec3.create(), n);
        }
    }
    return t_f0 >= t_f1 ? { t: t_f0, n: n_f0 } : { t: t_f1, n: n_f1 };
}

function createAxisHull(pos, mins, maxs) {
    let pmin = vec3.add(vec3.create(), pos, mins);
    let pmax = vec3.add(vec3.create(), pos, maxs);
    return {
        n: [
            [+1, 0, 0, -pmax[0]],
            [-1, 0, 0, +pmin[0]],
            [0, +1, 0, -pmax[1]],
            [0, -1, 0, +pmin[1]],
            [0, 0, +1, -pmax[2]],
            [0, 0, -1, +pmin[2]],
        ],
        v: [
            [pmin[0], pmin[1], pmin[2]],
            [pmin[0], pmin[1], pmax[2]],
            [pmin[0], pmax[1], pmin[2]],
            [pmin[0], pmax[1], pmax[2]],
            [pmax[0], pmin[1], pmin[2]],
            [pmax[0], pmin[1], pmax[2]],
            [pmax[0], pmax[1], pmin[2]],
            [pmax[0], pmax[1], pmax[2]],
        ],
    };
}

function clipNormal(n, v) {
    const nvec = vec3.dot(n, v);
    const nsqr = vec3.sqrLen(n);
    if (nvec > -EPSILON) return v; // same direction
    return vec3.scaleAndAdd(vec3.create(), v, n, -(nvec / nsqr));
}