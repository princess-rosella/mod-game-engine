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

export function createShader(context: WebGLRenderingContext, type: number, code: string) {
    const shader = context.createShader(type);
    if (!shader)
        throw new Error("Can't create WebGL shader");

    context.shaderSource(shader, code);
    context.compileShader(shader);

    if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
        const typeString = (type === context.VERTEX_SHADER)? "vertex": "fragment";
        const log = context.getShaderInfoLog(shader);
        context.deleteShader(shader);
        throw new Error(`Can't compile WebGL ${typeString} shader: ${log}`);
    }

    return shader;
}

export function createProgram(context: WebGLRenderingContext, vertexShader: WebGLShader, pixelShader: WebGLShader): WebGLProgram {
    const program = context.createProgram();
    if (!program)
        throw new Error("Can't create WebGL program");

    context.attachShader(program, vertexShader);
    context.attachShader(program, pixelShader);
    context.linkProgram(program);

    if (!context.getProgramParameter(program, context.LINK_STATUS)) {
        const log = context.getProgramInfoLog(program);
        context.deleteProgram(program);
        throw new Error(`Can't link WebGL program: ${log}`);
    }

    return program;
}
