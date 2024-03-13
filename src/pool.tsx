import * as React from 'react'
import { compileShaderProgram, resizeCanvas, useForceUpdate } from './Utility'

import { Matrix4, Matrix3, Vector3, Quaternion, Vector2 } from '@math.gl/core'
import { normalMatrix } from './Utility';

import VertexCode from './pool.vs.glsl?raw'
import FragmentCode from './pool.fs.glsl?raw'

import ReflectVS from './reflect.vs.glsl?raw'
import ReflectFS from './reflect.fs.glsl?raw'

import EnvMapVS from './envMap.vs.glsl?raw'
import EnvMapFS from './envMap.fs.glsl?raw'

import { CubeTextures, CubemapType } from './Data'

import 'webgl-lint'
import { UIPanel } from './ui/UIPanel';
import { UILabel } from './ui/UILabel';
import { MultiSwitch, MultiSwitchElement } from './ui/MultiSwitch';
import WoodTexture from './textures/wood.jpg';
import WhiteTexture from './textures/white.jpg'
import GreenTexture from './textures/green.jpg'
import KoeTexture from './textures/kö.jpg'
import HoleTexture from './textures/loch.jpg'

import FirstTexture from './textures/one.jpg'
import SecondTexture from './textures/two.jpg'
import ThirdTexture from './textures/three.jpg'
import FourthTexture from './textures/four.jpg'
import FifthTexture from './textures/five.jpg'
import SixthTexture from './textures/six.jpg'
import SeventhTexture from './textures/seven.jpg'
import EighthTexture from './textures/eight.jpg'
import NinthTexture from './textures/nine.jpg'
import TenthTexture from './textures/ten.jpg'
import EleventhTexture from './textures/eleven.jpg'
import TwelfthTexture from './textures/twelve.jpg'
import ThirteenthTexture from './textures/thirteen.jpg'
import FourteenthTexture from './textures/fourteen.jpg'
import FifteenthTexture from './textures/fifteen.jpg'

export type GLContext = {
    gl: WebGL2RenderingContext;
    shaderProgram: WebGLProgram;
}

export type Mesh = Shape & {
    phi?: number;
    scale?: number;
}

type Cubemap = Mesh & {
    texture: WebGLTexture;
}
type AppContext = {
    gl: WebGL2RenderingContext;
    vao: WebGLVertexArrayObject

    shapes: Array<Shape>;
    program: WebGLProgram;

    modelView: Matrix4;
    projection: Matrix4;
    
    fov: number;
    phi: number;
    theta: number;

    mousePos: Vector2;
    mousePressed: boolean;
    aspect: number;
    zoom: number;
    textures: Array<WebGLTexture>
    
    viewMode: ViewMode;
    orientation: Quaternion;

    currentCubemap: CubemapType

    cubemaps: { [key: string]: Cubemap }

    prEnvMap: WebGLProgram;

    texture: WebGLTexture;

    meshes: Mesh[]

}

export const worldCoord = (gl: WebGL2RenderingContext, p: Vector2, zoom?: number): Vector2 => {
    if (gl.canvas.width > gl.canvas.height) {
        return new Vector2([
            ((2.0 * p.x - gl.canvas.width) / gl.canvas.height) / (zoom ?? 1.0),
            (1.0 - 2.0 * p.y / gl.canvas.height) / (zoom ?? 1.0)
        ]);
    } else {
        return new Vector2([
            (2.0 * p.x / gl.canvas.width - 1.0) / (zoom ?? 1.0),
            ((gl.canvas.height - 2.0 * p.y) / gl.canvas.width) / (zoom ?? 1.0)
        ]);
    }
}

export type Shape = {
    vao: WebGLVertexArrayObject;
    vboSize?: number;
    iboSize?: number;
    type?: string;
    textureID?: number
}

enum ViewMode {
    Stereo,
    Orthographic,
    Perspective
}

enum Surface {
    Cuboid = 0,
    Ball = 0,
}

