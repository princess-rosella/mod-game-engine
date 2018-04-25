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

import { IScreen } from "../Screen/Interfaces";
import { IScreenWebGL } from "../Screen/WebGL/Interfaces";

interface AssetManifestTexture {
    file:   string;
    width:  number;
    height: number;
    grey?:  boolean;
    size:   number;
}

interface AssetManifestVertices {
    file: string;
    size: number;
}

interface AssetManifestCellBoundingBox {
    left:   number;
    right:  number;
    top:    number;
    bottom: number;
}

// texID, vertexStart, vertexEnd, boundingBox.left, boundingBox.top, boundingBox.right, boundingBox.bottom
export type AssetManifestCell = [number, number, number, number, number, number, number];

interface AssetManifest {
    textures?: AssetManifestTexture[];
    vertices?: AssetManifestVertices;
    cells:     { [key: string]: AssetManifestCell }
    objects:   { [key: string]: { [key: string]: any }};
}

export class Asset {
}

function loadImage(src: string, width?: number, height?: number): Promise<HTMLImageElement> {
    return new Promise(function(resolve, reject) {
        const image = new Image(width, height);

        image.onload = function() {
            image.onload  = null;
            image.onerror = null;
            resolve(image);
        };

        image.onerror = function(ev) {
            image.onload  = null;
            image.onerror = null;
            reject(ev);
        };

        image.src = src;
    });
}

async function loadVertices(src: string): Promise<Float32Array> {
    const response = await fetch(src);
    return new Float32Array(await response.arrayBuffer());
}

export class Assets {
    readonly baseURL: string;
    readonly screen: IScreen;

    constructor(screen: IScreen, baseURL: string) {
        this.screen = screen;

        if (baseURL === "")
            this.baseURL = "";
        else if (baseURL.endsWith("/"))
            this.baseURL = baseURL;
        else
            this.baseURL = baseURL + "/";
    }
    
    async load(name: string): Promise<Asset> {
        const response = await fetch(`${this.baseURL}${name}.json`);
        const manifest = <AssetManifest>await response.json();
        const textures = new Map<String, HTMLImageElement>();
        const promises = new Array<Promise<any>>();
        let   vertices: Float32Array | null = null;

        if (manifest.textures) {
            for (const manifestTexture of manifest.textures) {
                promises.push(loadImage(this.baseURL + manifestTexture.file, manifestTexture.width, manifestTexture.height)
                    .then((value) => {
                        textures.set(manifestTexture.file, value);
                    }));
            }
        }

        if (manifest.vertices) {
            promises.push(loadVertices(this.baseURL + manifest.vertices.file)
                .then((value) => {
                    vertices = value;
                }));
        }

        await Promise.all(promises);

        const screenGL = <IScreenWebGL>this.screen;
        const gl = screenGL.context;

        if (vertices) {
            const verticesBuffer = gl.createBuffer();

            gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

            for (const manifestTexture of manifest.textures!) {
                const image = textures.get(manifestTexture.file)!;
                const tex   = gl.createTexture();

                gl.bindTexture(gl.TEXTURE_2D, tex);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            }
        }

        throw new Error();
    }
}