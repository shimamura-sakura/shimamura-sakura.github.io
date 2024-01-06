'use strict';
/** @type{HTMLCanvasElement} */
const cvs = document.getElementById('canvas');
const ctx = cvs.getContext('2d');
const btnRst = document.getElementById('btn_rst');
const dlLink = document.getElementById('link');
const META_MAGIC = 0x494d5367; // "IMSC"
const META_NINTS = 9;
btnRst.disabled = true;
dlLink.style.display = 'none';
ctx.clearRect(0, 0, cvs.width, cvs.height);
/** @type{ImageBitmap} */
var currImage = null;
var isOriginal = true;
var loadOriginal = true;
document.getElementById('input').onchange = async function () {
    try {
        currImage = await createImageBitmap(this.files[0]);
        isOriginal = true;
        loadOriginal = true;
        await checkAndUnscramble();
        cvs.width = currImage.width;
        cvs.height = currImage.height;
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        ctx.drawImage(currImage, 0, 0);
        btnRst.disabled = true;
        afterDraw();
    } catch {
        alert('can\'t load image');
    }
};
function afterDraw() {
    dlLink.style.display = 'none';
    if (!(loadOriginal && isOriginal)) cvs.toBlob(function (blob) {
        if (dlLink.href) {
            URL.revokeObjectURL(dlLink.href);
            console.log('revoke', dlLink.href);
            dlLink.removeAttribute('href');
        }
        dlLink.href = URL.createObjectURL(blob);
        dlLink.style.display = 'inline';
        console.log('create', dlLink.href);
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
    isOriginal = true;
    afterDraw();
};
async function checkAndUnscramble() {
    if (currImage.width % 8 != 0) return;
    if (currImage.height % 8 != 0) return;
    cvs.width = currImage.width / 8;
    cvs.height = currImage.height / 8;
    if (cvs.width * cvs.height < META_NINTS * 8) return;
    ctx.drawImage(currImage, 0, 0, cvs.width, cvs.height);
    const metaPixs = ctx.getImageData(0, 0, cvs.width, Math.ceil(META_NINTS * 8 / cvs.width)).data.subarray(0, META_NINTS * 4 * 32);
    const metaData = new Uint32Array(META_NINTS);
    for (var i = metaPixs.length - 1, j, x, k = metaData.length - 1; i >= 0; metaData[k--] = x) {
        for (x = 0, j = 0; j < 32; j++, i -= 4) {
            x <<= 1;
            x += (metaPixs[i - 1] + metaPixs[i - 2] + metaPixs[i - 3]) < 384 ? 1 : 0;
        }
    }
    if (metaData[0] !== META_MAGIC) return;
    if (metaData[8] !== hashMeta(metaData)) return alert('seems to be a broken scrambled image');
    const width = metaData[2];
    const height = metaData[3];
    const metaHeight = metaData[1];
    const seed = metaData.subarray(4, 8);
    const plan = makeScramble(width, height, sfc32New(...seed));
    cvs.width = width;
    cvs.height = height;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    for (var i = 0; i < plan.nBlocks; i++) {
        const [sx, sy] = plan.origLeftTops[i];
        const [dx, dy] = plan.shufLeftTops[i];
        const w = Math.min(8, width - sx);
        const h = Math.min(8, height - sy);
        ctx.drawImage(currImage, dx, dy + metaHeight, w, h, sx, sy, w, h);
    }
    currImage = await createImageBitmap(cvs);
    loadOriginal = false;
}
document.getElementById('btn_scr').onclick = function () {
    if (currImage === null) {
        alert('load an image first');
        return;
    }
    const seed = sfc32RandSeed(Math.random);
    const plan = makeScramble(currImage.width, currImage.height, sfc32New(...seed));
    const meta = new Uint32Array(META_NINTS);
    const metaHeight = 8 * Math.ceil(META_NINTS * 8 * 8 / plan.newWidth);
    meta[0] = META_MAGIC;
    meta[1] = metaHeight;
    meta[2] = currImage.width;
    meta[3] = currImage.height;
    meta.set(seed, 4);
    meta[8] = hashMeta(meta);
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
    btnRst.disabled = false;
    isOriginal = false;
    afterDraw();
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
function hashMeta(metaData) {
    const v1 = 0 | (sfc32New(...metaData.subarray(0, 4))() * 4294967296);
    const v2 = 0 | (sfc32New(...metaData.subarray(4, 8))() * 4294967296);
    return 0 | (sfc32New(v1, v2, v1, v2)() * 4294967296);
}