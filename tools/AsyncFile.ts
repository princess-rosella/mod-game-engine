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

import * as fs from "fs";
import { join as pathjoin, normalize } from "path";

export function readFile(file: string, encoding?: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        fs.readFile(file, (err, data) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(data);
        });
    });
}

export function writeFile(file: string, data: string, encoding: string = "utf8"): Promise<void> {
    return new Promise((resolve, reject) => {
        fs.writeFile(file, data, { encoding }, (err) => {
            if (err) {
                reject(err);
                return;
            }

            resolve();
        });
    });
}

export function readTextFile(file: string, encoding: string = "utf8"): Promise<string> {
    return new Promise((resolve, reject) => {
        fs.readFile(file, (err, data) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(data.toString(encoding));
        });
    });
}

export function readdir(path: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        fs.readdir(path, (err, files) => {
            if (err)
                reject(err);
            else
                resolve(files);
        });
    });
}

export function readdirstats(path: string): Promise<[string, fs.Stats][]> {
    return new Promise((resolve, reject) => {
        fs.readdir(path, (err, files) => {
            if (err) {
                reject(err);
                return;
            }

            const output:   [string, fs.Stats][] = [];
            const promises: Promise<fs.Stats>[]  = [];

            for (const file of files) {
                const promise = lstat(pathjoin(path, file));

                promise.then(function(stat) {
                    output.push([file, stat]);
                });

                promises.push(promise);
            }

            Promise.all(promises)
                .then(function() {
                    resolve(output);
                })
                .catch(function(e) {
                    reject(e);
                });
        });
    });
}

export function readlink(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
        fs.readlink(path, (err, linkString) => {
            if (err)
                reject(err);
            else
                resolve(linkString);
        });
    });
}

export function lstat(path: string): Promise<fs.Stats> {
    return new Promise((resolve, reject) => {
        fs.lstat(path, (err, stats) => {
            if (err)
                reject(err);
            else
                resolve(stats);
        });
    });
}

export const enum WalkOptions {
    Default           = 0,
    PreOrder          = 0,
    InOrder           = 1,
    AlphabeticalOrder = 2
}

export async function walk(path: string, options: WalkOptions, callback: (path: string, st: fs.Stats) => void): Promise<void> {
    let files = await readdirstats(path);

    files = files.sort(function(a, b) {
        const adir = a[1].isDirectory();
        const bdir = b[1].isDirectory();

        if (adir === bdir) {
            if (options & WalkOptions.AlphabeticalOrder) {
                if (a[0] < b[0])
                    return -1;
                else if (a[0] > b[0])
                    return 1;
            }

            return 0;
        }

        if (adir)
            return -1;
        else
            return 1;
    });

    for (const [file, st] of files) {
        if (file === ".DS_Store")
            continue;

        const filePath = normalize(pathjoin(path, file));

        if (!(options & WalkOptions.InOrder))
            callback(filePath, st);

        if (st.isDirectory())
            await walk(filePath, options, callback);

        if (options & WalkOptions.InOrder)
            callback(filePath, st);
    }
}
