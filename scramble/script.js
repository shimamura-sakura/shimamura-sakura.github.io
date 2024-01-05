'use strict';

const META_MAGIC = 0x494d5367; // "IMSC"

/** @type{HTMLCanvasElement} */
const cvs = document.getElementById('canvas');
const ctx = cvs.getContext('2d');
const btnRst = document.getElementById('btn_rst');
const dlLink = document.getElementById('link');

/** @type{ImageBitmap} */
var currImage = null;
document.getElementById('input').onchange = async function () {
    try {
        currImage = await createImageBitmap(this.files[0]);
        cvs.width = currImage.width;
        cvs.height = currImage.height;
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        ctx.drawImage(currImage, 0, 0);
        await tryUnscramble();
        btnRst.disabled = true;
        createLink();
    } catch {
        alert('can\'t load image');
    }
};

function createLink() {
    if (dlLink.href) URL.revokeObjectURL(dlLink.href);
    cvs.toBlob(function (blob) {
        dlLink.href = URL.createObjectURL(blob);
    });
}

btnRst.onclick = function () {
    if (currImage === null) {
        alert('load an image first');
        return;
    }
    cvs.width = currImage.width;
    cvs.height = currImage.height;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.drawImage(currImage, 0, 0);
    btnRst.disabled = true;
    createLink();
};

document.getElementById('btn_scr').onclick = function () {
    if (currImage === null) {
        alert('load an image first');
        return;
    }
    const seed = sfc32RandSeed(Math.random);
    const plan = makeScramble(currImage.width, currImage.height, sfc32New(...seed));
    const meta = new Uint32Array(8); // 256 bits
    const metaHeight = 8 * Math.ceil(256 * 8 / plan.newWidth);
    meta[0] = META_MAGIC;
    meta[1] = metaHeight;
    meta[2] = currImage.width;
    meta[3] = currImage.height;
    meta.set(seed, 4);
    cvs.width = plan.newWidth;
    cvs.height = plan.newHeight + metaHeight;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    drawMetadata(ctx, cvs.width, meta);
    for (var i = 0; i < plan.nBlocks; i++) {
        const [sx, sy] = plan.origLeftTops[i];
        const [dx, dy] = plan.shufLeftTops[i];
        const w = Math.min(8, currImage.width - sx);
        const h = Math.min(8, currImage.height - sy);
        ctx.drawImage(currImage, sx, sy, w, h, dx, dy + metaHeight, w, h);
    }
    createLink();
    btnRst.disabled = false;
};

async function tryUnscramble() {
    const meta = readMetadata(ctx, cvs.width, cvs.height);
    if (meta === null) return;
    if (meta[0] !== 0x494d5367) return;
    const width = meta[2];
    const height = meta[3];
    const metaHeight = meta[1];
    const seed = meta.subarray(4, 8);
    const plan = makeScramble(width, height, sfc32New(...seed));
    cvs.width = width;
    cvs.height = height;
    ctx.clearRect(0, 0, width, height);
    for (var i = 0; i < plan.nBlocks; i++) {
        const [sx, sy] = plan.origLeftTops[i];
        const [dx, dy] = plan.shufLeftTops[i];
        const w = Math.min(8, width - sx);
        const h = Math.min(8, height - sy);
        ctx.drawImage(currImage, dx, dy + metaHeight, w, h, sx, sy, w, h);
    }
    currImage = await createImageBitmap(cvs);
}

function makeScramble(width, height, rngFunc) {
    const newWidth = (width + 0b111) & ~0b111;
    const newHeight = (height + 0b111) & ~0b111;
    const shufLeftTops = [];
    const origLeftTops = [];
    for (var x = 0; x < newWidth; x += 8) {
        for (var y = 0; y < newHeight; y += 8) {
            shufLeftTops.push([x, y]);
            origLeftTops.push([x, y]);
        }
    }
    shuffle(shufLeftTops, rngFunc);
    return { newWidth, newHeight, nBlocks: origLeftTops.length, shufLeftTops, origLeftTops };
}

// https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
function sfc32New(a, b, c, d) {
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
function shuffle(array, rngFunc) {
    let i = array.length, j;
    while (i > 0) {
        j = Math.floor(rngFunc() * i);
        i--;
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

function drawMetadata(ctx, width, meta) {
    const metabits = [];
    for (var x of meta) {
        for (var i = 0; i < 32; i++) {
            metabits.push(x & 1);
            x >>= 1;
        }
    }
    var x = 0;
    var y = 0;
    for (const b of metabits) {
        ctx.fillStyle = b ? 'black' : 'white';
        ctx.fillRect(x, y, 8, 8);
        x += 8;
        if (x == width) x = 0, y += 8;
    }
}

function readMetadata(ctx, width, height) {
    width &= ~0b111;
    const metabits = [];
    const metaHeight = 8 * Math.ceil(256 * 8 / width);
    if (metaHeight > height) return null;
    const imageData = ctx.getImageData(0, 0, width, metaHeight);
    var x = 0;
    var y = 0;
    for (var i = 0; i < 256; i++) {
        var sum = 0;
        for (var ry = y, j = 0; j < 8; j++, ry++) {
            for (var rx = x, k = 0; k < 8; k++, rx++) {
                const base = 4 * (ry * width + rx);
                sum += imageData.data[base + 0];
                sum += imageData.data[base + 1];
                sum += imageData.data[base + 2];
            }
        }
        metabits.push(sum <= 64 * 3 * 128);
        x += 8;
        if (x == width) x = 0, y += 8;
    }
    const metanums = [];
    for (var i = 0; i < 8; i++) {
        var x = 0;
        for (var j = 0; j < 32; j++) {
            x <<= 1;
            x += metabits.pop() ? 1 : 0;
        }
        metanums.push(x);
    }
    return new Uint32Array(metanums.reverse());
}