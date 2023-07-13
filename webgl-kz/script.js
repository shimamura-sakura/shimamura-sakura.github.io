'use strict';

/** @type{HTMLCanvasElement} */
const cv = document.getElementById('canvas');
const gl = cv.getContext('webgl2');

// Init
gl.enable(gl.CULL_FACE);
gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);
gl.clearColor(0.0, 0.0, 0.0, 1.0);

// Shader
const vShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vShader, vShaderSrc);
gl.compileShader(vShader);
const fShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fShader, fShaderSrc);
gl.compileShader(fShader);
const shdProg = gl.createProgram();
gl.attachShader(shdProg, vShader);
gl.attachShader(shdProg, fShader);
gl.linkProgram(shdProg);
gl.useProgram(shdProg);

// VAO
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

// Vertex Buffer
const vbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, g_vertices, gl.STATIC_DRAW);

// Attribute
gl.enableVertexAttribArray(gl.getAttribLocation(shdProg, 'vPos'));
gl.vertexAttribPointer(gl.getAttribLocation(shdProg, 'vPos'), 3, gl.FLOAT, false, 6 * 4, 0 * 4);
gl.enableVertexAttribArray(gl.getAttribLocation(shdProg, 'vClr'));
gl.vertexAttribPointer(gl.getAttribLocation(shdProg, 'vClr'), 3, gl.FLOAT, false, 6 * 4, 3 * 4);

// MVP
const M_PRJ = mat4.perspective(mat4.create(), glMatrix.toRadian(60.0), cv.width / cv.height, 0.1, 10000.0);
const M_MDL = mat4.create();
const m_mvp = mat4.create();
const i_mvp = gl.getUniformLocation(shdProg, 'MVP');

function setCamera([x, y, z], yaw, pitch) {
    const view = mat4.lookAt(mat4.create(), [x, y, z], [
        x + Math.cos(glMatrix.toRadian(-yaw)),
        y + Math.sin(glMatrix.toRadian(-yaw)),
        z + Math.tan(glMatrix.toRadian(pitch)),
    ], [0, 0, 1]);
    gl.uniformMatrix4fv(i_mvp, false, mat4.mul(m_mvp, mat4.mul(mat4.create(), M_PRJ, view), M_MDL));
}

// Const
let H_DUCK = 54;
let H_STAND = 72;
let EYE_OFF = 8;
let A_GRAVITY = 800;
let JMP_SPEED = 301.993377;

// Player

function createPlayerBody(h) {
    return new ConvexPolyhedron([
        [0, 0, 0], [32, 0, 0], [32, 32, 0], [0, 32, 0],
        [0, 0, h], [32, 0, h], [32, 32, h], [0, 32, h]], CUBE_INDICES).translate([-16, -16, 0]);
}

let player = {
    pos: [0, 0, 0],
    vel: [0, 0, 0],
    wishvel: [0, 0, 0],
    yaw: +45.0,
    pit: -20.0,
    keys: { w: false, a: false, s: false, d: false, ' ': false, shift: false, z: false },
    body: createPlayerBody(72),
    ground: true,
    ducked: false,
    duckAmount: 0.0,
    jumped: false,
    moveType: 'walk',
    ladderNormal: null,
    move(d) {
        this.body.translate(d);
        this.pos = vec3.add(vec3.create(), this.pos, d);
    },
    drawGL() {
        setCamera(
            vec3.add(vec3.create(), this.pos, [0, 0, (H_STAND + (H_DUCK - H_STAND) * this.duckAmount) - EYE_OFF]),
            this.yaw, this.pit
        );
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, g_vertices.length / 6);
    },

    saved: null,
};

function saveState() {
    player.saved = {
        pos: player.pos,
        yaw: player.yaw,
        pit: player.pit,
        ducked: player.ducked,
        moveType: player.moveType,
        ladderNormal: player.ladderNormal,
    };
}

