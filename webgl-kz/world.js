'use strict';

const CUBE_INDICES = [
    [0, 3, 2, 1], [0, 1, 5, 4], [1, 2, 6, 5],
    [2, 3, 7, 6], [3, 0, 4, 7], [4, 5, 6, 7]];

const world = [
    new Body3D([ // ground
        [0, 0, 0], [2048, 0, 0], [2048, 2048, 0], [0, 2048, 0],
        [0, 0, 1], [2048, 0, 1], [2048, 2048, 1], [0, 2048, 1]], CUBE_INDICES).move([-1024, -1024, -1]),
    new Body3D([
        [0, 0, 0], [64, 0, 0], [64, 64, 0], [0, 64, 0],
        [0, 0, 64], [64, 0, 64], [64, 64, 64], [0, 64, 64]], CUBE_INDICES).move([128, -128 - 64, 0]),
    new Body3D([
        [0, 0, 0], [64, 0, 0], [64, 64, 0], [0, 64, 0],
        [0, 0, 64], [64, 0, 64], [64, 64, 64], [0, 64, 64]], CUBE_INDICES).move([192, 96, 0]),
    new Body3D([ // 
        [0, 0, 0], [512, 0, 0], [512, 64, 0], [0, 64, 0],
        [0, 0, 128], [512, 0, 128], [512, 64, 128], [0, 64, 128]], CUBE_INDICES).move([-256, 192, 0]),
    new Body3D([
        [0, 0, 0], [64, 0, 0], [64, 64, 0], [0, 64, 0],
        [0, 0, 64], [64, 0, 64], [64, 64, 64], [0, 64, 64]], CUBE_INDICES).move([-224, 128, 0]),
    new Body3D([
        [0, 0, 0], [256, 0, +0], [256, 64, 0], [0, 64, 0],
        [0, 0, 32], [256, 0, 32], [256, 64, 96], [0, 64, 96]], CUBE_INDICES).move([-128, 128, -32]),
    new Body3D([
        [0, 0, 0], [32, 0, 0], [32, 32, 0], [0, 32, 0],
        [0, 0, 32], [32, 0, 32], [32, 32, 32], [0, 32, 32]], CUBE_INDICES).move([-128, 16, 0]),
    new Body3D([
        [0, 0, 0], [32, 0, 0], [32, 32, 0], [0, 32, 0],
        [0, 0, 32], [32, 0, 32], [32, 32, 32], [0, 32, 32]], CUBE_INDICES).move([-192, 16, 72]),
];

const g_vertices = new Float32Array((() => {
    let vertices = [];
    world.forEach(body => {
        const points = body.points;
        const indexs = body.indexs;
        indexs.forEach(iface => {
            const r = Math.random();
            const g = Math.random();
            const b = Math.random();
            for (var i = 1, j = 2; j < iface.length; i++, j++) {
                vertices.push(...points[iface[0]], r, g, b);
                vertices.push(...points[iface[i]], r, g, b);
                vertices.push(...points[iface[j]], r, g, b);
            }
        });
    });
    return vertices;
})());
