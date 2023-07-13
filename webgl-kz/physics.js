'use strict';

const EPSILON = Math.pow(2, -10);

class Plane {
    constructor (p1, p2, p3) {
        this.vn = vec3.normalize(vec3.create(), vec3.cross(vec3.create(),
            vec3.sub(vec3.create(), p2, p1),
            vec3.sub(vec3.create(), p3, p2),
        ));
        this.d0 = vec3.dot(this.vn, p1);
    }
    timeCross(pos, vel, prefTouch = false) {
        const ndis = this.distance(pos);
        const nvec = vec3.dot(this.vn, vel);
        if (ndis < -EPSILON) return ndis;       // behind
        if (prefTouch) {
            if (ndis < +EPSILON) return 0;          // near
            if (nvec > -EPSILON) return Infinity;   // leaving
        } else {
            if (nvec > -EPSILON) return Infinity;   // leaving
            if (ndis < +EPSILON) return 0;          // near
        }
        return ndis / -nvec;
    }
    distance(pos) {
        return vec3.dot(this.vn, pos) - this.d0;
    }
};

class ConvexPolyhedron {
    constructor (points, indexs, noUpdate = false) {
        this.points = points;
        this.indexs = indexs;
        if (!noUpdate) this.updateFaces();
        return this;
    }
    updateFaces() {
        this.faces = this.indexs.map(([i, j, k]) =>
            new Plane(this.points[i], this.points[j], this.points[k]));
    }
    translate(d, noUpdate = false) {
        this.points.forEach(p => { p[0] += d[0]; p[1] += d[1]; p[2] += d[2]; });
        if (!noUpdate) this.updateFaces();
        return this;
    }
    intersect(that) {
        const p0 = this.points;
        const f0 = this.faces;
        const p1 = that.points;
        const f1 = that.faces;
        f0: for (const f of f0) {
            for (const p of p1)
                if (f.distance(p) < -EPSILON) continue f0;
            return false; // is a separation plane
        }
        f1: for (const f of f1) {
            for (const p of p0)
                if (f.distance(p) < -EPSILON) continue f1;
            return false; // is a separation plane
        }
        return true;
    }
    timeCollide(that, v, prefTouch = false) {
        const p0 = this.points;
        const f0 = this.faces;
        const p1 = that.points;
        const f1 = that.faces;
        let t_f0 = -Infinity;
        let n_f0 = null;
        for (const f of f0) {
            let min = Infinity;
            for (const p of p1) min = Math.min(min, f.timeCross(p, v, prefTouch));
            if (-EPSILON <= t_f0 && t_f0 <= 0 && -EPSILON <= min && min <= 0)
                return [Infinity, null]; // touching two faces, skip
            if (min >= t_f0) {
                t_f0 = min;
                n_f0 = f.vn;
            }
        }
        let t_f1 = -Infinity;
        let n_f1 = null;
        const negv = vec3.negate(vec3.create(), v);
        for (const f of f1) {
            let min = Infinity;
            for (const p of p0) min = Math.min(min, f.timeCross(p, negv, prefTouch));
            if (-EPSILON <= t_f1 && t_f1 <= 0 && -EPSILON <= min && min <= 0)
                return [Infinity, null]; // touching two faces, skip
            if (min >= t_f1) {
                t_f1 = min;
                n_f1 = vec3.negate(vec3.create(), f.vn);
            }
        }
        return t_f0 >= t_f1 ? [t_f0, n_f0] : [t_f1, n_f1];
    }
};

class PUtil {
    static clipNormal(n, v) {
        const nvec = vec3.dot(n, v);
        const nsqr = vec3.sqrLen(n);
        if (nvec > -EPSILON) return v; // same direction
        return vec3.scaleAndAdd(vec3.create(), v, n, -(nvec / nsqr));
    }
};