'use strict';

const BALogo = {
    font: 'ba-rog, ba-glo',
    halo: baLoadImage('assets/halo.png'),
    crux: baLoadImage('assets/cross.png'),
    fRoG: new FontFace('ba-rog', 'url(assets/RoGSanSrfStd-Bd.otf)').load(),
    fGlo: new FontFace('ba-glo', 'url(assets/GlowSansSC-Normal-Heavy.otf)').load(),
    mcvs: new OffscreenCanvas(0, 0),
    padd: 0,
    size: 84,
    colorL: '#128AFA',
    colorR: '#2B2B2B',
};

BALogo.mctx = BALogo.mcvs.getContext('2d');
BALogo.load = Promise.all([BALogo.halo.promise, BALogo.crux.promise, BALogo.fRoG, BALogo.fGlo]);

function baLoadImage(src) {
    const img = new Image();
    img.promise = new Promise((res, rej) => {
        img.onload = () => res(img);
        img.onerror = er => rej(er);
        img.src = src;
    });
    return img;
};

function baPlanDraw(textL, textR, font, fontSize, tilt, haloX, haloY, mCtx) {
    const mctx = mCtx || BALogo.mctx;
    const fstr = mctx.font = `${fontSize}px ${font}`;
    const mods = fontSize / 84 * 0.5; // default 84px font
    const txlW = mctx.measureText(textL).width; // text: [0, 0] -> [txtW, txtH];
    const txrW = mctx.measureText(textR).width;
    const metS = mctx.measureText(textL + textR);
    const tRfY = metS.fontBoundingBoxAscent;
    const txtD = metS.fontBoundingBoxDescent;
    const txtW = txlW + txrW + tRfY * Math.abs(tilt);
    const txtH = tRfY + txtD;
    const tRfX = txlW + (tilt > 0 ? 0 : tRfY * -tilt);
    const halX = (haloX - 140) * mods + tRfX; // 140: halo left pixel
    const halY = (haloY - 200) * mods; // 200: halo down pixel
    const minX = Math.min(halX, 0); // halo: [halX, halY] -> + mods * [500, 500];
    const minY = Math.min(halY, 0);
    return {
        w: Math.max(txtW, halX + mods * 500) - minX, // 500: halo width
        h: Math.max(txtH, halY + mods * 500) - minY, // 500: halo height
        draw(ctx, posX, posY, clrl, clrr) {
            ctx.font = fstr;
            posX -= minX, posY -= minY;
            ctx.beginPath();
            ctx.rect(posX - BALogo.padd, posY - BALogo.padd, txtW + BALogo.padd * 2, txtH + BALogo.padd * 2);
            ctx.setTransform(mods, 0, 0, mods, posX + halX, posY + halY);
            ctx.moveTo(284, 136, 5, 5);
            ctx.lineTo(321, 153, 5, 5);
            ctx.lineTo(159, 410, 5, 5);
            ctx.lineTo(148, 403, 5, 5);
            ctx.closePath();
            ctx.save();
            ctx.clip('evenodd');
            ctx.setTransform(1, 0, -tilt, 1, posX + tRfX, posY + tRfY);
            ctx.fillStyle = clrl, ctx.textAlign = 'end', ctx.fillText(textL, 0, 0);
            ctx.fillStyle = clrr, ctx.textAlign = 'start', ctx.fillText(textR, 0, 0);
            ctx.restore();
            ctx.setTransform(mods, 0, 0, mods, posX + halX, posY + halY);
            ctx.drawImage(BALogo.halo, 0, 0);
            ctx.drawImage(BALogo.crux, 0, 0);
        },
        drawBlur(ctx, posX, posY, clrl, clrr, blurAmt, blurClr, mCvs) {
            const mcvs = mCvs ? mCvs : BALogo.mcvs;
            const mctx = mCvs ? mCvs.getContext('2d') : BALogo.mctx;
            mcvs.width = this.w;
            mcvs.height = this.h;
            this.draw(mctx, 0, 0, clrl, clrr);
            ctx.shadowBlur = blurAmt;
            ctx.shadowColor = blurClr;
            ctx.drawImage(mcvs, posX, posY);
            ctx.shadowBlur = null;
            ctx.shadowColor = null;
        }
    };
}
