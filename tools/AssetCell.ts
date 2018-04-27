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

import path = require("path");

import { PNG } from "pngjs";

import { Asset }                        from "./Asset";
import { AssetDefinition }              from "./AssetDefinition";
import { AssetDefinitionReference }     from "./AssetDefinitionReference";
import { AssetManifest }                from "./AssetManifest";
import { AssetManifestCellBoundingBox } from "./AssetManifest";
import { Rectangle }                    from "./TextureAtlasCompiler";

import { readFile }              from "./AsyncFile";
import { convertEGAFileToPNG }   from "./EGA";

const numberOfFloatPerVertex = 4;

function populateVertexBuffer(buffer: number[], uvX1: number, uvY1: number, uvX2: number, uvY2: number, pivotUVX: number, pivotUVY: number, width: number, height: number): AssetManifestCellBoundingBox {
    const uvW = (uvX2 - uvX1);
    const uvH = (uvY2 - uvY1);

    const b2  = Math.floor((uvX1 - pivotUVX) * width  / uvW);
    const b3  = Math.floor((uvY1 - pivotUVY) * height / uvH);
    const b2w = b2 + width;
    const b3h = b3 + height;

    buffer.push(uvX1)
    buffer.push(uvY2);
    buffer.push(b2);
    buffer.push(b3);

    buffer.push(uvX2);
    buffer.push(uvY2);
    buffer.push(b2w);
    buffer.push(b3);

    buffer.push(uvX2);
    buffer.push(uvY1);
    buffer.push(b2w);
    buffer.push(b3h);

    buffer.push(uvX1);
    buffer.push(uvY2);
    buffer.push(b2);
    buffer.push(b3);

    buffer.push(uvX2);
    buffer.push(uvY1);
    buffer.push(b2w);
    buffer.push(b3h);

    buffer.push(uvX1);
    buffer.push(uvY1);
    buffer.push(b2);
    buffer.push(b3h);

    return {
        left:   Math.min(b2, b2w),
        right:  Math.max(b2, b2w),
        top:    Math.min(b3, b3h),
        bottom: Math.max(b3, b3h),
    }
}

function clip(png: PNG, clipped: AssetManifestCellBoundingBox): PNG {
    const data   = png.data;
    const width  = png.width;
    const height = png.height;

    function pixel(x: number, y: number): boolean {
        const idx = (((y * width) + x) * 4) + 3;
        return data[idx] > 0;
    }

    pixel(1, 1);

    function isLineEmpty(y: number): boolean {
        for (let x  = 0; x < width; x++) {
            if (pixel(x, y))
                return false;
        }

        return true;
    }

    function isColumnEmpty(x: number): boolean {
        for (let y = 0; y < height; y++) {
            if (pixel(x, y))
                return false;
        }

        return true;
    }

    // PASS 1: Clip the top lines
    for (; clipped.top < height && isLineEmpty(clipped.top); clipped.top++) {
    }

    if (clipped.top === png.height)
        return new PNG({ width: 0, height: 0});

    // PASS 2: Clip the bottom lines
    for (; clipped.bottom < height && isLineEmpty(png.height - clipped.bottom - 1); clipped.bottom++) {
    }

    // PASS 3: Clip the left lines
    for (; clipped.left < width && isColumnEmpty(clipped.left); clipped.left++) {
    }

    // PASS 3: Clip the right lines
    for (; clipped.right < width && isColumnEmpty(png.width - clipped.right - 1); clipped.right++) {
    }

    if (clipped.top !== 0 || clipped.bottom !== 0 || clipped.left !== 0 || clipped.right !== 0) {
        const clippedPNG = new PNG({
            width:  png.width  - clipped.left - clipped.right,
            height: png.height - clipped.top  - clipped.bottom
        });

        png.bitblt(clippedPNG, clipped.left, clipped.top, clippedPNG.width, clippedPNG.height, 0, 0);
        return clippedPNG;
    }

    return png;
}

export class AssetCell extends Asset {
    png!:        PNG;
    clippedPNG!: PNG;
    textureID:   number = 0;
    vertexStart: number = 0;
    vertexEnd:   number = 0;
    boundingBox: AssetManifestCellBoundingBox = { left: 0, right: 0, top: 0, bottom: 0 };
    clipped:     AssetManifestCellBoundingBox = { left: 0, right: 0, top: 0, bottom: 0 };

    get backing(): AssetDefinition {
        return this.definition;
    }

    pivotX(override?: string | number): number {
        const x = override ? override : <string | number>this.backing["pivotX"];
        if (typeof x === "number")
            return x;

        if (x === "left")
            return 0;
        else if (x === "right")
            return Math.max(0, this.png.width - 1);

        return Math.floor(this.png.width / 2);
    }

