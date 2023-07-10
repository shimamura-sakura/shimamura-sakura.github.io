'use strict';

const EPSILON = Number.EPSILON;

class Plane3D {
    constructor (p1, p2, p3) {
        this.vn = vec3.normalize(vec3.create(), vec3.cross(vec3.create(),
            vec3.sub(vec3.create(), p2, p1),
            vec3.sub(vec3.create(), p3, p2),
        ));
        this.d0 = vec3.dot(this.vn, p1);
    }
    timeTouch(p, v) {
        const ndis = vec3.dot(this.vn, p) - this.d0;
        const nvec = vec3.dot(this.vn, v);
        if (ndis < -EPSILON) return ndis;
        if (ndis < +EPSILON) return 0;
        if (nvec > -EPSILON) return Infinity;
        return ndis / -nvec;
    }
}

class Body3D {
    constructor (points, indexs) {
        this.points = points;
        this.indexs = indexs;
        this.#updateFaces();
    }
    #updateFaces() {
        return this.faces = this.indexs.map(([i1, i2, i3]) =>
            new Plane3D(this.points[i1], this.points[i2], this.points[i3]));
    }
    move([dx, dy, dz]) {
        this.points.forEach(p => { p[0] += dx; p[1] += dy; p[2] += dz; });
        this.#updateFaces();
        return this;
    }
    collide(that, v) {
        const p0 = this.points;
        const f0 = this.faces;
        const p1 = that.points;
        const f1 = that.faces;
        let max_dt = -Infinity;
        let normal = null;
        for (const f of f0) {
            let min = Infinity;
            for (const p of p1)
                min = Math.min(min, f.timeTouch(p, v));
            if (min - max_dt > -EPSILON) {
                max_dt = min;
                normal = f.vn;
            }
        }
        const negv = vec3.negate(vec3.create(), v);
        for (const f of f1) {
            let min = Infinity;
            for (const p of p0)
                min = Math.min(min, f.timeTouch(p, negv));
            if (min - max_dt > -EPSILON) {
                max_dt = min;
                normal = vec3.negate(vec3.create(), f.vn);
            }
        }
        return [max_dt, normal];
    }
}

function clipNormal(n, v) {
    const nvec = vec3.dot(n, v);
    const nsqr = vec3.sqrLen(n);
    if (nvec > -EPSILON) return v;
    const k = -(nvec / nsqr);
    return vec3.scaleAndAdd(vec3.create(), v, n, k);
}