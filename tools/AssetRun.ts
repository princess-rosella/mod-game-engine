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

/// <reference types="node" />

import crypto  = require("crypto");
import fs      = require("fs");
import path    = require("path");
import stream  = require("stream");
import File    = require("vinyl");

import { Asset }                    from "./Asset";
import { AssetCell }                from "./AssetCell";
import { AssetCellTransform }       from "./AssetCell";
import { AssetDefinition }          from "./AssetDefinition";
import { AssetDefinitionReference } from "./AssetDefinitionReference";
import { AssetFont }                from "./AssetFont";
import { AssetIndexDefinition }     from "./AssetDefinition";
import { AssetManifest }            from "./AssetManifest";
import { AssetManifestTexture }     from "./AssetManifest";
import { AssetType }                from "./AssetDefinition";
import { Minimatch as Glob }        from "minimatch";
import { PNG }                      from "pngjs";
import { TextureAtlasCompiler }     from "./TextureAtlasCompiler";

import { parseAssetDefinitionFile, convertDashToCamel }    from "./AssetDefinitionParser";
import { removeKnownExtensionsFromPath, assetTypeForPath } from "./AssetFileExtensions";
import { serializeAssetManifest }                          from "./AssetManifest";
import { walk, WalkOptions }                               from "./AsyncFile";
import { makeRe as globToRegex }                           from "minimatch";

function sorted<T>(items: IterableIterator<T>): Array<T> {
    return new Array(...items).sort();
}

export class AssetLoop extends Asset {
}

const atlasCompiler = new TextureAtlasCompiler();

export class AssetRun {
    path:   string;
    hash:   string  = "";
    errors: Error[] = [];

    constructor(path: string) {
        this.path = path;
    }

    private async computeHashFileAndFolders(files: Map<string, fs.Stats>, folders: Map<string, string[]>): Promise<boolean> {
        const sha1 = crypto.createHash("sha1");

        await walk(this.path, WalkOptions.InOrder | WalkOptions.AlphabeticalOrder, (child, st) => {
            if (st.isDirectory())
                return;

            const childRelative = path.relative(this.path, child);
            const childDirName  = path.dirname(childRelative);

            if (!folders.has(childDirName))
                folders.set(childDirName, [child]);
            else
                folders.get(childDirName)!.push(child);

            files.set(childRelative, st);
        });

        for (const child of sorted(files.keys())) {
            const st = files.get(child)!;
            sha1.update(child);
            sha1.update(st.mtime.toISOString());
            sha1.update(st.size.toString());
        }

        const hash = sha1.digest("hex");
        if (hash === this.hash)
            return false;

        this.hash = hash;
        return true;
    }

    private applyPatch(definition: AssetDefinition, patch: AssetDefinition) {
        for (const key in patch)
            definition[convertDashToCamel(key)] = patch[key];
    }

    private enumerateAssetMatchingPattern(pattern: string, definitions: Map<string, AssetDefinition>, callback: (definition: AssetDefinition) => void) {
        const exp = globToRegex(pattern)

        for (const [assetName, assetDefinition] of definitions) {
            if (exp.test(assetName))
                callback(assetDefinition);
        }
    }

    private async createDefinitionForAssets(files: Map<string, fs.Stats>, folders: Map<string, string[]>, assets: Map<string, AssetDefinition>, references: Set<AssetDefinitionReference>): Promise<void> {
        for (const file of files.keys()) {
            if (path.basename(file) === "index.yaml")
                continue;

            const assetName = removeKnownExtensionsFromPath(file);
            const assetType = assetTypeForPath(file);
            if (!assetType)
                continue;

            let assetDefinition: AssetDefinition;

            if (assets.has(assetName)) {
                assetDefinition = assets.get(assetName)!;
            }
            else {
                assetDefinition = <AssetDefinition>{
                    assetName: assetName,
                    assetType: assetType,
                    path:      file
                }
            }

            if (file.endsWith(".yaml")) {
                try {
                    this.applyPatch(assetDefinition, await parseAssetDefinitionFile(path.join(this.path, file), path.dirname(file), references));
                }
                catch (e) {
                    const error = new Error(`Failed to parse ${file}: ${e}`);
                    (<any>error)["cause"] = e;
                    this.errors.push(error);
                }
            }

            assets.set(assetName, assetDefinition);
        }

        for (const folder of folders.keys()) {
            const assetName = removeKnownExtensionsFromPath(folder);
            const assetType = assetTypeForPath(folder);

            let assetDefinition = <AssetDefinition>{
                assetName: assetName,
                assetType: assetType,
                path:      folder + "/",
                childs:    new Glob("${assetName}/*")
            }

            const indexFile = path.join(folder, "index.yaml");
            if (files.has(indexFile)) {
                try {
                    const indexDefinition = <AssetIndexDefinition>await parseAssetDefinitionFile(path.join(this.path, indexFile), path.basename(indexFile), references);
                    const patches = indexDefinition.patches;

                    if (patches) {
                        for (const group of patches) {
                            for (const patchPattern in group) {
                                const patch = group[patchPattern]!;

                                this.enumerateAssetMatchingPattern(path.normalize(path.join(assetName, patchPattern)), assets, (assetToPatch) => {
                                    this.applyPatch(assetToPatch, patch);
                                });
                            }
                        }

                        delete indexDefinition.patches;
                    }

                    this.applyPatch(assetDefinition, indexDefinition);
                }
                catch (e) {
                    const error = new Error(`Failed to parse ${indexFile}: ${e}`);
                    (<any>error)["cause"] = e;
                    this.errors.push(error);
                }
            }

            if (assetType)
                assets.set(assetName, assetDefinition);
        }

        for (const reference of references)
            reference.definition = assets.get(reference.path);
    }

