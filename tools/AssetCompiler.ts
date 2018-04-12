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

import path    = require("path");
import stream  = require("stream");
import File    = require("vinyl");

import { AssetRun } from "./AssetRun";

class CompileSession {
    previousRun     = new Map<string, AssetRun>();
    currentRun      = new Map<string, AssetRun>();
    currentPromises = new Array<Promise<void>>();
}

class CompileStream extends stream.Duplex {
    session: CompileSession;

    constructor(session: CompileSession) {
        super({ objectMode: true });
        this.session = session;
    }

    _read() {
    }

    _write(chunk: File | null, encoding: string | null, callback: (err?: Error) => void): void {
        if (!chunk) {
            if (callback)
                callback();
            return;
        }

        if (!chunk.isDirectory()) {
            const err = new Error(`${chunk} is not a directory`);
            this.emit("error", err);

            if (callback) {
                callback(err);
                return;
            }
        }

        const session     = this.session;
        const previousRun = session.previousRun.get(chunk.path);

        if (previousRun) {
            session.currentRun.set(chunk.path, previousRun);
            session.currentPromises.push(previousRun.compile(true, this));
        }
        else {
            const newRun = new AssetRun(path.relative(process.cwd(), chunk.path));
            session.currentRun.set(chunk.path, newRun);
            session.currentPromises.push(newRun.compile(false, this));
        }

        if (callback)
            callback();
    }

    end(chunk: any, encoding?: any, callback?: any): void {
        if (typeof chunk === 'function')
            this._write(null, null, chunk);
        else if (typeof encoding === 'function')
            this._write(chunk, null, encoding);
        else
            this._write(chunk, encoding, callback);

        const session = this.session;

        Promise.all(session.currentPromises)
            .then(() => {
                session.currentPromises = [];
                session.previousRun     = session.currentRun;
                session.currentRun      = new Map<string, AssetRun>();
                this.emit("finish");
                this.push(null);
            })
            .catch(() => {
                session.currentPromises = [];
                session.previousRun     = session.currentRun;
                session.currentRun      = new Map<string, AssetRun>();
            });
    }
};

export default function(): () => NodeJS.ReadWriteStream {
    const session = new CompileSession();

    return function () {
        return new CompileStream(session);
    }
}