//cubemap

const createCubemap = async (gl: WebGL2RenderingContext, map: CubemapType): Promise<Cubemap> => {
    const vbo = [
        -1, -1, -1,
        1, -1, -1,
        -1, 1, -1,
        1, 1, -1,
        -1, -1, 1,
        1, -1, 1,
        -1, 1, 1,
        1, 1, 1
    ];
    const ibo = [0, 1, 2, 1, 3, 2, 4, 6, 5, 6, 7, 5, 0, 4, 5, 0, 5, 1, 2, 7, 6, 2, 3, 7, 7, 3, 1, 7, 1, 5, 0, 2, 6, 0, 6, 4];

    const iboSize = ibo.length;

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vbo), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    const iboBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iboBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(ibo), gl.STATIC_DRAW);

    const texture = gl.createTexture();
    // gl.bindTexture(gl.TEXTURE_CUBE_MAP,this.texture);

    let imageCt = 0;

    const load = async (url, target, tex: WebGLTexture) => {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
            img.onload = () => {
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
                gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                imageCt++;
                if (imageCt == 6) {
                    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
                    // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                }
                resolve();
            }
            img.onerror = function () {
                console.log(url, 'not found.');
                reject();
            }
            img.src = url;
        })
    }

    await load(CubeTextures[map][0], gl.TEXTURE_CUBE_MAP_NEGATIVE_X, texture);
    await load(CubeTextures[map][1], gl.TEXTURE_CUBE_MAP_POSITIVE_X, texture);
    await load(CubeTextures[map][2], gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, texture);
    await load(CubeTextures[map][3], gl.TEXTURE_CUBE_MAP_POSITIVE_Y, texture);
    await load(CubeTextures[map][4], gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, texture);
    await load(CubeTextures[map][5], gl.TEXTURE_CUBE_MAP_POSITIVE_Z, texture);

    return { vao, iboSize, texture };
}

const drawCubemap = (ctx: AppContext, cubemap: Cubemap) => {
    const gl = ctx.gl;
    console.log(ctx.prEnvMap)
    gl.useProgram(ctx.prEnvMap);
    let projectionLoc = gl.getUniformLocation(ctx.prEnvMap, 'uProjection');
    gl.uniformMatrix4fv(projectionLoc, false, ctx.projection);
    let modelViewLoc = gl.getUniformLocation(ctx.prEnvMap, 'uModelView');

    gl.bindVertexArray(cubemap.vao);
    let samplerLoc = gl.getUniformLocation(ctx.prEnvMap, 'uCubemap');
    gl.uniform1i(samplerLoc, 0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemap.texture);

    let M = new Matrix4();
    M.copy(ctx.modelView);
    M.scale(100)
    gl.uniformMatrix4fv(modelViewLoc, false, M);
    gl.drawElements(gl.TRIANGLES, cubemap.iboSize, gl.UNSIGNED_INT, 0);
}

const drawShapes = (ctx: AppContext) => {    
    const gl = ctx.gl;
    const program = ctx.program;

    gl.useProgram(program);

    let projectionLoc = gl.getUniformLocation(program, 'uProjection');
    gl.uniformMatrix4fv(projectionLoc, false, ctx.projection);
    let modelViewLoc = gl.getUniformLocation(program, 'uModelView');
    let normalMatLoc = gl.getUniformLocation(program, 'uNormal');

    for (const shape of ctx.shapes) {
        gl.bindVertexArray(shape.vao);
        let M = new Matrix4();
        M.copy(ctx.modelView);
        if (shape.type == "Ball") {
            M.translate([-1 / 2, 0, 0]);
        }
        gl.uniformMatrix4fv(modelViewLoc, false, M);
        gl.uniformMatrix3fv(normalMatLoc, false, normalMatrix(M));
        
        if (shape.type == "Ball") {
            if (shape.textureID >= 0 ){

                const texLocation = gl.getUniformLocation(ctx.program, 'uTexture');;
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, ctx.textures[shape.textureID]);
                gl.uniform1i(texLocation, 0);
                //gl.bindVertexArray(ctx.vao);
                //ctx.texturePool[shape.textureID];
                gl.drawElements(gl.TRIANGLE_STRIP, shape.iboSize, gl.UNSIGNED_INT, 0); 
            }

            gl.drawElements(gl.TRIANGLE_STRIP, shape.iboSize, gl.UNSIGNED_INT, 0);
        } else {
            if (shape.textureID >= 0) {
                const texLocation = gl.getUniformLocation(ctx.program, 'uTexture');;
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, ctx.textures[shape.textureID]);
                gl.uniform1i(texLocation, 0);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.drawElements(gl.TRIANGLES, shape.iboSize , gl.UNSIGNED_INT, 0);
            }
            //gl.drawElements(gl.TRIANGLES, shape.iboSize , gl.UNSIGNED_INT, 0);
        }

        //gl.disable(gl.TEXTURE0);
    }
};

