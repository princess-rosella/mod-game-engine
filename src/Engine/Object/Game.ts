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

import { AssetManifest }     from "./Asset";
import { IScreen, ICell }    from "../Screen/Interfaces";
import { IScreenWebGL }      from "../Screen/WebGL/Interfaces";
import { Cell as CellWebGL } from "../Screen/WebGL/Cell";

export interface GameManifest {
    [asset: string]: { [file: string]: number };
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

async function loadBuffer(src: string): Promise<ArrayBuffer> {
    const response = await fetch(src);
    return await response.arrayBuffer();
}

async function loadJSON<T>(src: string): Promise<T> {
    const response = await fetch(src);
    return <T>await response.json();
}

function loadGeneric(src: string): Promise<any> {
    if (src.endsWith(".json"))
        return loadJSON<any>(src);
    else if (src.endsWith(".png"))
        return loadImage(src);
    else if (src.endsWith(".vertices.data"))
        return loadVertices(src);
    else
        return loadBuffer(src);
}

function ensurePathHasTrailingSlash(path: string): string {
    if (path === "")
        return "";
    else if (path.endsWith("/"))
        return path;
    else
        return path + "/";
}

export class Game {
    readonly baseURL:  string;
    readonly screen:   IScreen;
    readonly manifest: GameManifest;

    constructor(screen: IScreen, baseURL: string, manifest: GameManifest) {
        this.manifest = manifest;
        this.screen   = screen;
        this.baseURL  = ensurePathHasTrailingSlash(baseURL);
    }

    static async create(screen: IScreen, baseURL: string): Promise<Game> {
        return new Game(screen, baseURL, await loadJSON<GameManifest>(ensurePathHasTrailingSlash(baseURL) + "Manifest.json"));
    }

    async loadAsset(name: string): Promise<Asset> {
        if (!this.manifest[name])
            throw new Error(`Invalid asset ${name}`);

        const promises = new Array<Promise<any>>();
        const files    = new Map<string, any>();

        for (const file in this.manifest[name]) {
            promises.push(loadGeneric(this.baseURL + file).then((value) => {
                files.set(file, value);
            }));
        }

        await Promise.all(promises);

        const screenGL = <IScreenWebGL>this.screen;
        const gl       = screenGL.context;

        let   manifest = <AssetManifest>files.get(`${name}.json`)!;
        let   vertices: WebGLBuffer | null = null;
        const textures: WebGLTexture[]     = [];

        if (manifest.vertices) {
            vertices = gl.createBuffer();
            if (!vertices)
                throw new Error("Failed to create vertices buffer");

            gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
            gl.bufferData(gl.ARRAY_BUFFER, <Float32Array>files.get(manifest.vertices.file)!, gl.STATIC_DRAW);
        }

        if (manifest.textures) {
            for (const textureDefinition of manifest.textures) {
                const tex = gl.createTexture();
                if (!tex)
                    throw new Error("Failed to create WebGL textures");

                gl.bindTexture(gl.TEXTURE_2D, tex);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, files.get(textureDefinition.file));
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                textures.push(tex);
            }
        }

        const cells = new Map<string, ICell>();

        for (const cellName in manifest.cells) {
            const [texID, vertexStart, vertexEnd, left, top, right, bottom] = manifest.cells[cellName];
            const cell = new CellWebGL(textures[texID], vertices!, vertexStart, vertexEnd, { x: left, y: top, width: right - left, height: bottom - top }, 0);
            cells.set(cellName, cell);
        }

        throw new Error();
    }
}