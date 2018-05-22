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

import { AssetManifest, Asset } from "./Asset";
import { IScreen, ICell }       from "../Screen/Interfaces";
import { IScreenWebGL }         from "../Screen/WebGL/Interfaces";
import { Cell as CellWebGL }    from "../Screen/WebGL/Cell";

export interface GameManifest {
    [asset: string]: { [file: string]: number };
}

function loadImage(gl: WebGLRenderingContext, src: string, width?: number, height?: number): Promise<WebGLTexture> {
    return new Promise(function(resolve, reject) {
        const image = new Image(width, height);

        image.onload = function() {
            image.onload  = null;
            image.onerror = null;

            const tex = gl.createTexture();
            if (!tex) {
                reject(new Error("Failed to create WebGL textures"));
                return;
            }

            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            resolve(tex);
        };

        image.onerror = function(ev) {
            image.onload  = null;
            image.onerror = null;
            reject(ev);
        };

        image.src = src;
    });
}

async function loadVertices(gl: WebGLRenderingContext, src: string): Promise<WebGLBuffer> {
    const response = await fetch(src);
    const vertices = new Float32Array(await response.arrayBuffer());
    const buffer   = gl.createBuffer();

    if (!buffer)
        throw new Error("Failed to create vertices buffer");

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    return buffer;
}

async function loadBuffer(src: string): Promise<ArrayBuffer> {
    const response = await fetch(src);
    return await response.arrayBuffer();
}

async function loadJSON<T>(src: string): Promise<T> {
    const response = await fetch(src);
    return <T>await response.json();
}

function loadAudioBuffer(aud: AudioContext, buffer: ArrayBuffer): Promise<AudioBuffer> {
    return new Promise<AudioBuffer>((resolve, reject) => {
        aud.decodeAudioData(
            buffer,
            (audioBuffer) => resolve(audioBuffer),
            (error)       => reject(error)
        );
    });
}

async function loadAudio(aud: AudioContext, src: string): Promise<AudioBuffer> {
    return await loadAudioBuffer(aud, await loadBuffer(src));
}

function loadGeneric(gl: WebGLRenderingContext, aud: AudioContext, src: string): Promise<any> {
    if (src.endsWith(".json"))
        return loadJSON<any>(src);
    else if (src.endsWith(".png"))
        return loadImage(gl, src);
    else if (src.endsWith(".vertices.data"))
        return loadVertices(gl, src);
    else if (src.endsWith(".mp3"))
        return loadAudio(aud, src);
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
        const screenGL = <IScreenWebGL>this.screen;
        const gl       = screenGL.context;
        const aud      = screenGL.audioContext;

        for (const file in this.manifest[name]) {
            promises.push(loadGeneric(gl, aud, this.baseURL + file).then((value) => {
                files.set(file, value);
            }));
        }

        await Promise.all(promises);

        let   manifest = <AssetManifest>files.get(`${name}.json`)!;
        let   vertices: WebGLBuffer | null = null;
        const textures: WebGLTexture[]     = [];

        if (manifest.vertices)
            vertices = files.get(manifest.vertices.file);

        if (manifest.textures) {
            for (const textureDefinition of manifest.textures)
                textures.push(files.get(textureDefinition.file));
        }

        const objects = new Map<string, any>();

        for (const cellName in manifest.cells) {
            const [texID, vertexStart, vertexEnd, left, top, right, bottom] = manifest.cells[cellName];
            const cell = new CellWebGL(textures[texID], vertices!, vertexStart, vertexEnd, { x: left, y: top, width: right - left, height: bottom - top }, 0);
            objects.set(cellName, cell);
        }

        return new Asset(objects);
    }
}