export const createCuboid = (
    gl: WebGL2RenderingContext,
    pos: Vector3,
    dim: Vector3,
    color: Vector3 = new Vector3(0),
    texID: number = -1,
    ): Shape => {
    const vertices = [];

    function addVertex(x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, v: number) {
      vertices.push(x, y, z, color.x, color.y, color.z, nx, ny, nz, u, v);
    }

    // Unten
    addVertex(pos.x, pos.y, pos.z, 0, -1, 0, 0, 0); // links vorne   0
    addVertex(pos.x + dim.x, pos.y, pos.z, 0, -1, 0, 1, 0); // rechts vorne  3
    addVertex(pos.x + dim.x, pos.y, pos.z + dim.z, 0, -1, 0, 1, 1); // rechts hinten 2
    addVertex(pos.x, pos.y, pos.z + dim.z, 0, -1, 0, 0, 1); // links hinten  1

    // Oben
    addVertex(pos.x, pos.y + dim.y, pos.z, 0, 1, 0, 0, 0); // links vorne   4
    addVertex(pos.x + dim.x, pos.y + dim.y, pos.z, 0, 1, 0, 1, 0); // rechts vorne  7
    addVertex(pos.x + dim.x, pos.y + dim.y, pos.z + dim.z, 0, 1, 0, 1, 1); // rechts hinten 6
    addVertex(pos.x, pos.y + dim.y, pos.z + dim.z, 0, 1, 0, 0, 1); // links hinten  5

    // Links
    addVertex(pos.x, pos.y, pos.z, -1, 0, 0, 0, 0); // unten vorne   8
    addVertex(pos.x, pos.y + dim.y, pos.z, -1, 0, 0, 0, 1); // unten hinten  9
    addVertex(pos.x, pos.y + dim.y, pos.z + dim.z, -1, 0, 0, 1, 1); // oben hinten 10
    addVertex(pos.x, pos.y, pos.z + dim.z, -1, 0, 0, 1, 0); // oben vorne  11

    // Rechts
    addVertex(pos.x + dim.x, pos.y, pos.z, 1, 0, 0, 0, 0); // unten vorne   12
    addVertex(pos.x + dim.x, pos.y + dim.y, pos.z, 1, 0, 0, 0, 1); // unten hinten  13
    addVertex(pos.x + dim.x, pos.y + dim.y, pos.z + dim.z, 1, 0, 0, 1, 1); // oben hinten 14
    addVertex(pos.x + dim.x, pos.y, pos.z + dim.z, 1, 0, 0, 1, 0); // oben vorne  15

    // Vorne
    addVertex(pos.x, pos.y, pos.z, 0, 0, -1, 0, 0); // unten links   16
    addVertex(pos.x + dim.x, pos.y, pos.z, 0, 0, -1, 1, 0); // unten rechts  17
    addVertex(pos.x + dim.x, pos.y + dim.y, pos.z, 0, 0, -1, 1, 1); // oben rechts 18
    addVertex(pos.x, pos.y + dim.y, pos.z, 0, 0, -1, 0, 1); // oben links  19

    // Hinten
    addVertex(pos.x, pos.y, pos.z + dim.z, 0, 0, 1, 0, 0); // unten links   20
    addVertex(pos.x + dim.x, pos.y, pos.z + dim.z, 0, 0, 1, 1, 0); // unten rechts  21
    addVertex(pos.x + dim.x, pos.y + dim.y, pos.z + dim.z, 0, 0, 1, 1, 1); // oben rechts 22
    addVertex(pos.x, pos.y + dim.y, pos.z + dim.z, 0, 0, 1, 0, 1); // oben links  23

    const indices = [
        // Flächen
        // unten
        0, 2, 1,
        0, 2, 3,

        // oben
        4,6,5,
        4,6,7,

        // links
        8,10,9,
        8,10,11,

        // rechts
        12,14,13,
        12,14,15,

        // vorne
        16,18,17,
        16,18,19,
       
        // hinten
        20,22,21,
        20,22,23
    ];

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // position
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 11 * 4, 0);
    // color
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 11 * 4, 3 * 4);
    // normal
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 11 * 4, 6 * 4);
    // texture
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 11 * 4, 9 * 4);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);

    return {
        vao,
        iboSize: indices.length,
        type: "cuboid",
        textureID: texID,
    };
}

