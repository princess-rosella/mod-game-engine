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

import { ScreenPhysical }    from "./WebGL/ScreenPhysical";
import { Features, IScreen } from "./Interfaces";
import { Screen }            from "./Screen";

export class ScreenFactory {
    static create(canvas: HTMLCanvasElement, features: Features): IScreen {
        const attributes = ScreenPhysical.attributesForFeatures(features);
        let   context    = undefined;//canvas.getContext('webgl2', attributes);

        if (!context)
            context = canvas.getContext('webgl', attributes) || canvas.getContext('experimental-webgl', attributes);

        if (!context)
            throw new Error("WebGL unsupported");

        return new ScreenPhysical(canvas, features, <WebGLRenderingContext>context)
    }

    static createFullwindow(canvasID: string, features: Features): IScreen {
        const screenElement = <HTMLCanvasElement>document.getElementById(canvasID);
        if (!screenElement)
            throw new Error("Sreen element not found");
    
        if (!(screenElement instanceof HTMLCanvasElement))
            throw new Error("Screen element is not a <canvas>");
    
        screenElement.style.width  = "100%";
        screenElement.style.height = "100%";

        function updateScreenElementSize() {
            const devicePixelRatio = window.devicePixelRatio || 1;
            screenElement.width  = window.innerWidth  * devicePixelRatio;
            screenElement.height = window.innerHeight * devicePixelRatio;
        }
    
        updateScreenElementSize();
    
        const screen = <Screen><any>ScreenFactory.create(screenElement, features);
    
        window.addEventListener("resize", (ev) => {
            updateScreenElementSize();
            screen.sizeMightHaveChanged();
        });

        return screen;
    }
}
