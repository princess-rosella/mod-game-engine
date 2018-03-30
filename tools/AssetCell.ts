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

import { AssetBase }             from "./AssetDefinition";
import { PopulateVertexOptions } from "./AssetDefinition";
import { readFile }              from "./AsyncFile";
import { convertEGAFileToPNG }   from "./EGA";
import { Rectangle }             from "./TextureAtlasCompiler";

function populateVertexBuffer(buffer: number[], uvX1: number, uvY1: number, uvX2: number, uvY2: number, pivotUVX: number, pivotUVY: number, width: number, height: number) {
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
}

export class AssetCell extends AssetBase {
    png!:        PNG;
    textureID:   number = 0;
    vertexStart: number = 0;
    vertexEnd:   number = 0;

    pivotX(override?: string | number): number {
        const x = override ? override : <string | number>this.definition["pivotX"];
        if (typeof x === "number")
            return x;

        if (x === "left")
            return 0;
        else if (x === "right")
            return Math.max(0, this.png.width - 1);

        return Math.floor(this.png.width / 2);
    }

    pivotY(override?: string | number): number {
        const y = override ? override : <string | number>this.definition["pivotY"];
        if (typeof y === "number")
            return y;

        if (y === "top")
            return 0;
        else if (y === "middle" || y === "center")
            return Math.floor(this.png.width / 2);

        return Math.max(0, this.png.height - 1);
    }

    async load(implementations: Map<string, AssetBase>): Promise<void> {
        const assetPath = this.definition.path;
        if (!assetPath)
            return;

        if (assetPath.endsWith(".ega.json"))
            this.png = await convertEGAFileToPNG(path.join(this.parent, assetPath));
        else
            this.png = PNG.sync.read(await readFile(path.join(this.parent, assetPath)));
    }

    populateAtlas(atlas: Map<string, PNG>): void {
        atlas.set(this.definition.assetName, this.png);
    }

    populateVertexBuffer(atlas: { [image: string]: Readonly<Rectangle> }, textures: PNG[], buffer: number[], options: PopulateVertexOptions) {
        const rect = atlas[this.definition.assetName];
        if (!rect)
            return;

        this.textureID   = rect.part;
        this.vertexStart = buffer.length;

        let pivotX = this.pivotX(options.pivotX);
        let pivotY = this.pivotY(options.pivotY);
        const clonedRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };

        if (options.flipHorizontal) {
            clonedRect.left  = rect.left + rect.width;
            clonedRect.width = -rect.width;
            pivotX           = -pivotX;
        }

        if (options.flipVertical) {
            clonedRect.top    = rect.top + rect.height;
            clonedRect.height = -rect.height;
            pivotY            = -pivotY;
        }

        let uvX1     = clonedRect.left                       / textures[rect.part].width;
        let uvY1     = clonedRect.top                        / textures[rect.part].height;
        let uvX2     = (clonedRect.left + clonedRect.width)  / textures[rect.part].width;
        let uvY2     = (clonedRect.top  + clonedRect.height) / textures[rect.part].height;
        let pivotUVX = (clonedRect.left + pivotX)            / textures[rect.part].width;
        let pivotUVY = (clonedRect.top  + pivotY)            / textures[rect.part].height;

        populateVertexBuffer(buffer, uvX1, uvY1, uvX2, uvY2, pivotUVX, pivotUVY, rect.width, rect.height);

        this.vertexEnd = buffer.length;
    }
}