export const createPool = (gl: WebGL2RenderingContext, x: number = 4, y: number = 0.1, z: number = 2): Shape[] => {
    const basicShapes = [
        // Tisch
        createCuboid(gl,new Vector3(0,1,0), new Vector3(4,0.1,2), new Vector3(0,1,0), 17),

        // Löcher
        createCuboid(gl,new Vector3(0,1.001,0), new Vector3(0.15,0.1,0.15), new Vector3(0,0,0), 19),
        createCuboid(gl,new Vector3(0,1.001,1.85), new Vector3(0.15,0.1,0.15), new Vector3(0,0,0), 19),
        createCuboid(gl,new Vector3(3.85,1.001,0), new Vector3(0.15,0.1,0.15), new Vector3(0,0,0), 19),
        createCuboid(gl,new Vector3(3.85,1.001,1.85), new Vector3(0.15,0.1,0.15), new Vector3(0,0,0), 19),

        createCuboid(gl,new Vector3(3.85/2,1.001,0), new Vector3(0.15,0.1,0.15), new Vector3(0,0,0), 19),
        createCuboid(gl,new Vector3(3.85/2,1.001,1.85), new Vector3(0.15,0.1,0.15), new Vector3(0,0,0), 19),

        // Bande
        createCuboid(gl,new Vector3(-0.2,1,-0.2), new Vector3(0.2,0.2,2.4), new Vector3(153, 51, 0), 0),
        createCuboid(gl,new Vector3(4,1,-0.2), new Vector3(0.2,0.2,2.4), new Vector3(153, 51, 0), 0),
        createCuboid(gl,new Vector3(4.0,1,-0.2), new Vector3(-4,0.2,0.2), new Vector3(153, 51, 0), 0),
        createCuboid(gl,new Vector3(4.0,1,2), new Vector3(-4,0.2,0.2), new Vector3(153, 51, 0), 0),

        // Beine
        createCuboid(gl,new Vector3(0,0,0), new Vector3(-0.2,1,-0.2), new Vector3(153, 51, 0), 0),
        createCuboid(gl,new Vector3(4,0,0), new Vector3(0.2,1,-0.2), new Vector3(153, 51, 0), 0),
        createCuboid(gl,new Vector3(0,0,2), new Vector3(-0.2,1,0.2), new Vector3(153, 51, 0), 0),
        createCuboid(gl,new Vector3(4,0,2), new Vector3(0.2,1,0.2), new Vector3(153, 51, 0), 0),

        // Lampe
        createCuboid(gl,new Vector3(1,3,1), new Vector3(2,0.2,0.2), new Vector3(153, 51, 0), 0),
        createCuboid(gl,new Vector3(1,2.9,1), new Vector3(2,0.1,0.2), new Vector3(1, 1, 0), 16),
        createCuboid(gl,new Vector3(1.9,3.2,1), new Vector3(0.2,0.5,0.2), new Vector3(153, 51, 0), 0),

        // Kö
        createCuboid(gl,new Vector3(3.85,2,1), new Vector3(4.2,0.05,0.05), new Vector3(153, 102, 51), 18),

        // Boden
        //createCuboid(gl,new Vector3(-8,0,-9), new Vector3(20,-0.2,20), new Vector3(1, 1, 1), 0),
    ]
    return basicShapes;
};

