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

const raf = window.requestAnimationFrame;
const caf = window.cancelAnimationFrame;

import { Fraction } from "../Types";

export interface IQuartzDelegate {
    start(): void;
    tick(counter: number, time: number, skip: boolean): void;
    stop(): void;
}

export interface IQuartz {
    frequency: Fraction;
    delegate: IQuartzDelegate;

    readonly started: boolean;
    start(): void;
    stop(): void;
}

/**
 * Quartz is the core of the clock. It ticks at a very precise pace, doesn't drift
 * over time and notify its delegate.
 *
 * It also detect hibernation, the current Web page going in the background and
 * stopping all the tracks and restart them when the page becomes active again.
 */
export class Quartz implements IQuartz {
    private _frequency:       Fraction;
    private _frequencyLambda: (counter: number) => number;
    private _token:           number  = 0;
    private _timer:           number  = 0;
    private _counter:         number  = 0;
    private _referenceTime:   number  = 0.0;
    private _nextTime:        number  = 0.0;
    private _hibernating:     boolean = false;

    private running = 0;

    delegate!: IQuartzDelegate;

    constructor() {
        this._tick      = this._tick.bind(this);
        this._frequency = Object.freeze({
            num:   24,
            denom: 1001
        });

        this._frequencyLambda = this.createFrequencyLambda(this._frequency);
    }

    get frequency() {
        return this._frequency;
    }

    set frequency(frequency: Fraction) {
        if (this._frequency.num   === frequency.num &&
            this._frequency.denom === frequency.denom)
            return;

        this._frequency       = frequency;
        this._frequencyLambda = this.createFrequencyLambda(this._frequency);
        this._referenceTime   = 0;
    }

    private createFrequencyLambda(pace: Fraction): (counter: number) => number {
        const num   = pace.num;
        const denom = pace.denom;

        return (counter) => {
            return (counter * num * 1000.0 / denom);
        };
    }

    _tick(currentTime: number) {
        const delegate = this.delegate;

        if (this._referenceTime === 0.0) {
            this._referenceTime = currentTime - this._frequencyLambda(this._counter);
            this._nextTime      = currentTime + this._frequencyLambda(1);
            this._token         = raf(this._tick);
            this._hibernating   = false;

            if (delegate)
                delegate.start();

            return;
        }

        const initialNextTime = this._nextTime;

        if (currentTime < initialNextTime) {
            this._token = raf(this._tick);
            return;
        }

        const referenceTime   = this._referenceTime;
        const initialCounter  = this._counter;
        const frequencyLambda = this._frequencyLambda;

        let frameCount = 0;
        let counter    = initialCounter;
        let nextTime   = initialNextTime;

        if ((currentTime - initialNextTime) > 500.0) {
            if (delegate && !this._hibernating)
                delegate.stop();

            this._referenceTime = 0.0;
            this._nextTime      = 0.0;
            this._token         = raf(this._tick);
            return;
        }

        while (currentTime >= nextTime) {
            counter    += 1;
            frameCount += 1;
            nextTime    = referenceTime + frequencyLambda(counter);
        }

        this._counter  = counter;
        this._nextTime = nextTime;
        this._token    = raf(this._tick);

        if (!delegate)
            return;

        if (frameCount === 1) {
            delegate.tick(initialCounter, initialNextTime - referenceTime, false);
            return;
        }

        for (let frameIndex = 1; frameIndex <= frameCount; frameIndex++) {
            const i = initialCounter + frameIndex;
            delegate.tick(i - 1, frequencyLambda(i), frameIndex !== frameCount);
        }
    }

    start() {
        this.running += 1;
        if (this.running !== 1)
            return;

        this._token         = raf(this._tick);
        this._referenceTime = 0.0;
        this._nextTime      = 0.0;

        let lastCounter = 0;

        this._timer = setInterval(() => {
            if (this._hibernating)
                return;

            const currentCount = this._counter;

            if (currentCount === lastCounter && this.delegate) {
                this.delegate.stop();
                this._hibernating   = true;
                this._referenceTime = 0.0;
            }

            lastCounter = currentCount;
        }, 1024);
    }

    get started(): boolean {
        return this.running >= 1;
    }

    stop() {
        if (this.running === 0)
            throw new Error("Unbalanced start/stop sequence");

        this.running -= 1;

        if (this.running !== 0)
            return;

        if (this._token) {
            caf(this._token);
            this._token = 0;
        }

        if (this._timer) {
            clearInterval(this._timer);
            this._timer = 0;
        }

        if (this.delegate)
            this.delegate.stop();
    }
}
