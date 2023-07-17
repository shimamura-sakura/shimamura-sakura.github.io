const vShaderSrc = `#version 300 es
    precision highp float;
    uniform                 mat4 MVP;
    layout(location = 0) in vec3 vPos;
    layout(location = 1) in vec3 vClr;
    out                     vec3 fClr;

    void main() {
        gl_Position = MVP * vec4(vPos, 1.0);
        fClr        = vClr;
    }
`;

const fShaderSrc = `#version 300 es
    precision highp float;
    in  vec3 fClr;
    out vec4 color;

    void main() {
        color = vec4(fClr, 1.0);
    }
`;