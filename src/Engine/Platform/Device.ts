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

export const enum KeyboardStatus {
    ControlKey = 1 << 0,
    AltKey     = 1 << 1,
    ShiftKey   = 1 << 2,
    MetaKey    = 1 << 3
}

export const enum DeviceType {
    Desktop = "desktop",
    Phone   = "phone",
    Tablet  = "tablet",
    TV      = "tv"
}

const detectDeviceClass = function(): DeviceType {
    const userAgent = navigator.userAgent;

    if (/Android/g.test(userAgent)) {
        if (/Mobile/g.test(userAgent))
            return DeviceType.Phone;
        else
            return DeviceType.Tablet;
    }
    else if (/(Macintosh|Windows NT|Linux|FreeBSD)/g.test(userAgent))
        return DeviceType.Desktop;
    else if (/(iPad|Tablet)/g.test(userAgent))
        return DeviceType.Tablet;
    else if (/(Apple TV|AFTB)/g.test(userAgent))
        return DeviceType.TV;
    else
        return DeviceType.Phone;
}

export type DeviceKeyboardStatusListener = (keyboardStatus: KeyboardStatus) => void;

let currentDevice:            Device;
let keyboardStatus:           KeyboardStatus = 0;
let keyboardStatusRegistered: (DeviceKeyboardStatusListener[]) | undefined;

let blurEventHandler:     ((ev: FocusEvent)    => boolean) | undefined;
let keyboardEventHandler: ((ev: KeyboardEvent) => boolean) | undefined;

export class Device {
    readonly keyboardPresent: boolean;
    readonly mousePresent:    boolean;
    readonly deviceClass:     DeviceType;

    constructor() {
        this.deviceClass     = detectDeviceClass();
        this.keyboardPresent = this.deviceClass === "desktop";
        this.mousePresent    = this.deviceClass === "desktop";
    }

    addKeyboardStatusListener(listener: DeviceKeyboardStatusListener) {
        if (keyboardStatusRegistered) {
            keyboardStatusRegistered.push(listener);
            return;
        }

        if (!this.keyboardPresent)
            return;

        keyboardStatusRegistered = [listener];

        keyboardEventHandler = (ev: KeyboardEvent) => {
            let newKeyboardStatus: KeyboardStatus = 0;

            if (ev.shiftKey) newKeyboardStatus |= KeyboardStatus.ShiftKey;
            if (ev.altKey)   newKeyboardStatus |= KeyboardStatus.AltKey;
            if (ev.ctrlKey)  newKeyboardStatus |= KeyboardStatus.ControlKey;
            if (ev.metaKey)  newKeyboardStatus |= KeyboardStatus.MetaKey;

            if (keyboardStatus !== newKeyboardStatus) {
                keyboardStatus = newKeyboardStatus;
                this.dispatchKeyboardStatusEvent();
            }

            return true;
        };

        blurEventHandler = (ev: FocusEvent) => {
            if (keyboardStatus !== 0) {
                keyboardStatus = 0;
                this.dispatchKeyboardStatusEvent();
            }

            return true;
        };

        document.body.addEventListener("keydown", keyboardEventHandler);
        document.body.addEventListener("keyup",   keyboardEventHandler);
        window.addEventListener("blur", blurEventHandler);
    }

    removeKeyboardStatusListener(listener: DeviceKeyboardStatusListener): boolean {
        if (!keyboardStatusRegistered)
            return false;

        const index = keyboardStatusRegistered.indexOf(listener);
        if (index < 0)
            return false;

        keyboardStatusRegistered.splice(index, 1);

        if (keyboardStatusRegistered.length === 0) {
            if (blurEventHandler)
                window.removeEventListener("blur", blurEventHandler);

            if (keyboardEventHandler) {
                document.body.removeEventListener("keydown", keyboardEventHandler);
                document.body.removeEventListener("keyup",   keyboardEventHandler);
            }

            blurEventHandler         = undefined;
            keyboardEventHandler     = undefined;
            keyboardStatusRegistered = undefined;
        }

        return true;
    }

    private dispatchKeyboardStatusEvent(): void {
        if (!keyboardStatusRegistered)
            return;

        for (const listener of keyboardStatusRegistered)
            listener(keyboardStatus);
    }

    get keyboardStatus(): KeyboardStatus {
        return keyboardStatus;
    }

    static get current(): Device {
        if (!currentDevice)
            currentDevice = new Device();
        return currentDevice;
    }

    get supportsShadowRoot(): boolean {
        return !!(HTMLElement.prototype.attachShadow);
    }
}