function loadState() {
    if (!player.saved) return;
    ({
        pos: player.pos,
        yaw: player.yaw,
        pit: player.pit,
        ducked: player.ducked,
        moveType: player.moveType,
        ladderNormal: player.ladderNormal,
    } = player.saved);
    player.body = createPlayerBody(player.ducked ? H_DUCK : H_STAND);
    player.body.translate(player.pos);
}


// Input
document.addEventListener('mousemove', evMouseMove, false);
document.addEventListener('keydown', evKeyDn, false);
document.addEventListener('keyup', evKeyUp, false);
cv.addEventListener('click', () => {
    if (document.pointerLockElement) return;
    cv.requestPointerLock({ unadjustMovement: true });
});

function evMouseMove(ev) {
    if (document.pointerLockElement !== cv) return;
    player.yaw += +ev.movementX / 15;
    player.pit += -ev.movementY / 15;
    if (player.yaw > +180.0) player.yaw -= 360.0;
    if (player.yaw < -180.0) player.yaw += 360.0;
    if (player.pit > +89.99) player.pit = +89.99;
    if (player.pit < -89.99) player.pit = -89.99;
}

function evKeyDn(ev) {
    if (ev.repeat || document.pointerLockElement !== cv) return;
    const key = ev.key.toLowerCase();
    switch (key) {
        case '1':
        case '!':
            saveState();
            break;

        case '2':
        case '@':
            loadState();
            break;

        case 'w':
        case 'a':
        case 's':
        case 'd':
        case ' ':
        case 'z':
        case 'shift':
            player.keys[key] = true;
            ev.preventDefault();
            break;
        case 'x':
            player.keys[' '] = true;
            player.keys.shift = true;
            break;
        default:
            console.log(key);
    }
}

function evKeyUp(ev) {
    if (ev.repeat || document.pointerLockElement !== cv) return;
    const key = ev.key.toLowerCase();
    switch (key) {
        case 'w':
        case 'a':
        case 's':
        case 'd':
        case ' ':
        case 'z':
        case 'shift':
            player.keys[key] = false;
            ev.preventDefault();
            break;
        case 'x':
            player.keys[' '] = false;
            player.keys.shift = false;
            break;
    }
}

function updateText(fps, additional) {
    document.getElementById('text').innerText =
        `fps: ${fps.toFixed(2)}\n` +
        `pos: ${player.pos[0].toFixed(3)} ${player.pos[1].toFixed(3)} ${player.pos[2].toFixed(3)}\n` +
        `vel: ${player.vel[0].toFixed(3)} ${player.vel[1].toFixed(3)} ${player.vel[2].toFixed(3)}\n` +
        `yaw: ${player.yaw.toFixed(3)} pitch: ${player.pit.toFixed(3)}\n` +
        `spd: ${vec2.length([player.vel[0], player.vel[1]]).toFixed(2)}\n` +
        `ground: ${player.ground} duckAmout: ${player.duckAmount} ducked: ${player.ducked}\n` +
        `movetype: ${player.moveType} ln: ${player.ladderNormal}\n` +
        additional;
    if (player.keys.z)
        console.log(additional);
}

// Game Loop

let lastTime = performance.now();

const DUCK_SPEED = 1.0 / 0.4 * 4;

