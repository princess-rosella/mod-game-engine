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

import { Rectangle } from "../../Types";
import { ICell } from "../Interfaces";

export const enum CellOwnership {
    OwnTexture  = 1 << 0,
    OwnVertexes = 1 << 1
};

export class Cell implements ICell {
    tex:         WebGLTexture | null;
    vertexes:    WebGLBuffer  | null;
    index:       number;
    count:       number;
    boundingBox: Readonly<Rectangle>;
    ownership:   CellOwnership | undefined;

    constructor(tex: WebGLTexture, vertexes: WebGLBuffer, index: number, count: number, boundingBox: Readonly<Rectangle>, ownership?: CellOwnership) {
        this.tex         = tex;
        this.vertexes    = vertexes;
        this.index       = index;
        this.count       = count;
        this.boundingBox = Object.freeze(<Rectangle>boundingBox);

        if (ownership)
            this.ownership = ownership;
    }

    invalidate(context: WebGLRenderingContext): void {
        if (this.ownership) {
            if (this.tex && (this.ownership & CellOwnership.OwnTexture))
                context.deleteTexture(this.tex);

            if (this.vertexes && (this.ownership & CellOwnership.OwnVertexes))
                context.deleteBuffer(this.vertexes);
        }

        this.tex      = null;
        this.vertexes = null;
    }
}
