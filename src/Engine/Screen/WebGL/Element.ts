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

import { DynamicMatrix3, VersionnedMatrix3, IReadonlyMatrix3 } from "../../Math/Matrix3";
import { IScreen, ILayer, ISurface, ElementType } from "../Interfaces";
import { ILayerWebGL, ElementFlags, IElementWebGL } from "./Interfaces";

export abstract class Element implements IElementWebGL {
    screen: IScreen;
    flags:  ElementFlags       = 0;
    parent: ILayerWebGL | null = null;
    _z:     number;

    readonly matrix          = new VersionnedMatrix3();
    readonly effectiveMatrix = new DynamicMatrix3();

    constructor(screen: IScreen, matrix?: IReadonlyMatrix3, z: number = 0) {
        this.screen = screen;
        this._z     = z;

        if (matrix)
            this.matrix.setMatrix(matrix);
        else
            this.matrix.setIdentify();

        this.effectiveMatrix.matrixB = this.matrix;
        this.matrix.callback = () => {
            screen.dirty = true;
        };
    }

    get z(): number {
        return this._z;
    }

    set z(z: number) {
        if (this.z === z)
            return;

        this.z            = z;
        this.screen.dirty = true;

        const parent = this.parent;
        if (parent)
            parent.flags |= ElementFlags.NeedsReordering;
    }

    attach(layer: ILayer): void {
        if (this.parent === layer)
            return;

        (<ILayerWebGL>layer).elements.push(this);
        (<ILayerWebGL>layer).flags |= ElementFlags.NeedsReordering;
        this.parent                  = <ILayerWebGL>layer;
        this.screen.dirty            = true;
        this.effectiveMatrix.matrixA = layer.effectiveMatrix;
    }

    detach(): void {
        const parent = this.parent;
        if (!parent)
            return;

        const elements = parent.elements;
        const index    = elements.indexOf(this);
        if (index < 0)
            return;

        elements.splice(index, 1);
        this.parent                  = null;
        this.effectiveMatrix.matrixA = null;
    }

    abstract get screenElementType(): ElementType;
    abstract draw(surface: ISurface): void;
}
