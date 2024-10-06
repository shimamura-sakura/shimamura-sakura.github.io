'use strict';

const META_LENGTH = 7;
const eInput = document.getElementById('input');
const btnScr = document.getElementById('btn_scr');
const btnOrg = document.getElementById('btn_org');
const picLnk = document.getElementById('link');
const cvs = document.getElementById('canvas');
const dvs = new OffscreenCanvas(0, 0);
const ctx = cvs.getContext('2d');
const dtx = dvs.getContext('2d');
const tmp = new Image();

eInput.onchange = function () {
    if (this.files[0]?.type.startsWith('image'))
        tmp.src = URL.createObjectURL(this.files[0]);
};

tmp.onload = function () {
    URL.revokeObjectURL(this.src);
    cvs.width = this.width;
    cvs.height = this.height;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.drawImage(this, 0, 0);
    tryUnscramble();
    dvs.width = cvs.width;
    dvs.height = cvs.height;
    dtx.clearRect(0, 0, dvs.width, dvs.height);
    dtx.drawImage(cvs, 0, 0);
    updateLink();
    btnOrg.disabled = true; // always original after load
};

function makeScramble(width, height, rngFuncObj) {
    const newW = (width + 7) & ~7;
    const newH = (height + 7) & ~7;
    const aLeftTops = [];
    for (let x = 0; x < width; x += 8)
        for (let y = 0; y < height; y += 8)
            aLeftTops.push([x, y]);
    const bLeftTops = aLeftTops.slice();
    shuffle(bLeftTops, rngFuncObj);
    return { newW, newH, aLeftTops, bLeftTops };
}

function doScramble() {
    const seed = sfc32RandSeed(Math.random);
    const meta = createMeta(seed, cvs.width, cvs.height);
    console.assert(meta.length == META_LENGTH);
    const plan = makeScramble(cvs.width, cvs.height, sfc32New(seed));
    const metH = Math.ceil(META_LENGTH * 32 * 8 / plan.newW) * 8;
    cvs.width = plan.newW;
    cvs.height = plan.newH + metH;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    for (const [[sx, sy], [dx, dy]] of zipIter(plan.aLeftTops, plan.bLeftTops))
        ctx.drawImage(dvs, sx, sy, 8, 8, dx, dy + metH, 8, 8);
    drawMeta(ctx, meta, plan.newW);
    updateLink();
    btnOrg.disabled = false; // not original after scramble
}

function tryUnscramble() {
    if (cvs.width % 8 != 0) return;
    if (cvs.height % 8 != 0) return;
    const metH = Math.ceil(META_LENGTH * 32 * 8 / cvs.width) * 8;
    if (cvs.height < metH) return;
    const mObj = readMeta(ctx, cvs.width);
    if (!mObj) return;
    const plan = makeScramble(mObj.width, mObj.height, sfc32New(mObj.seed));
    dvs.width = mObj.width;
    dvs.height = mObj.height;
    dtx.clearRect(0, 0, dvs.width, dvs.height);
    for (const [[sx, sy], [dx, dy]] of zipIter(plan.bLeftTops, plan.aLeftTops))
        dtx.drawImage(cvs, sx, sy + metH, 8, 8, dx, dy, 8, 8);
    cvs.width = dvs.width;
    cvs.height = dvs.height;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.drawImage(dvs, 0, 0);
}

// https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
function sfc32New([a, b, c, d]) {
    return function () {
        a |= 0; b |= 0; c |= 0; d |= 0;
        var t = (a + b | 0) + d | 0;
        d = d + 1 | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    };
}

function sfc32RandSeed(rngFunc) {
    return new Uint32Array([0, 1, 2, 3].map(_ => 0 | (rngFunc() * 4294967296)));
}

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array, rngFuncObj) {
    let i = array.length, j;
    while (i > 0) {
        j = Math.floor(rngFuncObj() * i);
        i--;
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

function* zipIter(...iterables) {
    const iterators = iterables.map(v => v[Symbol.iterator]());
    while (true) {
        const results = iterators.map(v => v.next());
        if (!results.every(v => !v.done)) return;
        yield results.map(v => v.value);
    }
}

// https://stackoverflow.com/questions/6122571/simple-non-secure-hash-function-for-javascript
function hashString(str) {
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
        let chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return new Uint32Array([hash])[0];
}

function createMeta(seed, width, height) {
    const meta = [...seed, width, height];
    meta.push(hashString(meta.toString()));
    return new Uint32Array(meta);
}

function drawMeta(ctx, meta, width) {
    let x = 0, y = 0;
    const bits = Array.from(meta).map(v => v.toString(2).padStart(32, '0')).join('');
    for (const b of bits) {
        if (x >= width) y += 8, x = 0;
        ctx.fillStyle = b == '0' ? 'white' : 'black';
        ctx.fillRect(x, y, 8, 8);
        x += 8;
    }
}

function readMeta(ctx, width) {
    let x = 0, y = 0;
    const nbit = META_LENGTH * 32;
    const bits = [];
    for (let i = 0; i < nbit; i++) {
        if (x >= width) y += 8, x = 0;
        let pxsum = - 8 * 8 * 255; // remove all alpha value
        for (const v of ctx.getImageData(x, y, 8, 8).data) pxsum += v;
        const pxavg = pxsum / (8 * 8 * 3);
        bits.push(pxavg > 127.5 ? '0' : '1');
        x += 8;
    }
    const bstr = bits.join('');
    const meta = [];
    for (let i = 0; i < bstr.length; i += 32)
        meta.push(parseInt(bstr.substring(i, i + 32), 2));
    const hash = meta.pop();
    if (hashString(meta.toString()) != hash) return null;
    return {
        seed: new Uint32Array(meta.slice(0, 4)),
        width: meta[4], height: meta[5],
    };
}

function updateLink() {
    if (picLnk.href) URL.revokeObjectURL(picLnk.href);
    picLnk.removeAttribute('href');
    cvs.toBlob(function (blob) {
        picLnk.href = URL.createObjectURL(blob);
    });
}

btnScr.onclick = function () {
    doScramble();
};

btnOrg.onclick = function () {
    cvs.width = dvs.width;
    cvs.height = dvs.height;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.drawImage(dvs, 0, 0);
    updateLink();
    btnOrg.disabled = true; // original after reset
};