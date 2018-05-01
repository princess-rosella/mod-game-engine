/*
 * Copyright (c) 2018 Princess Rosella. All rights reserved.
 *
 * @LICENSE_HEADER_START@
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @LICENSE_HEADER_END@
 */

import { Cell } from "./Cell";
import { createProgram, createShader } from "./Shader";
import { IReadonlyMatrix3 } from "../../Math/Matrix3";
import { ICell, ISurface } from "../Interfaces";

const drawVertexShaderCode = `
    uniform mat3 uMatrix;

    attribute vec2 vVertex;
    attribute vec2 vUV;

    varying highp vec2 fUV;

    void main(void) {
        gl_Position = vec4(uMatrix * vec3(vVertex, 1.0), 1.0);
        fUV = vUV;
    }
`;

const drawPixelShaderCode = `
    uniform sampler2D uTex;

    varying highp vec2 fUV;

    void main(void) {
        mediump vec4 texColor = texture2D(uTex, fUV);
        if (texColor.w <= 0.0)
            discard;

        gl_FragColor = texColor;
    }
`;

class SurfaceContextInfo {
    currentFramebuffer: WebGLFramebuffer | null = null;

    drawProgram!:          WebGLProgram;
    drawProgramMatrixU!:   WebGLUniformLocation;
    drawProgramTextureU!:  WebGLUniformLocation;
    drawProgramVerticesV!: number;
    drawProgramTexturesV!: number;

    constructor(context: WebGLRenderingContext) {
        const drawVertexShader = createShader(context, context.VERTEX_SHADER,   drawVertexShaderCode);
        const drawPixelShader  = createShader(context, context.FRAGMENT_SHADER, drawPixelShaderCode);

        this.drawProgram          = createProgram(context, drawVertexShader, drawPixelShader);
        this.drawProgramMatrixU   = <WebGLUniformLocation>context.getUniformLocation(this.drawProgram, "uMatrix");
        this.drawProgramTextureU  = <WebGLUniformLocation>context.getUniformLocation(this.drawProgram, "uTex");
        this.drawProgramVerticesV = context.getAttribLocation(this.drawProgram, "vVertex");
        this.drawProgramTexturesV = context.getAttribLocation(this.drawProgram, "vUV");
    }

    _blitBuffer?: WebGLBuffer;

    blitBuffer(context: WebGLRenderingContext): WebGLBuffer {
        if (this._blitBuffer)
            return this._blitBuffer;

        this._blitBuffer = context.createBuffer()!;

        context.bindBuffer(context.ARRAY_BUFFER, this._blitBuffer);
        context.bufferData(context.ARRAY_BUFFER, new Float32Array([
            0,  0, -1, -1,
            1,  0,  1, -1,
            1,  1,  1,  1,
            0,  0, -1, -1,
            1,  1,  1,  1,
            0,  1, -1,  1,
        ]), context.STATIC_DRAW);

        return this._blitBuffer;
    }
}

const surfaceContextInfo = new WeakMap<WebGLRenderingContext, SurfaceContextInfo>();

export class Surface implements ISurface {
    context:      WebGLRenderingContext;
    framebuffer:  WebGLFramebuffer | null;
    hasStencil:   boolean;
    clipLevel:    number = 0;
    colorTex:     WebGLTexture | null;
    depthTex:     WebGLTexture | null;
    private info: SurfaceContextInfo;

    constructor(context: WebGLRenderingContext, framebuffer: WebGLFramebuffer | null, hasStencil: boolean, colorTex: WebGLTexture | null = null, depthTex: WebGLTexture | null = null) {
        this.context     = context;
        this.framebuffer = framebuffer;
        this.hasStencil  = hasStencil;
        this.colorTex    = colorTex;
        this.depthTex    = depthTex;

        let info = surfaceContextInfo.get(context);

        if (!info) {
            info = new SurfaceContextInfo(context);
            surfaceContextInfo.set(context, info);
        }

        this.info = info;
    }

    protected ensureFramebufferIsCurrent(): void {
        const framebuffer = this.framebuffer;

        if (this.info.currentFramebuffer !== framebuffer) {
            const context = this.context;
            context.bindFramebuffer(context.FRAMEBUFFER, framebuffer);
        }
    }

    draw(matrix: IReadonlyMatrix3, abstractCell: ICell): void {
        this.ensureFramebufferIsCurrent();
        this._draw(matrix, abstractCell);
    }

    private _draw(matrix: IReadonlyMatrix3, abstractCell: ICell): void {
        const context = this.context;
        const cell    = <Cell>abstractCell;
        const info    = this.info;

        context.useProgram(info.drawProgram);

        // Texture
        context.activeTexture(context.TEXTURE0);
        context.bindTexture(context.TEXTURE_2D, cell.tex);

        // Vertices
        context.bindBuffer(context.ARRAY_BUFFER, cell.vertexes);
        context.enableVertexAttribArray(info.drawProgramTexturesV);
        context.vertexAttribPointer(info.drawProgramTexturesV, 2, context.FLOAT, false, 16, 0);
        context.enableVertexAttribArray(info.drawProgramVerticesV);
        context.vertexAttribPointer(info.drawProgramVerticesV, 2, context.FLOAT, false, 16, 8);

        // Uniforms
        context.uniformMatrix3fv(info.drawProgramMatrixU, false, matrix.m);
        context.uniform1i(info.drawProgramTextureU, 0);
        context.drawArrays(context.TRIANGLE_FAN, cell.index, cell.count);
    }
}