    pivotY(override?: string | number): number {
        const y = override ? override : <string | number>this.backing["pivotY"];
        if (typeof y === "number")
            return y;

        if (y === "top")
            return Math.max(0, this.png.height - 1);
        else if (y === "middle" || y === "center")
            return Math.floor(this.png.width / 2);

        return 0;
    }

    async load(): Promise<void> {
        const assetPath = this.definition.path;
        if (!assetPath)
            return;

        if (assetPath.endsWith(".ega.json"))
            this.png = await convertEGAFileToPNG(path.join(this.parent, assetPath));
        else
            this.png = PNG.sync.read(await readFile(path.join(this.parent, assetPath)));

        this.clip();
    }

    clip(): void {
        this.clippedPNG = clip(this.png, this.clipped);
    }

    populateAtlas(atlas: Map<string, PNG>): void {
        if (this.clippedPNG)
            atlas.set(this.definition.assetName, this.clippedPNG);
    }

    _populateVertexBuffer(atlas: { [image: string]: Readonly<Rectangle> }, textures: PNG[], buffer: number[], overridePivotX?: number, overridePivotY?: number, flipHorizontal?: boolean, flipVertical?: boolean): void {
        const rect = atlas[this.backing.assetName];
        if (!rect)
            return undefined;

        this.textureID   = rect.part;
        this.vertexStart = buffer.length / numberOfFloatPerVertex;

        let pivotX = this.pivotX(overridePivotX);
        let pivotY = this.pivotY(overridePivotY);
        const clonedRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };

        if (flipHorizontal) {
            clonedRect.left  = rect.left + rect.width;
            clonedRect.width = -rect.width;
            pivotX           = -pivotX;
        }

        if (flipVertical) {
            clonedRect.top    = rect.top + rect.height;
            clonedRect.height = -rect.height;
            pivotY            = -pivotY;
        }

        let uvX1     = clonedRect.left                       / textures[rect.part].width;
        let uvY1     = clonedRect.top                        / textures[rect.part].height;
        let uvX2     = (clonedRect.left + clonedRect.width)  / textures[rect.part].width;
        let uvY2     = (clonedRect.top  + clonedRect.height) / textures[rect.part].height;
        let pivotUVX = (clonedRect.left + pivotX - this.clipped.left) / textures[rect.part].width;
        let pivotUVY = (clonedRect.top  + pivotY - this.clipped.top)  / textures[rect.part].height;

        populateVertexBuffer(buffer, uvX1, uvY1, uvX2, uvY2, pivotUVX, pivotUVY, rect.width, rect.height);

        this.vertexEnd          = buffer.length / numberOfFloatPerVertex;
        this.boundingBox.left   = pivotX == 0? 0: -pivotX;
        this.boundingBox.top    = pivotY == 0? 0: -pivotY;
        this.boundingBox.right  = this.png.width  - pivotX;
        this.boundingBox.bottom = this.png.height - pivotY;
    }

    populateVertexBuffer(atlas: { [image: string]: Readonly<Rectangle> }, textures: PNG[], buffer: number[]): void {
        this._populateVertexBuffer(atlas, textures, buffer);
    }

    populateManifest(manifest: AssetManifest): void {
        manifest.cells[this.definition.assetName] = [this.textureID, this.vertexStart, this.vertexEnd, this.boundingBox.left, this.boundingBox.top, this.boundingBox.right, this.boundingBox.bottom];
    }
}

export class AssetCellTransform extends AssetCell {
    get backing(): AssetDefinition {
        const ref = <AssetDefinitionReference>this.definition["reference"];
        if (ref && ref.definition)
            return ref.definition;

        return this.definition;
    }

    get png(): PNG {
        const ref = <AssetDefinitionReference>this.definition["reference"];
        if (ref && ref.object)
            return (<AssetCell>ref.object).png;

        return super.png;
    }

    load(): Promise<void> {
        return Promise.resolve();
    }

    populateAtlas(atlas: Map<string, PNG>): void {
        // Intentionnally left empty. Transformed cells only differ from their reference image on the vertices.
    }

    populateVertexBuffer(atlas: { [image: string]: Readonly<Rectangle> }, textures: PNG[], buffer: number[]): void {
        const pivotX         = <number | undefined>this.definition["pivotX"];
        const pivotY         = <number | undefined>this.definition["pivotY"];
        const flipHorizontal = this.definition["transform"] === "mirror-horizontal";
        const flipVertical   = this.definition["transform"] === "mirror-vertical";

        this._populateVertexBuffer(atlas, textures, buffer, pivotX, pivotY, flipHorizontal, flipVertical);
    }
}
