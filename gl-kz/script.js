'use strict';

/** @type{HTMLCanvasElement} */
const cv = document.getElementById('canvas');
const gl = cv.getContext('webgl2');
const tx = document.getElementById('text');

// Const
let H_DUCK = 54;
let H_STAND = 72;
let EYE_OFF = 8;

// Control
const player = {
    pos: [0, 0, 0],
    vel: [0, 0, 0],
    yaw: 0,
    pit: 0,
    key: { w: false, s: false, a: false, d: false, shift: false, ' ': false, v: false },
    ducked: false,
    duckAmount: 0.0,
    onground: false,
    viewdir2d() {
        const fw = [
            +Math.cos(glMatrix.toRadian(-this.yaw)),
            +Math.sin(glMatrix.toRadian(-this.yaw))];
        const rt = [
            +Math.sin(glMatrix.toRadian(-this.yaw)),
            -Math.cos(glMatrix.toRadian(-this.yaw))];
        return [fw, rt];
    },
    viewMatrix() {
        let eye = vec3.add(vec3.create(), this.pos,
            [0, 0, (H_STAND + (H_DUCK - H_STAND) * this.duckAmount) - EYE_OFF]);
        return mat4.lookAt(mat4.create(),
            /* origin */eye,
            /* lookat */vec3.add(vec3.create(), eye, [
            Math.cos(glMatrix.toRadian(-this.yaw)),
            Math.sin(glMatrix.toRadian(-this.yaw)),
            Math.tan(glMatrix.toRadian(+this.pit)),
        ]), /* upward */[0, 0, 1]);
    },
    updateText(fps, additional) {
        tx.innerText =
            `fps: ${fps.toFixed(2)}\n` +
            `pos: ${this.pos[0].toFixed(3)} ${this.pos[1].toFixed(3)} ${this.pos[2].toFixed(3)}\n` +
            `vel: ${this.vel[0].toFixed(3)} ${this.vel[1].toFixed(3)} ${this.vel[2].toFixed(3)}\n` +
            `yaw: ${this.yaw.toFixed(3)} pitch: ${this.pit.toFixed(3)}\n` +
            `spd: ${vec2.length([this.vel[0], this.vel[1]]).toFixed(2)}\n` +
            `onground: ${this.onground} duckAmout: ${this.duckAmount.toFixed(2)} ducked: ${this.ducked}\n` +
            additional;
    },
    hull: null,
    move(d) {
        vec3.add(this.pos, this.pos, d);
        this.eye = vec3.add(vec3.create(), this.pos, [0, 0, 64]);
        this.hull = createPlayerBody(this.pos, this.ducked ? H_DUCK : H_STAND);
    },
    saved: null,
};

function createPlayerBody(pos, height) {
    return createAxisHull(pos, [-16, -16, 0], [+16, +16, height]);
}

function saveState() {
    player.saved = JSON.stringify({
        pos: player.pos,
        yaw: player.yaw,
        pit: player.pit,
        ducked: player.ducked,
        duckAmount: player.duckAmount,
    });
}

function loadState() {
    if (!player.saved) return;
    ({
        pos: player.pos,
        yaw: player.yaw,
        pit: player.pit,
        ducked: player.ducked,
        duckAmount: player.duckAmount,
    } = JSON.parse(player.saved));
    player.vel = [0, 0, 0];
    player.move([0, 0, 0]);
}

// Temp: for kz_gy_agitation
const MAP_NAME = 'kz_gy_agitation'
player.move([-14456.000000, 7835.529785, -1535.968750]);

// Temp: for bkz_goldbhop_csgo
// player.move([-3368, -3642, 5]);
// player.yaw = -90;
// player.pit = 0;

cv.addEventListener('click', () => {
    if (document.pointerLockElement) return;
    cv.requestPointerLock(/*{ unadjustedMovement: true }*/);
});

document.addEventListener('mousemove', function (ev) {
    if (document.pointerLockElement !== cv) return;
    player.yaw += +ev.movementX / 15;
    player.pit += -ev.movementY / 10;
    if (player.yaw > +180.0) player.yaw -= 360.0;
    if (player.yaw < -180.0) player.yaw += 360.0;
    if (player.pit > +89.00) player.pit = +89.00;
    if (player.pit < -89.00) player.pit = -89.00;
}, false);

document.addEventListener('keydown', function (ev) {
    if (document.pointerLockElement !== cv) return;
    const key = ev.key.toLowerCase();
    switch (key) {
        case '1':
        case '!':
            saveState();
            ev.preventDefault();
            break;
        case '2':
        case '@':
            loadState();
            ev.preventDefault();
            break;
        case 'w':
        case 's':
        case 'a':
        case 'd':
        case 'v':
        case 'shift':
        case ' ':
            player.key[key] = true;
            ev.preventDefault();
            break;
        default:
            console.log(key);
    }
}, false);

document.addEventListener('keyup', function (ev) {
    if (document.pointerLockElement !== cv) return;
    const key = ev.key.toLowerCase();
    switch (key) {
        case 'w':
        case 's':
        case 'a':
        case 'd':
        case 'v':
        case 'shift':
        case ' ':
            player.key[key] = false;
            ev.preventDefault();
            break;
    }
}, false);

