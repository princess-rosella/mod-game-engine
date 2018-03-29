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

import { Cell, CellOwnership } from "./Cell";
import { Screen } from "../Screen";
import { Sprite } from "./Sprite";
import { Surface } from "./Surface";
import { Layer, MainLayer } from "./Layer";
import { Matrix3, IReadonlyMatrix3 } from "../../Math/Matrix3";
import { Features, ILayer, ISprite, ICell, ISurface, ScreenType } from "../Interfaces";
import { IScreenWebGL } from "./Interfaces";

const cellNumberOfFloatPerVertex = 4;
const cellNumberOfVertex         = 6;

const floor = Math.floor;

export class ScreenPhysical extends Screen implements IScreenWebGL {
    context: WebGLRenderingContext;
    layer:   MainLayer;
    surface: Surface;

    depthTextureExtension: WEBGL_depth_texture | null;

    constructor(canvas: HTMLCanvasElement, features: Features, context: WebGLRenderingContext) {
        super(canvas, features);
        this.context = context;
        this.depthTextureExtension = context.getExtension("WEBGL_depth_texture");
        this.canvas.addEventListener("webglcontextlost",     (ev) => { this.onContextLost(ev);     });
        this.canvas.addEventListener("webglcontextrestored", (ev) => { this.onContextRestored(ev); });
        this.surface = new Surface(context, null, !!features.needClipping);
        this.layer   = new MainLayer(this);
        this.createMainLayerMatrix(this.layer.matrix);
    }

    private onContextLost(ev: Event) {
        if (this.delegate)
            this.delegate.onScreenUnplugged(ev);
    }

    private onContextRestored(ev: Event) {
        const attributes = ScreenPhysical.attributesForFeatures(this.features);
        const context    = this.canvas.getContext('webgl', attributes) || this.canvas.getContext('experimental-webgl', attributes);
        if (!context) {
            if (this.delegate)
                this.delegate.onScreenFatalError(new Error("Failed to restore WebGL context"));
            return;
        }

        if (this.delegate)
            this.delegate.onScreenPlugged(ev);
    }

    private createMainLayerMatrix(out: Matrix3): void {
        let resolution = this.features.resolution;
        if (!resolution) {
            out.setSimpleOrtographic(this.size.width, this.size.height);
            return;
        }

        const resolutionRatio = resolution.width / resolution.height;
        const canvasRatio     = this.size.width  / this.size.height;

        if (this.features.keepPixelRatio) {
            const scale          = Math.max(1, Math.floor(this.size.height / resolution.height), Math.round(this.size.width / resolution.width));
            const scaledWidth    = resolution.width  * scale;
            const scaledHeight   = resolution.height * scale;
            const blackBarWidth  = (this.size.width  - scaledWidth)  / 2 / scale;
            const blackBarHeight = (this.size.height - scaledHeight) / 2 / scale;

            out.setOrtographic(-blackBarWidth, resolution.width + blackBarWidth, -blackBarHeight, resolution.height + blackBarHeight);
            return;
        }

        if (this.features.keepAspectRatio) {
            if (resolutionRatio >= canvasRatio) {
                const ajustedHeight  = resolution.width / canvasRatio;
                const blackBarHeight = (ajustedHeight - resolution.height) / 2;

                out.setOrtographic(0, resolution.width, -blackBarHeight, resolution.height + blackBarHeight);
            }
            else {
                const ajustedWidth   = resolution.height * canvasRatio;
                const blackBarWidth  = (ajustedWidth - resolution.width) / 2;

                out.setOrtographic(-blackBarWidth, resolution.width + blackBarWidth, 0, resolution.height);
            }

            return;
        }

        out.setSimpleOrtographic(this.size.width, this.size.height);
    }

    onSizeChanged(width: number, height: number, previousWidth: number, previousHeight: number) {
        super.onSizeChanged(width, height, previousWidth, previousHeight);

        if (this.layer)
            this.createMainLayerMatrix(this.layer.matrix);
    }

    get plugged(): boolean {
        return this.context.isContextLost();
    }

    static attributesForFeatures(features: Features): WebGLContextAttributes {
        return <WebGLContextAttributes>{
            "alpha":           false,
            "depth":           !!features.needDepth,
            "stencil":         !!features.needClipping,
            "powerPreference": "low-power",
        };
    }

    createLayer(matrix: IReadonlyMatrix3, z: number = 0): ILayer {
        return new Layer(this, matrix, z);
    }

    createSprite(matrix: IReadonlyMatrix3, z: number = 0): ISprite {
        return new Sprite(this, matrix, z);
    }

