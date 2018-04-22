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

import { Quartz, IQuartz } from "./Quartz";
import { Fraction } from "../Types";
import { Fiber } from "./Fiber";

export interface IScheduler {
    frequency: Fraction;

    readonly currentFrameCounter: number;
    readonly currentFrameTime: number;
    readonly currentFrameSkip: boolean;

    start(): void;
    stop(): void;

    addFiber(fiber: IFiber, modes: Set<string>): void;
    removeFiber(fiber: IFiber, modes?: Set<string>): void;
    removeFibers(block: (fiber: IFiber) => boolean): number;

    fiberWithName(name: string): IFiber | null;
    fibersForMode(mode: string): Set<IFiber>;

    addGenerator(name: string, generator: Generator, modes: Set<string>): IFiber;
}

export interface IFiber {
    readonly name: string;

    start(): void;
    tick(): void;
    stop(): void;
}

export class Scheduler implements IScheduler {
    readonly quartz: IQuartz;

    currentFrameCounter = -1;
    currentFrameTime    = -1;
    currentFrameSkip    = false;

    protected _mode          = "default";
    protected _fibersByMode  = new Map<string, Set<IFiber>>();
    protected _fibers        = new Set<IFiber>();
    protected _fibersStarted = new Set<IFiber>();
    protected _fibersToCheck = new Set<IFiber>();

    constructor(quartz?: IQuartz) {
        this.quartz = quartz || new Quartz();
        this.quartz.delegate = {
            start: this._quartzStart.bind(this),
            tick:  this._quartzTick .bind(this),
            stop:  this._quartzStop .bind(this),
        };

        this._fibersByMode.set(this._mode, this._fibers);
    }

    start() {
        this.quartz.start();
    }

    stop() {
        this.quartz.stop();
    }

    protected dispatchPendingSignalsToFibers() {
        const checks = this._fibersToCheck;
        if (checks.size === 0)
            return;

        const started      = this.quartz.started;
        const fiberSet     = this._fibers;
        const fiberStarted = this._fibersStarted;

        for (const fiber of checks) {
            if (!fiberSet.has(fiber)) {
                fiberStarted.delete(fiber);
                fiber.stop();
            }
            else if (started && !fiberStarted.has(fiber)) {
                fiberStarted.add(fiber);
                fiber.start();
            }
        }

        this._fibersToCheck.clear();
    }

    protected _quartzStart() {
        this.dispatchPendingSignalsToFibers();

        const fiberSet     = this._fibers;
        const fiberStarted = this._fibersStarted;

        for (const fiber of fiberSet) {
            if (fiberStarted.has(fiber))
                continue;

            fiberStarted.add(fiber);
            fiber.start();
        }
    }

    protected _quartzTick(counter: number, time: number, skip: boolean) {
        if (this._fibersToCheck.size !== 0)
            this.dispatchPendingSignalsToFibers();

        this.currentFrameCounter = counter;
        this.currentFrameTime    = time;
        this.currentFrameSkip    = skip;

        for (const fiber of this._fibers)
            fiber.tick();
    }

    protected _quartzStop() {
        this.dispatchPendingSignalsToFibers();

        for (const fiber of this._fibersStarted)
            fiber.stop();

        this._fibersStarted.clear();
    }

    get frequency() {
        return this.quartz.frequency;
    }

    set frequency(frequency: Fraction) {
        this.quartz.frequency = frequency;
    }

    get mode(): string {
        return this._mode;
    }

    set mode(newMode: string) {
        if (this._mode === newMode)
            return;

        for (const fiber of this._fibers)
            this._fibersToCheck.add(fiber);

        this._mode   = newMode;
        this._fibers = this.fibersForMode(newMode);
    }

    fiberWithName(name: string): IFiber | null {
        for (let fiber of this._fibers) {
            if (fiber.name === name)
                return fiber;
        }

        return null;
    }

    fibersForMode(mode: string): Set<IFiber> {
        const fibers = this._fibersByMode.get(mode);
        if (fibers)
            return fibers;

        const newfibers = new Set<IFiber>();
        this._fibersByMode.set(mode, newfibers);
        return newfibers;
    }

    addFiber(fiber: IFiber, modes: Set<string>): void {
        for (const mode of modes)
            this.fibersForMode(mode).add(fiber);

        if (modes.has(this._mode))
            this._fibersToCheck.add(fiber);
    }

    removeFiber(fiber: IFiber, modes?: Set<string>): void {
        if (modes) {
            for (const mode of modes)
                this.fibersForMode(mode).delete(fiber);

            if (modes.has(this._mode))
                this._fibersToCheck.add(fiber);
        }
        else {
            for (const set of this._fibersByMode.values())
                set.delete(fiber);

            this._fibersToCheck.add(fiber);
        }
    }

    removeFibers(block: (fiber: IFiber) => boolean): number {
        const fibersToRemove = new Set<IFiber>();

        for (const fiber of this._fibers) {
            if (block(fiber))
                fibersToRemove.add(fiber);
        }

        if (fibersToRemove.size === 0)
            return 0;

        for (const mode of this._fibersByMode.values()) {
            for (const fiber of fibersToRemove) {
                mode.delete(fiber);
            }
        }

        for (const fiber of fibersToRemove)
            this._fibersToCheck.add(fiber);

        return fibersToRemove.size;
    }

    addGenerator(name: string, generator: Generator, modes: Set<string>): IFiber {
        const fiber = new Fiber(name, generator);
        this.addFiber(fiber, modes);
        return fiber;
    }
}