// GL Init
gl.enable(gl.CULL_FACE);
gl.enable(gl.DEPTH_TEST);
gl.clearColor(0.2, 0.3, 0.3, 1.0);

// GL Shader
const shdProg = gl.createProgram();
{
    const vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, vShaderSrc);
    gl.compileShader(vShader);
    const fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, fShaderSrc);
    gl.compileShader(fShader);
    gl.attachShader(shdProg, vShader);
    gl.attachShader(shdProg, fShader);
    gl.linkProgram(shdProg);
    gl.useProgram(shdProg);
    gl.detachShader(shdProg, vShader);
    gl.detachShader(shdProg, fShader);
    gl.deleteShader(vShader);
    gl.deleteShader(fShader);
}

// GL Buffer
const vbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

// GL Attribute
gl.enableVertexAttribArray(gl.getAttribLocation(shdProg, 'vPos'));
gl.vertexAttribPointer(gl.getAttribLocation(shdProg, 'vPos'), 3, gl.FLOAT, false, 6 * 4, 0 * 4);
gl.enableVertexAttribArray(gl.getAttribLocation(shdProg, 'vClr'));
gl.vertexAttribPointer(gl.getAttribLocation(shdProg, 'vClr'), 3, gl.FLOAT, false, 6 * 4, 3 * 4);

// GL MVP
const p_MVP = gl.getUniformLocation(shdProg, 'MVP');
const M_PRJ = mat4.perspective(mat4.create(), glMatrix.toRadian(60.0), cv.width / cv.height, 1.0, 100_000.0);
function glSetMVP(view) {
    gl.uniformMatrix4fv(p_MVP, false, mat4.mul(mat4.create(), M_PRJ, view));
}

// GL Load Vertex
/** @type {Float32Array} */
let vertex = null;
let v_load = (async () => {
    const v_data = await (await fetch(MAP_NAME + '/vertices.bin')).arrayBuffer();
    vertex = new Float32Array(v_data);
    gl.bufferData(gl.ARRAY_BUFFER, vertex, gl.STATIC_DRAW);
})();

// BSP Load
/** @type {BSPWorld} */
let bsp = null;
let b_load = (async () => {
    const c_json = await (await fetch(MAP_NAME + '/collision.json')).json();
    bsp = new BSPWorld(c_json);
})();

// Render
function playerDrawGL() {
    glSetMVP(player.viewMatrix());
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (vertex) gl.drawArrays(gl.TRIANGLES, 0, vertex.length / 6);
}

// Game Loop
const SV_GRAVITY = 800;
const JMP_SPEED = 301.993377;
const DUCK_SPEED = 1.0 / 0.4 * 4;

