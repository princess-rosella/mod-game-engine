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

import { Size } from "../Types";
import { IReadonlyMatrix3 } from "../Math/Matrix3";
import { IScreen, IScreenPhysical, Features, IScreenDelegate, ILayer, ISprite, ScreenType } from "./Interfaces";

const canvasToScreen = new WeakMap<HTMLCanvasElement, IScreen>();

export abstract class Screen implements IScreenPhysical {
    readonly canvas:   HTMLCanvasElement;
    readonly features: Features;

    cssWidth:  number  = 1;
    cssHeight: number  = 1;
    size:      Size    = Object.freeze({ width: 1, height: 1});
    dirty:     boolean = false;

    delegate?: IScreenDelegate;

    constructor(canvas: HTMLCanvasElement, features: Features) {
        canvasToScreen.set(canvas, this);
        this.canvas   = canvas;
        this.features = Object.freeze(Object.assign({}, features));
    }

    static get(canvas: HTMLCanvasElement): IScreen | undefined {
        return canvasToScreen.get(canvas);
    }

    sizeMightHaveChanged(): void {
        const devicePixelRatio = window.devicePixelRatio || 1;
        const rect             = this.canvas.getBoundingClientRect();
        const width            = Math.max(Math.floor(rect.width  * devicePixelRatio), 1) | 0;
        const height           = Math.max(Math.floor(rect.height * devicePixelRatio), 1) | 0;

        if ((this.size.width === width) && (this.size.height === height))
            return;

        const previousWidth  = this.size.width;
        const previousHeight = this.size.height;

        this.cssWidth  = rect.width;
        this.cssHeight = rect.height;
        this.size      = Object.freeze({width, height});

        this.onSizeChanged(width, height, previousWidth, previousHeight);
    }

    onSizeChanged(width: number, height: number, previousWidth: number, previousHeight: number) {
        if (this.delegate)
            this.delegate.onScreenSizeChanged(width, height, previousWidth, previousHeight);
    }

    abstract get type(): ScreenType;
    abstract get plugged(): boolean;
    abstract get layer(): ILayer;
    abstract createLayer(matrix: IReadonlyMatrix3, z?: number): ILayer;
    abstract createSprite(matrix: IReadonlyMatrix3, z?: number): ISprite;

    drawIfNeeded(): void {
        if (!this.dirty)
            return;

        this.draw();
    }

    abstract draw(): void;
}
