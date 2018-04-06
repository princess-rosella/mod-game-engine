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
import { readTextFile } from "./AsyncFile";

function parseEGAHex(code: string): number[] {
    return [Number.parseInt(code.substr(0, 2), 16), Number.parseInt(code.substr(2, 2), 16), Number.parseInt(code.substr(4, 2), 16), 255]
}

export const EGADefaultPalette: { [key: string]: number[] } = {
    " ": [0, 0, 0, 0],
    "0": parseEGAHex("000000"),
    "1": parseEGAHex("0000AA"),
    "2": parseEGAHex("00AA00"),
    "3": parseEGAHex("00AAAA"),
    "4": parseEGAHex("AA0000"),
    "5": parseEGAHex("AA00AA"),
    "6": parseEGAHex("AA5500"),
    "7": parseEGAHex("AAAAAA"),
    "8": parseEGAHex("555555"),
    "9": parseEGAHex("5555FF"),
    "A": parseEGAHex("55FF55"),
    "B": parseEGAHex("55FFFF"),
    "C": parseEGAHex("FF5555"),
    "D": parseEGAHex("FF55FF"),
    "E": parseEGAHex("FFFF55"),
    "F": parseEGAHex("FFFFFF"),
}

export function convertEGAObjectToPNG(ega: string[]): PNG {
    if (ega.length <= 0)
        return new PNG({ height: 0, width: 0 });

    const png = new PNG({ height: ega.length, width: ega[0].length });

    let index = 0;

    for (const line of ega) {
        for (const code of line) {
            png.data[index + 0] = EGADefaultPalette[code][0];
            png.data[index + 1] = EGADefaultPalette[code][1];
            png.data[index + 2] = EGADefaultPalette[code][2];
            png.data[index + 3] = EGADefaultPalette[code][3];
            index += 4;
        }
    }

    return png;
}

export async function convertEGAFileToPNG(path: string): Promise<PNG> {
    const ega = <string[]>JSON.parse(await readTextFile(path));

    if (!Array.isArray(ega))
        throw new Error("Invalid format: Expected an array");

    return convertEGAObjectToPNG(ega);
}