let lastTime = performance.now();
requestAnimationFrame(function animate(currTime) {

    const dt = Math.min(0.1, (currTime - lastTime) / 1000);
    lastTime = currTime;

    if (!(vertex && bsp)) {
        // wait for load
        requestAnimationFrame(animate);
        return;
    }

    playerDrawGL();


    { // TEMP: duck

        if (player.key.shift) { // want duck
            if (!player.ducked) { // not ducked
                if (player.onground)
                    // on ground, add duck amount
                    player.duckAmount = Math.min(1, player.duckAmount + DUCK_SPEED * dt);
                else
                    // air, immediate duck
                    player.duckAmount = 1;
                // should duck now
                if (player.duckAmount >= 1.0) {
                    if (player.onground) {
                        // ground: same position
                        player.ducked = true;
                        player.move([0, 0, 0]);
                    } else {
                        // air: raise H_STAND - H_DUCK
                        player.ducked = true;
                        player.move([0, 0, H_STAND - H_DUCK]);
                    }
                    // update ducked state
                    player.ducked = true;
                }
            }
        } else if (player.duckAmount > 0) { // release duck when in duck

            // move first, then set body
            let unduckedBody = null;
            let unduckedMove = null;

            if (player.onground) {
                if (player.ducked) {
                    // ground: higher body at same pos
                    unduckedMove = [0, 0, 0];
                    unduckedBody = createPlayerBody(player.pos, H_STAND);
                } else {
                    // ducktap ?
                    unduckedMove = [0, 0, (H_STAND - H_DUCK)];
                    unduckedBody = createPlayerBody(vec3.add(vec3.create(), player.pos, unduckedMove), H_STAND);
                }
            } else {
                // air: down body
                unduckedMove = [0, 0, -(H_STAND - H_DUCK)];
                unduckedBody = createPlayerBody(vec3.add(vec3.create(), player.pos, unduckedMove), H_STAND);
            }

            // collision detect
            let canUnduck = true;
            for (const { t, n } of bsp.traceHull(unduckedBody, [0, 0, 0])) {
                if (t < -EPSILON) {
                    canUnduck = false;
                    break;
                }
            }
            canUnduck |= !player.ducked;
            if (canUnduck) {
                if (player.onground) {
                    // ground, decrease duck amount
                    player.duckAmount = Math.max(0, player.duckAmount - DUCK_SPEED * dt);
                }
                else
                    // air, immediate zero
                    player.duckAmount = 0;
                // should unduck now
                if (player.duckAmount <= 0) {
                    player.ducked = false;
                    player.move(unduckedMove);
                }
            } else {
                // go back to ducked
                if (player.onground)
                    // on ground, add duck amount
                    player.duckAmount = Math.min(1, player.duckAmount + DUCK_SPEED * dt);
                else
                    // air, immediate duck
                    player.duckAmount = 1;
            }
        }
    }

    { // TEMP: movetype walk
        let wdir2d = wishdir2d(player.viewdir2d(), player.key);
        let wish2d = wishvel2d(wdir2d, player.ducked);
        let spd_2d = [player.vel[0], player.vel[1]];
        if (player.onground && player.key[' ']) {
            player.onground = false;
            player.vel[2] += JMP_SPEED;
        }
        if (player.onground)
            [player.vel[0], player.vel[1]] = updateVelGnd(spd_2d, wish2d, dt);
        else
            [player.vel[0], player.vel[1]] = updateVelAir(spd_2d, wish2d, dt);
        player.vel[2] -= SV_GRAVITY * dt / 2;
    }

    let timeLeft = dt;
    let iter_cnt = 0;
    let all_hits = [];

    player.onground = false;
    for (; timeLeft > 0 && iter_cnt < 4; iter_cnt++) {
        let minTime = timeLeft;
        let minNorm = null;
        let hits = bsp.traceHull(player.hull, player.vel);
        for (const { t, n } of hits) {
            if (Number.isFinite(t)) {
                if (t < 0)
                    player.move(vec3.scale(vec3.create(), n, -t));
                else if (t < minTime) {
                    minTime = t;
                    minNorm = n;
                }
            }
        }
        player.move(vec3.scale(vec3.create(), player.vel, minTime));
        if (minNorm) {
            player.vel = clipNormal(minNorm, player.vel);
            if (Math.acos(vec3.dot(minNorm, [0, 0, 1])) < glMatrix.toRadian(30.0))
                player.onground = true;
        }
        timeLeft -= minTime;
    }

    player.updateText(1.0 / dt, `iters: ${iter_cnt}\n` + `${all_hits.join('\n')}`);

    { // TEMP: movetype walk
        player.vel[2] -= SV_GRAVITY * dt / 2;
    }

    requestAnimationFrame(animate);
});

// Move Logic
const SV_FRICTION = 5.0;
const SV_ACCELERATE = 6.5;
const SV_AIRACCELERATE = 100;
const SV_STOPSPEED = 100;
const SV_MAXSPEED = 250;

const FRIC_KE = 1.0;
const FRIC_EF = 1.0;
const FRIC_K = SV_FRICTION * FRIC_KE * FRIC_EF;

// https://www.jwchong.com/hl/movement.html
function velFriction(vel, dt) {
    const spd = vec2.length(vel);
    const tek = dt * SV_STOPSPEED * FRIC_K;
    const low = Math.max(0.1, tek);
    if (spd < low)
        return [0, 0];
    if (spd >= SV_STOPSPEED)
        return vec2.scale(vec2.create(), vel, 1 - dt * FRIC_K);
    return vec2.scale(vec2.create(), vel, 1 - tek / spd);
}

function wishdir2d(viewdir2d, key) {
    let wishdir2d = vec2.create();
    if (key.w) vec2.add(wishdir2d, wishdir2d, viewdir2d[0]);
    if (key.s) vec2.sub(wishdir2d, wishdir2d, viewdir2d[0]);
    if (key.a) vec2.sub(wishdir2d, wishdir2d, viewdir2d[1]);
    if (key.d) vec2.add(wishdir2d, wishdir2d, viewdir2d[1]);
    return wishdir2d;
}

// https://www.jwchong.com/hl/player.html#fsu
function wishvel2d(wishdir2d, ducked) {
    return vec2.scale(vec2.create(), wishdir2d, SV_MAXSPEED * (ducked ? 0.34 : 1));
}

function velAccelerate(dt, accelerate, is_ground, vel, wishvel) {
    const uwishvel = vec2.normalize(vec2.create(), wishvel);
    const factor_M = Math.min(SV_MAXSPEED, vec2.length(wishvel));
    const factor_L = is_ground ? factor_M : Math.min(30, factor_M);
    const gamma_1 = FRIC_KE * dt * factor_M * accelerate;
    const gamma_2 = factor_L - vec2.dot(vel, uwishvel);
    const uwscale = gamma_2 <= 0 ? 0 : Math.min(gamma_1, gamma_2);
    return vec2.scaleAndAdd(vec2.create(), vel, uwishvel, uwscale);
}

function updateVelGnd(spd_2d, wish2d, dt) {
    spd_2d = velFriction(spd_2d, dt);
    return velAccelerate(dt, SV_ACCELERATE, true, spd_2d, wish2d);
}

function updateVelAir(spd_2d, wish2d, dt) {
    return velAccelerate(dt, SV_AIRACCELERATE, false, spd_2d, wish2d);
}