    private createImplementation(definition: AssetDefinition): Asset {
        if (definition.assetType === AssetType.Cell)
            return new AssetCell(this.path, definition);

        if (definition.assetType === AssetType.Loop)
            return new AssetLoop(this.path, definition);

        if (definition.assetType === AssetType.Font)
            return new AssetFont(this.path, definition);
            
        if (definition.assetType === AssetType.CellTransform)
            return new AssetCellTransform(this.path, definition);

        this.errors.push(new Error(`Invalid asset type: ${definition.assetType}`));
        return new Asset(this.path, definition);
    }

    private createImplementations(definitions: Map<string, AssetDefinition>, implementations: Map<string, Asset>, references: Set<AssetDefinitionReference>) {
        for (const [name, definition] of definitions)
            implementations.set(name, this.createImplementation(definition));

        for (const reference of references)
            reference.object = implementations.get(reference.path);
    }

    private loadImplementations(implementations: Map<string, Asset>): Promise<void[]> {
        let pending = new Array<Promise<void>>();

        for (const implementation of implementations.values())
            pending.push(implementation.load());

        return Promise.all(pending);
    }

    async compile(incremental: boolean, duplex: stream.Duplex): Promise<void> {
        const files   = new Map<string, fs.Stats>();
        const folders = new Map<string, string[]>();

        if (!(await this.computeHashFileAndFolders(files, folders)))
            return;

        this.errors = [];

        const assetDefinitions    = new Map<string, AssetDefinition>();
        const assetImplmentations = new Map<string, Asset>();
        const assetReferences     = new Set<AssetDefinitionReference>();

        await this.createDefinitionForAssets(files, folders, assetDefinitions, assetReferences);
        this.createImplementations(assetDefinitions, assetImplmentations, assetReferences);
        await this.loadImplementations(assetImplmentations);

        const atlasFiles = new Map<string, PNG>();
        const manifest   = <AssetManifest>{
            cells:   {},
            objects: {},
        };

        for (const assetImplementation of assetImplmentations.values())
            assetImplementation.populateAtlas(atlasFiles);

        const baseName = removeKnownExtensionsFromPath(path.basename(this.path));

        if (atlasFiles.size > 0) {
            const manifestTextures     = <AssetManifestTexture[]>[];
            const atlas                = atlasCompiler.compile(atlasFiles);
            const atlasTextures: PNG[] = [];

            for (const entry of atlas.textures)
                atlasTextures.push(new PNG({ width: entry.width, height: entry.height }));

            for (const name in atlas.images) {
                const rect   = atlas.images[name];
                const source = atlasFiles.get(name)!;
                source.bitblt(atlasTextures[rect.part], 0, 0, source.width, source.height, rect.left, rect.top);
            }

            for (let texIndex = 0; texIndex < atlas.textures.length; texIndex++) {
                const pngBuffer   = PNG.sync.write(atlasTextures[texIndex]);
                const texFileName = `${baseName}.texture${texIndex}.png`;

                manifestTextures.push({
                    file:   texFileName,
                    width:  atlasTextures[texIndex].width,
                    height: atlasTextures[texIndex].height,
                    size:   pngBuffer.byteLength
                })

                duplex.push(new File({
                    cwd:      process.cwd(),
                    base:     process.cwd(),
                    path:     path.join(process.cwd(), texFileName),
                    contents: pngBuffer
                }));
            }

            const vertexBuffer: number[] = [];

            for (const assetImplementation of assetImplmentations.values())
                assetImplementation.populateVertexBuffer(atlas.images, atlasTextures, vertexBuffer);

            const verticesFileName = `${baseName}.vertices.data`;

            duplex.push(new File({
                cwd:      process.cwd(),
                base:     process.cwd(),
                path:     path.join(process.cwd(), verticesFileName),
                contents: Buffer.from(Float32Array.from(vertexBuffer).buffer)
            }));

            manifest.textures = manifestTextures;
            manifest.vertices = {
                file: verticesFileName,
                size: vertexBuffer.length * 4,
            };
        }

        for (const assetImplementation of assetImplmentations.values())
            assetImplementation.populateManifest(manifest);

        duplex.push(new File({
            cwd:      process.cwd(),
            base:     process.cwd(),
            path:     path.join(process.cwd(), `${baseName}.json`),
            contents: Buffer.from(serializeAssetManifest(manifest), "utf-8")
        }));

        if (this.errors.length > 0)
            throw this.errors;
    }
}
