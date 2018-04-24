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

import { Rectangle, Size, Fraction } from "../Types";
import { IReadonlyMatrix3, IVersionnedMatrix3, IMatrix3 } from "../Math/Matrix3";

export const enum ScreenType {
    Physical,
    Texture
};

export interface IScreenDelegate {
    /**
     * This event is sent when the screen changes resolution. While on some
     * platform, this *never* happens, on desktop, window resizing will trigger
     * this event.
     */
    onScreenSizeChanged(width: number, height: number, previousWidth: number, previousHeight: number): void;

    /**
     * This event is sent when the screen is unplugged. All updates are
     * temporarely stopped.
     */
    onScreenUnplugged(event: Event): void;

    /**
     * This event is sent when the screen is replugged.
     */
    onScreenPlugged(event: Event): void;

    /**
     * This even tis sent when a fatal error occurs making this
     * screen permanently unusable.
     */
    onScreenFatalError(error: Error): void;
}

export interface IScreen {
    /**
     * Determines if the screen is plugged.
     *
     * On a WebGL screen, 'plugged' is directly related to the
     * WebGL's context is valid or not.
     */
    readonly plugged: boolean;

    /**
     * Screen type
     */
    readonly type: ScreenType;

    /**
     * Returns the main layer
     */
    readonly layer: ILayer;

    /**
     * Returns the screen's size in pixels.
     */
    readonly size: Size;

    /**
     * Determines if the screen needs to be redrawn.
     */
    dirty: boolean;

    /**
     * Create a detacted layer.
     */
    createLayer(matrix: IReadonlyMatrix3, z?: number): ILayer;

    /**
     * Create a detached sprite.
     */
    createSprite(matrix: IReadonlyMatrix3, z?: number): ISprite;

    /**
     * Draw, if needed.
     */
    drawIfNeeded(): void;

    /**
     * Force a complete refresh of the screen.
     */
    draw(): void;
}

export interface IScreenPhysical extends IScreen {
    /**
     * Screen's delegate
     *
     * Owner of the screen object can listen to specific events.
     */
    delegate?: IScreenDelegate;

    /**
     * Tells the screen that it's rendering surface might
     * have been changed.
     */
    sizeMightHaveChanged(): void;
}

export interface ITexture extends IScreen {
}

export interface Features {
    /**
     * Instructs the rendering engine that a depth buffer needs to be available.
     */
    needDepth?: boolean;

    /**
     * Instructs the rendering engine that clipping needs to be available.
     *
     * @see ISurface.clip
     */
    needClipping?: boolean;

    /**
     * Define the coordinate system for a full screen.
     */
    resolution?: Size;

    /**
     * Instructs the rendering engine that the aspect ratio needs to be preserved, thus adding black bars if needed.
     */
    keepAspectRatio?: boolean;

    /**
     * Instructs the rendering engine that the pixel ratio needs to be preserved.
     *
     * It makes sure that pixels are not fractional, ie. 1x1, 2x2, 3x3.
     */
    keepPixelRatio?: boolean;

    /**
     * By default, pixel are square. But in the case some old hardware is getting emulated, like CGA or EGA
     * graphics, their pixel ratio is slightly taller than their width.
     */
    pixelRatio?: Fraction;
}

export const enum ElementType {
    Layer,
    Sprite
}

export interface IElement {
    /**
     * Returns the element's screen.
     */
    readonly screen: IScreen;

    /**
     * Returns the element's parent.
     *
     * The screen's root layer and a detached layer will return undefined.
     */
    readonly parent: ILayer | null;

    /**
     * Returns the element's type.
     */
    readonly screenElementType: ElementType;

    /**
     * Returns the element's matrix.
     */
    readonly matrix: IVersionnedMatrix3 & IMatrix3;

    readonly effectiveMatrix: IVersionnedMatrix3;

    /**
     * Returns the element's z order.
     */
    z: number;

    /**
     * Attach the element from it's parent layer.
     */
    attach(layer: ILayer): void;

    /**
     * Detach the element from it's parent layer.
     */
    detach(): void;
}

export interface ILayer extends IElement {
}

/**
 * Cells are essentially an image (texture) with a rectangle (UVs)
 *
 * Used to provide the visual representation of a sprite.
 */
export interface ICell {
    boundingBox: Rectangle;
}

export interface ISprite extends IElement {
    cell: ICell | null;
}

export interface ISurface {
    draw(matrix: IReadonlyMatrix3, cell: ICell): void;
}