requestAnimationFrame(function animate(currTime) {

    const dt = Math.min(0.1, (currTime - lastTime) / 1000);
    lastTime = currTime;

    player.drawGL();

    { // movetype check
        if (player.moveType === 'ladder') {
            player.moveType = 'walk';
            for (const pg of world) {
                const [t, n] = pg.timeCollide(player.body, [0, 0, 0], true);
                if (Number.isFinite(t) && t <= EPSILON)
                    if (pg.isLadder) {
                        player.moveType = 'ladder';
                        player.ladderNormal = n;
                        break;
                    }
            }
        }
    }

    { // player control

        if (player.keys.shift) { // want duck
            if (!player.ducked) { // not ducked
                if (player.ground)
                    // on ground, add duck amount
                    player.duckAmount = Math.min(1, player.duckAmount + DUCK_SPEED * dt);
                else
                    // air, immediate duck
                    player.duckAmount = 1;
                // should duck now
                if (player.duckAmount >= 1.0) {
                    if (player.ground)
                        // ground: lower body at same pos
                        player.body = createPlayerBody(H_DUCK).translate(player.pos);
                    else {
                        // air: raise H_STAND - H_DUCK
                        player.body = createPlayerBody(H_DUCK).translate(player.pos);
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

            if (player.ground) {
                if (player.ducked) {
                    // ground: higher body at same pos
                    unduckedMove = [0, 0, 0];
                    unduckedBody = createPlayerBody(H_STAND).translate(player.pos);
                } else {
                    // ducktap ?
                    unduckedMove = [0, 0, (H_STAND - H_DUCK)];
                    unduckedBody = createPlayerBody(H_STAND).translate(player.pos).translate(unduckedMove);
                }
            } else {
                // air: down body
                unduckedMove = [0, 0, -(H_STAND - H_DUCK)];
                unduckedBody = createPlayerBody(H_STAND).translate(player.pos).translate(unduckedMove);
            }

            // collision detect
            let canUnduck = true;
            for (const pg of world) {
                const [t, n] = pg.timeCollide(unduckedBody, [0, 0, 0]);
                if (t < -EPSILON) {
                    canUnduck = false;
                    break;
                }
            }
            canUnduck |= !player.ducked;

            if (canUnduck) {
                if (player.ground) {
                    // ground, decrease duck amount
                    player.duckAmount = Math.max(0, player.duckAmount - DUCK_SPEED * dt);
                }
                else
                    // air, immediate zero
                    player.duckAmount = 0;
                // should unduck now
                if (player.duckAmount <= 0) {
                    player.move(unduckedMove);
                    player.body = unduckedBody;
                    player.ducked = false;
                }
            } else {
                // go back to ducked
                if (player.ground)
                    // on ground, add duck amount
                    player.duckAmount = Math.min(1, player.duckAmount + DUCK_SPEED * dt);
                else
                    // air, immediate duck
                    player.duckAmount = 1;
            }
        }

        if (player.moveType === 'walk') {
            // MOVE
            let wish3d = player.wishvel = yawPitchWish3d(player.yaw, player.pit, player.keys, [450, 450, 450, 450]);
            let wish2d = walkWishvel(wish3d, player.ducked);
            const speed2d = [player.vel[0], player.vel[1]];
            if (player.ground)
                [player.vel[0], player.vel[1]] = updateVelGnd(speed2d, wish2d, dt);
            else
                [player.vel[0], player.vel[1]] = updateVelAir(speed2d, wish2d, dt);
            player.vel[2] += -A_GRAVITY * dt / 2;
        }

        if (player.moveType === 'ladder') {

            let vec_u = yawPitchWish3d(player.yaw, player.pit, player.keys, [200, 200, 200, 200]);
            let vec_n = player.ladderNormal;

            let tmp_1 = vec3.cross(vec3.create(), [0, 0, 1], vec_n);
            let tmp_2 = vec3.normalize(vec3.create(), tmp_1);
            let tmp_3 = vec3.cross(vec3.create(), vec_n, tmp_2);
            let tmp_4 = vec3.add(vec3.create(), vec_n, tmp_3);
            let udotn = vec3.dot(vec_u, vec_n);

            player.vel = vec3.scaleAndAdd(vec3.create(), vec_u, tmp_4, -udotn);

            if (player.keys[' '])
                player.vel = vec3.scale(vec3.create(), vec_n, 270);
        }

        // JUMP
        if (player.ground && player.keys[' '])
            player.vel[2] += JMP_SPEED;
    }

    let timeleft = dt;
    let iter_cnt = 0;
    let normals = [];

    player.ground = false;

    for (; timeleft > 0 && iter_cnt < 100; iter_cnt++) {

        for (const pg of world) {
            const [t, n] = pg.timeCollide(player.body, vec3.add(vec3.create(), player.vel, [0, 0, -1]));
            if (Number.isFinite(t) && t <= 0) {

                player.move(vec3.scale(vec3.create(), n, -t));
                player.vel = PUtil.clipNormal(n, player.vel);

                if (Math.acos(vec3.dot(n, [0, 0, 1])) < glMatrix.toRadian(30.0))
                    player.ground = true;

                normals.push(`${n[0]} ${n[1]} ${n[2]} `);

                if (pg.isLadder && vec3.dot(n, player.wishvel) < 0)
                    player.moveType = 'ladder';
            }
        }

        let minTime = timeleft;
        for (const pg of world) {
            const [t, n] = pg.timeCollide(player.body, player.vel);
            if (Number.isFinite(t) && t > 0)
                minTime = Math.min(minTime, t);
        }

        player.move(vec3.scale(vec3.create(), player.vel, minTime));

        timeleft -= minTime;
    }

    updateText(1.0 / dt, `iterates: ${iter_cnt} \n` + normals.join('\n'));
    requestAnimationFrame(animate);

    if (player.moveType === 'walk')
        player.vel[2] += -A_GRAVITY * dt / 2;

});

function yawToWishdir(vYaw, keys, speeds) {
    let wish_x = 0;
    let wish_y = 0;
    const sin_yaw = Math.sin(glMatrix.toRadian(-vYaw));
    const cos_yaw = Math.cos(glMatrix.toRadian(-vYaw));
    if (keys.w) {
        wish_x += cos_yaw * speeds[0];
        wish_y += sin_yaw * speeds[0];
    }
    if (keys.s) {
        wish_x -= cos_yaw * speeds[1];
        wish_y -= sin_yaw * speeds[1];
    }
    if (keys.a) {
        wish_x -= sin_yaw * speeds[2];
        wish_y += cos_yaw * speeds[2];
    }
    if (keys.d) {
        wish_x += sin_yaw * speeds[3];
        wish_y -= cos_yaw * speeds[3];
    }
    return [wish_x, wish_y];
}

function yawPitchWish3d(vYaw, vPit, keys, speed) {
    const vFwd = vec3.normalize(vec3.create(), [
        Math.cos(glMatrix.toRadian(-vYaw)),
        Math.sin(glMatrix.toRadian(-vYaw)),
        Math.tan(glMatrix.toRadian(vPit))
    ]);
    const vRight = vec3.normalize(vec3.create(), [
        +Math.sin(glMatrix.toRadian(-vYaw)),
        -Math.cos(glMatrix.toRadian(-vYaw)),
        0,
    ]);
    let wish3d = vec3.create();
    if (keys.w)
        wish3d = vec3.scaleAndAdd(vec3.create(), wish3d, vFwd, +speed[0]);
    if (keys.s)
        wish3d = vec3.scaleAndAdd(vec3.create(), wish3d, vFwd, -speed[1]);
    if (keys.a)
        wish3d = vec3.scaleAndAdd(vec3.create(), wish3d, vRight, -speed[2]);
    if (keys.d)
        wish3d = vec3.scaleAndAdd(vec3.create(), wish3d, vRight, +speed[3]);
    return wish3d;
}


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

// https://www.jwchong.com/hl/player.html#fsu
function walkWishvel(wv, ducked) {
    const uwishvel = vec3.normalize(vec3.create(), [wv[0], wv[1], 0]);
    const mwishvel = vec3.scale(vec3.create(), uwishvel, SV_MAXSPEED * (ducked ? 0.34 : 1));
    return mwishvel;
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

function updateVelGnd(vel, wishvel, dt) {
    vel = velFriction(vel, dt);
    return velAccelerate(dt, SV_ACCELERATE, true, vel, wishvel);
}

function updateVelAir(vel, wishvel, dt) {
    return velAccelerate(dt, SV_AIRACCELERATE, false, vel, wishvel);
}