export const loadImage = async (url: string) => {
    const img = new Image();
    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.crossOrigin = "";
        img.src = url;
    })
    return img;
}

export const createBall = (
    gl: WebGL2RenderingContext,
    pos: Vector3 = new Vector3(0,0,0),
    r: number,
    color: Vector3 = new Vector3(1,1,1),
    res: number = 16,
    texID: number = -1,
): Shape => {
    const m = res;
    const n = res;

   const vertices = [];
const indices = [];

const PI = Math.PI;

for (let i = 0; i <= n; i++) {
    const v = i / n;
    const phi = PI * v;
    const sinPhi = Math.sin(phi);
    
    for (let j = 0; j <= m; j++) {
        const u = j / m;
        const theta = 2 * PI * u;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        
        const x = r * sinPhi * cosTheta + pos.x;
        const y = r * sinPhi * sinTheta + pos.y;
        const z = r * Math.cos(phi) + pos.z;

        vertices.push(x, y, z); // Position
        vertices.push(color.x, color.y, color.z); // Farbe
        vertices.push(sinPhi * cosTheta, sinPhi * sinTheta, cosTheta); // Normal
        vertices.push(u, -v); // Textur
    }
}

for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
        const p1 = i * (m + 1) + j;
        const p2 = p1 + m + 1;
        
        indices.push(p1, p2, p1 + 1, p1 + 1, p2, p2 + 1);
    }
}
    
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    // position
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 11 * 4, 0);
    // color
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 11 * 4, 3 * 4);
    // normal
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 11 * 4, 6 * 4);
    // texture
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 11 * 4, 9 * 4);

    const iboBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iboBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);

    return { vao, iboSize: indices.length, type: "Ball", textureID: texID};
}

export const createBalls = (gl: WebGL2RenderingContext): Shape[] => {
    const root3 = 1.732;
    const delta = root3/20;
    const basicShapes = [
        createBall(gl, new Vector3(1.1,1.15,1),0.05, new Vector3(1,0,0),16,12),
        createBall(gl, new Vector3(1.1,1.15,1.1),0.05, new Vector3(0,0,1),16,6),
        createBall(gl, new Vector3(1.1,1.15,1.2),0.05, new Vector3(1,0,0),16,15),
        createBall(gl, new Vector3(1.1,1.15,0.9),0.05, new Vector3(0,0,1),16,13),
        createBall(gl, new Vector3(1.1,1.15,0.8),0.05, new Vector3(1,0,0),16,5),

        createBall(gl, new Vector3(1.1+delta,1.15,1.15),0.05, new Vector3(0,0,1),16,4),
        createBall(gl, new Vector3(1.1+delta,1.15,1.05),0.05, new Vector3(1,0,0),16,14),
        createBall(gl, new Vector3(1.1+delta,1.15,0.95),0.05, new Vector3(0,0,1),16,7),
        createBall(gl, new Vector3(1.1+delta,1.15,0.85),0.05, new Vector3(0,0,1),16,11),

        createBall(gl, new Vector3(1.1+2*delta,1.15,1.10),0.05, new Vector3(1,0,0),16,3),
        createBall(gl, new Vector3(1.1+2*delta,1.15,1.00),0.05, new Vector3(0,0,0),16,8),
        createBall(gl, new Vector3(1.1+2*delta,1.15,0.90),0.05, new Vector3(1,0,0),16,10),

        createBall(gl, new Vector3(1.1+3*delta,1.15,1.05),0.05, new Vector3(1,0,0),16,9),
        createBall(gl, new Vector3(1.1+3*delta,1.15,0.95),0.05, new Vector3(0,0,1),16,2),

        createBall(gl, new Vector3(1.1+4*delta,1.15,1),0.05, new Vector3(1,0,1), 16, 1),

        createBall(gl, new Vector3(3.3, 1.15,1),0.06, new Vector3(1,1,1), 16, 16),
    ];
    return basicShapes;
}

