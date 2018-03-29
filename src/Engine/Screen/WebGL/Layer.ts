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

import { Element } from "./Element";
import { IReadonlyMatrix3 } from "../../Math/Matrix3";
import { IScreenWebGL, IElementWebGL, ILayerWebGL, ElementFlags } from "./Interfaces";
import { ElementType, ISurface } from "../Interfaces";

export class Layer extends Element implements ILayerWebGL {
    elements: IElementWebGL[] = [];

    constructor(screen: IScreenWebGL, matrix?: IReadonlyMatrix3, z?: number) {
        super(screen, matrix, z);
    }

    get screenElementType(): ElementType {
        return ElementType.Layer;
    }

    draw(surface: ISurface): void {
        if (this.flags & ElementFlags.NeedsReordering) {
            this.flags &= ~ElementFlags.NeedsReordering
            this.elements.sort((a, b) => {
                return a.z - b.z;
            });
        }

        for (const element of this.elements)
            element.draw(surface);
    }
}

export class MainLayer extends Layer {
    set z(z: number) {
        throw new Error("The screen's main layer can't be reordered. It is always 0.");
    }

    detach(): void {
        throw new Error("The screen's main layer can't be detached.");
    }
}
