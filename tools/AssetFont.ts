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

import { Asset }         from "./Asset";
import { AssetCell }     from "./AssetCell";
import { AssetManifest } from "./AssetManifest";
import { AssetType }     from "./AssetDefinition";
import { PNG }           from "pngjs";

import { readTextFile }                    from "./AsyncFile";
import { convertMonochromeEGAObjectToPNG } from "./EGA";
import { Rectangle }                       from "./TextureAtlasCompiler";

export class AssetFont extends Asset {
    characters: { [ch: string]: AssetCell } = {}

    async load(): Promise<void> {
        const assetPath = this.definition.path;
        if (!assetPath)
            return;

        if (assetPath.endsWith(".font.json")) {
            const fontData = <{ [character: string]: any }>JSON.parse(await readTextFile(path.join(this.parent, assetPath)));
            for (const ch in fontData) {
                const cell = new AssetCell(this.parent, {
                    assetName: this.definition.assetName + "#" + ch,
                    assetType: AssetType.Cell,
                    path:      this.definition.path + "#" + ch,
                    pivotX:    "left",
                });

                cell.png = convertMonochromeEGAObjectToPNG(fontData[ch]);
                cell.clip();
                this.characters[ch] = cell;
            }
        }
        else
            throw new Error("Unknown font format");
    }

    populateAtlas(atlas: Map<string, PNG>): void {
        for (const ch in this.characters)
            this.characters[ch].populateAtlas(atlas);
    }

    populateVertexBuffer(atlas: { [image: string]: Readonly<Rectangle> }, textures: PNG[], buffer: number[]): void {
        for (const ch in this.characters)
            this.characters[ch].populateVertexBuffer(atlas, textures, buffer);
    }

    populateManifest(manifest: AssetManifest): void {
        for (const ch in this.characters)
            this.characters[ch].populateManifest(manifest);
    }
}