    static setCellVerticesForTexture(buffer: Float32Array, index: number, uvX1: number, uvY1: number, uvX2: number, uvY2: number, pivotUVX: number, pivotUVY: number, width: number, height: number): void {
        const uvW = (uvX2 - uvX1);
        const uvH = (uvY2 - uvY1);

        const b2  = floor((uvX1 - pivotUVX) * width  / uvW);
        const b3  = floor((uvY1 - pivotUVY) * height / uvH);
        const b2w = b2 + width;
        const b3h = b3 + height;

        buffer[index +  0] = uvX1;
        buffer[index +  1] = uvY2;
        buffer[index +  2] = b2;
        buffer[index +  3] = b3;

        buffer[index +  4] = uvX2;
        buffer[index +  5] = uvY2;
        buffer[index +  6] = b2w;
        buffer[index +  7] = b3;

        buffer[index +  8] = uvX2;
        buffer[index +  9] = uvY1;
        buffer[index + 10] = b2w;
        buffer[index + 11] = b3h;

        buffer[index + 12] = uvX1;
        buffer[index + 13] = uvY2;
        buffer[index + 14] = b2;
        buffer[index + 15] = b3;

        buffer[index + 16] = uvX2;
        buffer[index + 17] = uvY1;
        buffer[index + 18] = b2w;
        buffer[index + 19] = b3h;

        buffer[index + 20] = uvX1;
        buffer[index + 21] = uvY1;
        buffer[index + 22] = b2;
        buffer[index + 23] = b3h;
    }

    createCellWithWebGLTexture(tex: WebGLTexture, uvX1: number, uvY1: number, uvX2: number, uvY2: number, pivotUVX: number, pivotUVY: number, width: number, height: number, ownership: CellOwnership = CellOwnership.OwnVertexes): ICell {
        const floats = new Float32Array(cellNumberOfFloatPerVertex * cellNumberOfVertex);

        ScreenPhysical.setCellVerticesForTexture(floats, 0, uvX1, uvY1, uvX2, uvY2, pivotUVX, pivotUVY, width, height);

        const context = this.context;
        const buffer  = context.createBuffer();

        if (!buffer)
            throw new Error("Failed to create WebGL buffer");

        context.bindBuffer(context.ARRAY_BUFFER, buffer);
        context.bufferData(context.ARRAY_BUFFER, floats, context.STATIC_DRAW);
        return new Cell(tex, buffer, 0, floats.length / cellNumberOfFloatPerVertex, Object.freeze({
            x:      floats[2],
            y:      floats[3],
            width:  width,
            height: height
        }), ownership);
    }

    createCellWithImage(image: HTMLImageElement, uvX1: number, uvY1: number, uvX2: number, uvY2: number, pivotUVX: number, pivotUVY: number, width: number, height: number): ICell {
        const context = this.context;
        const texture = context.createTexture();

        if (!texture)
            throw new Error("Failed to create WebGL texture");

        const TEXTURE_2D = context.TEXTURE_2D;

        context.bindTexture(TEXTURE_2D, texture);
        context.texImage2D(TEXTURE_2D, 0, context.RGBA, context.RGBA, context.UNSIGNED_BYTE, image);
        context.texParameteri(TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
        context.texParameteri(TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
        context.texParameteri(TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
        context.texParameteri(TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
        return this.createCellWithWebGLTexture(texture, uvX1, uvY1, uvX2, uvY2, pivotUVX, pivotUVY, width, height, CellOwnership.OwnVertexes | CellOwnership.OwnTexture);
    }

    get type(): ScreenType {
        return ScreenType.Physical;
    }

    createSurface(width: number, height: number, features: Features) : ISurface {
        const gl  = this.context;
        const fbo = gl.createFramebuffer();
        const colorTex = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, colorTex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTex, 0);

        const hasStencil = !!features.needClipping && !!this.depthTextureExtension;
        let   depthStencilTex: WebGLTexture | null = null;

        if (hasStencil) {
            depthStencilTex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, colorTex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_STENCIL, width, height, 0, gl.DEPTH_STENCIL, this.depthTextureExtension!.UNSIGNED_INT_24_8_WEBGL, null);

            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.TEXTURE_2D, depthStencilTex, 0);
        }
        else if (features.needDepth && this.depthTextureExtension) {
            depthStencilTex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, colorTex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);

            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthStencilTex, 0);
        }

        return new Surface(gl, fbo, hasStencil, colorTex, depthStencilTex);
    }

    draw(): void {
        const gl = this.context;

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
        this.layer.draw(this.surface);
    }
}