export const mouseToTrackball = (gl: WebGL2RenderingContext, p: Vector2): Vector3 => {
    let u = worldCoord(gl, p);
    let d = u[0] * u[0] + u[1] * u[1];
    let v = new Vector3();
    if (d > 1.0) {
        d = Math.sqrt(d);
        v.set(u[0] / d, u[1] / d, 0.0);
    } else
        v.set(u[0], u[1], Math.sqrt(1.0 - d * d));
    return v;
}

export const trackball = (u: Vector3, v: Vector3): Quaternion => {
    let uxv = new Vector3(u);
    uxv.cross(v);
    const uv = u.dot(v);
    let ret = new Quaternion(uxv[0], uxv[1], uxv[2], 1 + uv);
    ret.normalize();
    return ret;
}

const App = () => {
    const canvas = React.useRef<HTMLCanvasElement>()
    const context = React.useRef<AppContext>();
    const renderUI = useForceUpdate();

    const mouseDown = (event: MouseEvent): void => {
        if (!context.current) return;
        const ctx = context.current;
        ctx.mousePressed = true;
        ctx.mousePos = new Vector2(event.clientX, event.clientY);
    }

    const mouseUp = (event: MouseEvent): void => {
        if (!context.current) return;
        const ctx = context.current;
        ctx.mousePressed = false;
    }

    const mouseMove = (event: MouseEvent) => {

        if (!context.current) return;
        const ctx = context.current;

        if (ctx.mousePressed) {
            const newPos = new Vector2(event.clientX, event.clientY);
            let p0 = mouseToTrackball(ctx.gl, ctx.mousePos);
            let p1 = mouseToTrackball(ctx.gl, newPos);

            ctx.orientation.multiplyLeft(trackball(p0, p1));
            ctx.orientation.normalize();

            // console.log('Move',event.button,event.clientX, event.clientY);
            ctx.mousePos = newPos;
            drawScene();
        }
    }

    const mouseWheel = (event: WheelEvent) => {
        if (!context.current) return;
        const ctx = context.current;

        if (event.deltaY > 0.0) ctx.zoom *= 1.1; else ctx.zoom /= 1.1;
        // console.log('Wheel',event.deltaY,event.clientX, event.clientY);
        drawScene();
    }

    const drawScene = () => {

        // if (!context.current) return;
        // const ctx = context.current;
        // const gl = ctx.gl;
        // const modelView = ctx.modelView;
        // const zoom = ctx.zoom;
        // const viewMode = ctx.viewMode;
        // const qNow = ctx.orientation;

        // let aspect = gl.canvas.width / gl.canvas.height;
        // let camX = 0;
        // let camY = 0;
        // let camZ = 10;

        // ctx.projection = new Matrix4().perspective({
        //     fovy: Math.PI / 2,
        //     aspect: aspect,
        //     near: 0.01,
        //     far: 300
        // })  
        // modelView.identity();
        // modelView.fromQuaternion(qNow);
        // modelView.translate([-5, -3, -1])
        
        // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // drawShapes(ctx);
        // drawCubemap(ctx, ctx.cubemaps[ctx.currentCubemap]);
        if (!context.current) return;
        const ctx = context.current;
        const gl = ctx.gl;
        const program = ctx.program;
        const modelView = ctx.modelView;
        const zoom = ctx.zoom;
        const viewMode = ctx.viewMode;
        const qNow = ctx.orientation;

        let mynear = 2;
        let myfar = 1000;
        let aspect = gl.canvas.width / gl.canvas.height;
        let displayHeight = 40;
        let displayWidth = aspect * displayHeight;
        let camX = 1;
        let camY = 9;
        let camZ = 50;
        let left = mynear * (-displayWidth / 2 - camX) / camZ;
        let right = mynear * (displayWidth / 2 - camX) / camZ;
        let bottom = mynear * (-displayHeight / 2 - camY) / camZ;
        let top = mynear * (displayHeight / 2 - camY) / camZ;

        ctx.projection.identity();
        if (viewMode == ViewMode.Orthographic) {
            ctx.projection = new Matrix4().ortho(
                {
                    left: -displayWidth / 2, right: displayWidth / 2,
                    bottom: -displayHeight / 2, top: displayHeight / 2,
                    near: mynear, far: myfar
                });
        }

        if (viewMode == ViewMode.Perspective) {
            ctx.projection = new Matrix4().frustum(
                {
                    'left': left, 'right': right,
                    'bottom': bottom, 'top': top,
                    'near': mynear, 'far': myfar
                });
        }
        
        ctx.projection.translate([-camX, -camY, -camZ]);

        camX = -3;
        left = mynear * (-displayWidth / 2 - camX) / camZ;
        right = mynear * (displayWidth / 2 - camX) / camZ;
        bottom = mynear * (-displayHeight / 2 - camY) / camZ;
        top = mynear * (displayHeight / 2 - camY) / camZ;

        let PLeft = new Matrix4();
        PLeft.frustum({
            'left': left, 'right': right,
            'bottom': bottom, 'top': top,
            'near': mynear, 'far': myfar
        });
        PLeft.translate([-camX, -camY, -camZ]);

        camX = 3;
        left = mynear * (-displayWidth / 2 - camX) / camZ;
        right = mynear * (displayWidth / 2 - camX) / camZ;
        bottom = mynear * (-displayHeight / 2 - camY) / camZ;
        top = mynear * (displayHeight / 2 - camY) / camZ;

        let PRight = new Matrix4();
        PRight.frustum({
            'left': left, 'right': right,
            'bottom': bottom, 'top': top,
            'near': mynear, 'far': myfar
        });
        PRight.translate([-camX, -camY, -camZ]);

        modelView.identity();
        modelView.fromQuaternion(qNow);

        modelView.translate([-10,-5,0])
        modelView.scale([zoom, zoom, zoom]);
        modelView.scale([15, 15, 15]);

        let colorLoc = gl.getUniformLocation(program, 'uColor');
        gl.uniform3fv(colorLoc, [1, 1, 1]);

        gl.colorMask(true, true, true, true);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        if (viewMode == ViewMode.Stereo) {
            gl.colorMask(true, false, false, true);
            ctx.projection = PLeft;
            drawShapes(ctx);

            gl.clear(gl.DEPTH_BUFFER_BIT);

            gl.colorMask(false, true, true, true);
            ctx.projection = PRight;
            drawShapes(ctx);
        }else{
           // drawShapes(ctx);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            drawShapes(ctx);
            drawCubemap(ctx, ctx.cubemaps[ctx.currentCubemap]);
        }
        drawCubemap(ctx, ctx.cubemaps[ctx.currentCubemap]);

    }

    const createTexture = async (gl: WebGLRenderingContext, image: string) => {
        const tex: WebGLTexture = gl.createTexture();
        const img = await loadImage(image);
      
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        return tex;
    }
    const init = async () => {
        // Initialize WebGL2 Context / OpenGL ES 3.0
        const gl = canvas.current.getContext('webgl2', { antialias: true })
        if (!gl) return;
        // Load the vertex and fragment shader source code
        
        const cubemaps: { [key: string]: Cubemap } = {};
        const values = Object.values(CubemapType)
        for (let i = 0; i < values.length; i++) {
            cubemaps[values[i]] = await createCubemap(gl, values[i]);
        }
        // Load the vertex and fragment shader source code
        const prEnvMap = compileShaderProgram(gl, EnvMapVS, EnvMapFS);
        gl.useProgram(prEnvMap)

        const program = compileShaderProgram(gl, VertexCode, FragmentCode);
        gl.useProgram(program);

        const radius = 2;

        gl.clearColor(0.5, 0.5, 0.5, 1);
        gl.enable(gl.DEPTH_TEST);
        // gl.enable(gl.CULL_FACE);

        const resizeHandler = () => 
        {
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            drawScene();
        }

        canvas.current.addEventListener('mousedown', mouseDown);
        canvas.current.addEventListener('mouseup', mouseUp);
        canvas.current.addEventListener('mousemove', mouseMove);
        canvas.current.addEventListener('wheel', mouseWheel);

        context.current = {
            gl,
            shapes: [...createPool(gl), ...createBalls(gl)],
            program,
            modelView: new Matrix4().identity(),
            projection: new Matrix4().identity(),
            mousePos: new Vector2(),
            mousePressed: false,
            aspect: 1.0,
            zoom: 0.7 / (0.5 * radius + 1.0),
            viewMode: ViewMode.Perspective,
            orientation: new Quaternion(),
            vao: createBall(gl, new Vector3(1,1,1), 1, new Vector3(1,0.5,0)).vao,
            textures: [
                 await createTexture(gl, WoodTexture),
                 await createTexture(gl, FirstTexture),
                 await createTexture(gl, SecondTexture),
                 await createTexture(gl, ThirdTexture),
                 await createTexture(gl, FourthTexture),
                 await createTexture(gl, FifthTexture),
                 await createTexture(gl, SixthTexture),
                 await createTexture(gl, SeventhTexture),
                 await createTexture(gl, EighthTexture),
                 await createTexture(gl, NinthTexture),
                 await createTexture(gl, TenthTexture),
                 await createTexture(gl, EleventhTexture),
                 await createTexture(gl, TwelfthTexture),
                 await createTexture(gl, ThirteenthTexture),
                 await createTexture(gl, FourteenthTexture),
                 await createTexture(gl, FifteenthTexture),

                 await createTexture(gl, WhiteTexture),
                 await createTexture(gl, GreenTexture),
                 await createTexture(gl, KoeTexture),
                 await createTexture(gl, HoleTexture),
            ],

            fov: Math.PI / 2,
            phi: 0.0,
            theta: 0.0,
            currentCubemap: CubemapType.Park,
            cubemaps,
            prEnvMap,
            texture: null,
            meshes: [...createPool(gl), ...createBalls(gl)],
        }

        resizeCanvas(canvas.current);
        resizeHandler();

        window.addEventListener('resize', () => {
            if (resizeCanvas(canvas.current)) {
                resizeHandler();
            }
        });
    }

    React.useEffect(() => {
        init();
    }, [])

    return (
        <div className='relative bg-black h-[inherit] w-full'>
            <canvas ref={canvas} className='w-full h-[inherit]'></canvas>

            <UIPanel>
                <UILabel title="View Mode">
                    <MultiSwitch
                        onChange={(value) => {
                            context.current.viewMode = value;
                            drawScene();
                            renderUI();
                        }}
                    >
                        <MultiSwitchElement
                            label="Stereo"
                            value={ViewMode.Stereo}
                        />
                        <MultiSwitchElement
                            label="Orthographic"
                            value={ViewMode.Orthographic}
                        />
                        <MultiSwitchElement
                            label="Perspective"
                            value={ViewMode.Perspective}
                        />
                    </MultiSwitch>
                </UILabel>
            </UIPanel>
        </div>
    )
}
export default App
