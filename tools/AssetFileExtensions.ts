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

import path = require("path");

import { AssetType } from "./AssetDefinition";

const knownExtensions = [
    // Composed extensions
    ".ega.json",
    ".font.json",
    ".transform.yaml",

    // Simple ones.
    ".assets",
    ".loop",
    ".png",
    ".yaml",
];

function isImage(pathname: string): boolean {
    return pathname.endsWith(".ega.json") || pathname.endsWith(".png");
}

function removeKnownExtensionsFromBasename(basename: string): string {
    for (const ext of knownExtensions) {
        if (basename.endsWith(ext))
            return basename.substr(0, basename.length - ext.length);
    }

    return basename;
}

export function removeKnownExtensionsFromPath(pathname: string): string {
    const outputs = <string[]>[];

    for (const part of path.normalize(pathname).split(path.sep))
        outputs.push(removeKnownExtensionsFromBasename(part));

    return outputs.join("/");
}

export function assetTypeForPath(pathname: string): AssetType | undefined {
    if (isImage(pathname))
        return AssetType.Cell;

    if (pathname.endsWith(".font.json"))
        return AssetType.Font;

    if (pathname.endsWith(".loop"))
        return AssetType.Loop;

    if (pathname.endsWith(".yaml"))
        return AssetType.Object;

    return undefined;
}
