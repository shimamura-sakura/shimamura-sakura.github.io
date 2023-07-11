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
const M_PRJ = mat4.perspective(mat4.create(), glMatrix.toRadian(45.0), cv.width / cv.height, 0.1, 10000.0);
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
const AIR_SPEED = 30;
const GND_SPEED = 250;
const MAX_SPEED = 320;
const JMP_SPEED = 301.993377;
const GND_FRICS = MAX_SPEED * 5.0;
const MAX_ACCEL = MAX_SPEED * 10.0;
const AIR_ACCEL = MAX_SPEED * 100.0;
const A_GRAVITY = 800;

// Player

let player = {
    eye: vec3.fromValues(0, 0, 64),
    pos: vec3.fromValues(0, 0, 0),
    vel: vec3.fromValues(0, 0, 0),
    yaw: +45.0,
    pit: -20.0,
    keys: { w: false, a: false, s: false, d: false, ' ': false, z: false },
    body: new Body3D([
        [0, 0, +0], [32, 0, +0], [32, 32, +0], [0, 32, +0],
        [0, 0, 72], [32, 0, 72], [32, 32, 72], [0, 32, 72]], CUBE_INDICES).move([-16, -16, 0]),
    ground: true,
    move(d) {
        this.body.move(d);
        this.eye = vec3.add(vec3.create(), this.eye, d);
        this.pos = vec3.add(vec3.create(), this.pos, d);
    },
    drawGL() {
        setCamera(this.eye, this.yaw, this.pit);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, g_vertices.length / 6);
    },
};

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
        case 'w':
        case 'a':
        case 's':
        case 'd':
        case ' ':
        case 'z':
            player.keys[key] = true;
            ev.preventDefault();
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
            player.keys[key] = false;
            ev.preventDefault();
            break;
    }
}

function updateText(fps, additional) {
    document.getElementById('text').innerText =
        `fps: ${fps.toFixed(2)}\n` +
        `pos: ${player.pos[0].toFixed(3)} ${player.pos[1].toFixed(3)} ${player.pos[2].toFixed(3)}\n` +
        `vel: ${player.vel[0].toFixed(3)} ${player.vel[1].toFixed(3)} ${player.vel[2].toFixed(3)}\n` +
        `yaw: ${player.yaw.toFixed(3)} pitch: ${player.pit.toFixed(3)}\n` +
        `spd: ${vec2.length([player.vel[0], player.vel[1]]).toFixed(2)}\n` + additional;
    if (player.keys.z)
        console.log(additional);
}

// Game Loop

let lastTime = performance.now();

requestAnimationFrame(function animate(currTime) {

    const dt = Math.min(0.1, (currTime - lastTime) / 1000);
    lastTime = currTime;

    player.drawGL();

    { // player control
        const wishdir = yawToWishdir(player.yaw, player.keys);
        if (player.ground && player.keys[' ']) {
            player.ground = false;
            player.vel[2] = JMP_SPEED;
        }
        const speed2d = [player.vel[0], player.vel[1]];
        if (player.ground)
            [player.vel[0], player.vel[1]] = updateVelGnd(speed2d, wishdir, dt, true);
        else
            [player.vel[0], player.vel[1]] = updateVelAir(speed2d, wishdir, dt);
    }

    let timeleft = dt;
    let iter_cnt = 0;
    let normals = [];

    for (; timeleft > 0 && iter_cnt < 100; iter_cnt++) {

        let newVel = vec3.add(vec3.create(), player.vel, [0, 0, -A_GRAVITY * timeleft]);
        let midVel = vec3.scale(vec3.create(), vec3.add(vec3.create(), player.vel, newVel), 0.5);

        player.ground = false;

        for (const pg of world) {
            const [t, n] = pg.collide(player.body, midVel);
            if (Number.isFinite(t) && t <= 0) {

                player.move(vec3.scale(vec3.create(), n, -t));
                midVel = clipNormal(n, midVel);
                newVel = clipNormal(n, newVel);

                if (Math.acos(vec3.dot(n, [0, 0, 1])) < glMatrix.toRadian(30.0))
                    player.ground = true;
                normals.push(`${n[0]} ${n[1]} ${n[2]}`);
            }
        }

        player.vel = newVel;

        let minTime = timeleft;
        for (const pg of world) {
            const [t, n] = pg.collide(player.body, midVel);
            if (Number.isFinite(t) && t > 0)
                minTime = Math.min(minTime, t);
        }

        player.move(vec3.scale(vec3.create(), midVel, minTime));

        timeleft -= minTime;
    }

    updateText(1.0 / dt, `iterates: ${iter_cnt}\n` + normals.join('\n'));
    requestAnimationFrame(animate);
});

function yawToWishdir(vYaw, keys) {
    let wish_x = 0;
    let wish_y = 0;
    const W_SPEED = 450;
    const S_SPEED = 450;
    const A_SPEED = 450;
    const D_SPEED = 450;
    const sin_yaw = Math.sin(glMatrix.toRadian(-vYaw));
    const cos_yaw = Math.cos(glMatrix.toRadian(-vYaw));
    if (keys.w) {
        wish_x += cos_yaw * W_SPEED;
        wish_y += sin_yaw * W_SPEED;
    }
    if (keys.s) {
        wish_x -= cos_yaw * S_SPEED;
        wish_y -= sin_yaw * S_SPEED;
    }
    if (keys.a) {
        wish_x -= sin_yaw * A_SPEED;
        wish_y += cos_yaw * A_SPEED;
    }
    if (keys.d) {
        wish_x += sin_yaw * D_SPEED;
        wish_y -= cos_yaw * D_SPEED;
    }
    return [wish_x, wish_y];
}

function velFriction(vel, dt) {
    const vlen = vec2.length(vel);
    if (vlen <= 0.0) return vel;
    return vec2.scale(vec2.create(), vel, Math.max(0, (vlen - GND_FRICS * dt) / vlen));
}

function updateVelGnd(vel, wishdir, dt, applyFric) {
    wishdir = vec2.normalize(vec2.create(), wishdir);
    if (applyFric) vel = velFriction(vel, dt);
    const speed = vec2.dot(vel, wishdir);
    const accel = Math.max(0, Math.min(MAX_ACCEL * dt, GND_SPEED - speed));
    return vec2.scaleAndAdd(vec2.create(), vel, wishdir, accel);
}

function updateVelAir(vel, wishdir, dt) {
    wishdir = vec2.normalize(vec2.create(), wishdir);
    const speed = vec2.dot(vel, wishdir);
    const accel = Math.max(0, Math.min(AIR_ACCEL * dt, AIR_SPEED - speed));
    return vec2.scaleAndAdd(vec2.create(), vel, wishdir, accel);
}