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

import { PNG } from "pngjs";
import { Rectangle } from "./TextureAtlasCompiler";

export const enum AssetType {
    Cell      = "cell",
    Loop      = "loop",
    Transform = "transform",
    Object    = "object",
}

export interface AssetDefinition {
    assetName: string;
    assetType: AssetType;
    path:      string;

    [key: string]: any;
};

export interface AssetIndexDefinition extends AssetDefinition {
    maintainer?: string;
    creator?:    string;
    patches?:    { [key: string]: AssetDefinition }[];
}

export interface PopulateVertexOptions {
    flipHorizontal?: boolean;
    flipVertical?:   boolean;
    pivotX?: number | string;
    pivotY?: number | string;
}

export interface AssetManifestTexture {
    file:   string;
    width:  number;
    height: number;
    grey?:  boolean;
    size:   number;
}

export interface AssetManifestVertices {
    file: string;
    size: number;
}

export interface AssetManifest {
    textures?: AssetManifestTexture[];
    vertices?: AssetManifestVertices;
}

export class AssetBase {
    parent:     string;
    definition: AssetDefinition;

    constructor(parent: string, definition: AssetDefinition) {
        this.parent     = parent;
        this.definition = definition;
    }

    load(definitions: Map<string, AssetBase>): Promise<void> {
        return Promise.resolve();
    }

    populateAtlas(atlas: Map<string, PNG>): void {
    }

    populateVertexBuffer(atlas: { [image: string]: Readonly<Rectangle> }, textures: PNG[], buffer: number[], options: PopulateVertexOptions) {
    }

    populateDescription(): { [key: string]: any } {
        return {};
    }
}
