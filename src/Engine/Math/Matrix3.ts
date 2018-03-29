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

import { Point } from "../Types";

const sin = Math.sin;
const cos = Math.cos;
const abs = Math.abs;
const EPSILON = Number.EPSILON;

export function mat3_determinant(m: Float32Array): number {
    const a = m[0];
    const b = m[1];
    const c = m[2];
    const d = m[3];
    const e = m[4];
    const f = m[5];
    const g = m[6];
    const h = m[7];
    const i = m[8];
    return (a * e * i) - (a * f * h) - (b * d * i) + (b * f * g) + (c * d * h) - (c * e * g);
}

export function mat3_isIdentity(m: Float32Array): boolean {
    return m[0] === 1 && m[1] === 0 && m[2] === 0 &&
           m[3] === 0 && m[4] === 1 && m[5] === 0 &&
           m[6] === 0 && m[7] === 0 && m[8] === 1;
}

export function mat3_setIdentity(m: Float32Array): void {
    m[0] = 1;
    m[1] = 0;
    m[2] = 0;

    m[3] = 0;
    m[4] = 1;
    m[5] = 0;

    m[6] = 0;
    m[7] = 0;
    m[8] = 1;
}

export function mat3_copy(a: Float32Array, b: Float32Array): void {
    a[0] = b[0];
    a[1] = b[1];
    a[2] = b[2];

    a[3] = b[3];
    a[4] = b[4];
    a[5] = b[5];

    a[6] = b[6];
    a[7] = b[7];
    a[8] = b[8];
}

export function mat3_setTranslation(m: Float32Array, tx: number, ty: number): void {
    m[0] = 1;
    m[1] = 0;
    m[2] = 0;

    m[3] = 0;
    m[4] = 1;
    m[5] = 0;

    m[6] = tx;
    m[7] = ty;
    m[8] = 1;
}

export function mat3_setScale(m: Float32Array, sx: number, sy: number): void {
    m[0] = sx;
    m[1] = 0;
    m[2] = 0;

    m[3] = 0;
    m[4] = sy;
    m[5] = 0;

    m[6] = 0;
    m[7] = 0;
    m[8] = 1;
}

export function mat3_setRotationAngle(m: Float32Array, angle: number): void {
    const c = cos(angle);
    const s = sin(angle);

    m[0] = c;
    m[1] = -s;
    m[2] = 0;

    m[3] = s;
    m[4] = c;
    m[5] = 0;

    m[6] = 0;
    m[7] = 0;
    m[8] = 1;
}

export function mat3_setSimpleOrtographic(m: Float32Array, width: number, height: number): void {
    m[0] = 2.0 / width; m[3] = 0.0;          m[6] = -1.0;
    m[1] = 0.0;         m[4] = 2.0 / height; m[7] = -1.0;
    m[2] = 0.0;         m[5] = 0.0;          m[8] = 1.0;
}

export function mat3_setOrtographic(m: Float32Array, left: number, right: number, top: number, bottom: number): void {
    const w = 1.0 / (right - left);
    const h = 1.0 / (bottom - top);

    const x = (right + left) * w;
    const y = (top + bottom) * h;

    m[0] = 2.0 * w; m[3] = 0.0;     m[6] = -x;
    m[1] = 0.0;     m[4] = 2.0 * h; m[7] = -y;
    m[2] = 0.0;     m[5] = 0.0;     m[8] = 1.0;
}

export function mat3_setScaleAtPoint(m: Float32Array, scale: number, x: number, y: number): void {
    const tx  = x * (1 - scale);
    const ty  = y * (1 - scale);

    m[0] = scale; m[3] = 0.0;   m[6] = tx;
    m[1] = 0.0;   m[4] = scale; m[7] = ty;
    m[2] = 0.0;   m[5] = 0.0;   m[8] = 1.0;
}

export function mat3_setInverse(m: Float32Array, o: Float32Array): void {
    const a = o[0];
    const b = o[1];
    const c = o[2];
    const d = o[3];
    const e = o[4];
    const f = o[5];
    const g = o[6];
    const h = o[7];
    const i = o[8];
    const det = (a * e * i) - (a * f * h) - (b * d * i) + (b * f * g) + (c * d * h) - (c * e * g);

    if (abs(det) < EPSILON)
        throw new Error("mat3_setInverse() can't produce inverted matrix. Determinant too small");

    const invDet = 1.0 / det;

    m[0] = ((e * i) - (f * h)) * invDet;
    m[1] = ((c * h) - (b * i)) * invDet;
    m[2] = ((b * f) - (c * e)) * invDet;

    m[3] = ((f * g) - (d * i)) * invDet;
    m[4] = ((a * i) - (c * g)) * invDet;
    m[5] = ((c * d) - (a * f)) * invDet;

    m[6] = ((d * h) - (e * g)) * invDet;
    m[7] = ((b * g) - (a * h)) * invDet;
    m[8] = ((a * e) - (b * d)) * invDet;
}

export function mat3_multiply(m: Float32Array, a: Float32Array, b: Float32Array): void {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a10 = a[3];
    const a11 = a[4];
    const a12 = a[5];
    const a20 = a[6];
    const a21 = a[7];
    const a22 = a[8];

    const b00 = b[0];
    const b01 = b[1];
    const b02 = b[2];
    const b10 = b[3];
    const b11 = b[4];
    const b12 = b[5];
    const b20 = b[6];
    const b21 = b[7];
    const b22 = b[8];

    m[0] = b00 * a00 + b01 * a10 + b02 * a20;
    m[1] = b00 * a01 + b01 * a11 + b02 * a21;
    m[2] = b00 * a02 + b01 * a12 + b02 * a22;
    m[3] = b10 * a00 + b11 * a10 + b12 * a20;
    m[4] = b10 * a01 + b11 * a11 + b12 * a21;
    m[5] = b10 * a02 + b11 * a12 + b12 * a22;
    m[6] = b20 * a00 + b21 * a10 + b22 * a20;
    m[7] = b20 * a01 + b21 * a11 + b22 * a21;
    m[8] = b20 * a02 + b21 * a12 + b22 * a22;
}

export function mat3_applyToCoord(m: Float32Array, x: number, y: number, out: Point): void {
    out.x = (m[0] * x) + (m[3] * y) + m[6];
    out.y = (m[1] * x) + (m[4] * y) + m[7];
}

export interface IReadonlyMatrix3 {
    readonly m: Float32Array;
    readonly isIdentity: boolean;
    readonly isReadonly: boolean;
    readonly determinant: number;
    applyToCoord(x: number, y: number, out?: Point): Point;
    applyToPoint(point: Readonly<Point>, out?: Point): Point;
    toJSON(): number[];
    createInverse(): IReadonlyMatrix3;
}

export interface IMatrix3 extends IReadonlyMatrix3 {
    setIdentify(): this;
    setMatrix(other: IReadonlyMatrix3): this;
    setTranslation(tx: number, ty: number): this;
    setScale(tx: number, ty: number): this;
    setRotation(angle: number): this;
    setSimpleOrtographic(width: number, height: number): this;
    setOrtographic(left: number, right: number, top: number, bottom: number): this;
    setScaleAtCenterPoint(scale: number, x: number, y: number): this;
    setInverse(other: IReadonlyMatrix3): this;
    multiply(other: IReadonlyMatrix3): this;
}

export interface IVersionnedMatrix3 extends IReadonlyMatrix3 {
    readonly version: number;
    readonly inverse: IReadonlyMatrix3;
}

/**
 * 3x3 Matrix, aka Affine Transform.
 */
export class ReadonlyMatrix3 implements IReadonlyMatrix3 {
    readonly m: Float32Array;

    /**
     * Constructs a null matrix.
     */
    constructor(matrix?: IMatrix3 | Float32Array) {
        if (matrix instanceof Float32Array) {
            this.m = matrix;
        }
        else {
            this.m = new Float32Array(9);

            if (matrix)
                mat3_copy(this.m, matrix.m);
            else
                mat3_setIdentity(this.m);
        }
    }

    get isIdentity(): boolean {
        return mat3_isIdentity(this.m);
    }

    get determinant() {
        return mat3_determinant(this.m);
    }

    applyToCoord(x: number, y: number, out?: Point): Readonly<Point> {
        if (out) {
            mat3_applyToCoord(this.m, x, y, out);
            return out;
        }

        const m = this.m;
        return {
            x: (m[0] * x) + (m[3] * y) + m[6],
            y: (m[1] * x) + (m[4] * y) + m[7]
        }
    }

    applyToPoint(point: Readonly<Point>, out?: Point): Readonly<Point> {
        return this.applyToCoord(point.x, point.y, out);
    }

    toJSON(): number[] {
        const m = this.m;
        return [ m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8] ];
    }

    createInverse(): Matrix3 {
        return (new Matrix3()).setInverse(this);
    }

    get isReadonly(): boolean {
        return false;
    }
}

/**
 * 3x3 Matrix, aka Affine Transform.
 *
 * All the methods of this class follow these convention:
 * - Methods with a 'set' prefix have output sent to 'this'.
 * - Methods with a 'create' prefix have the output sent to a newly created object.
 */
export class Matrix3 extends ReadonlyMatrix3 implements IMatrix3 {
    setIdentify(): this {
        mat3_setIdentity(this.m);
        return this;
    }

    /**
     * Copy a matrix.
     *
     * @param other Other matrix
     */
    setMatrix(other: IMatrix3): this {
        mat3_copy(this.m, other.m);
        return this;
    }

    setTranslation(tx: number, ty: number): this {
        mat3_setTranslation(this.m, tx, ty);
        return this;
    }

    setScale(tx: number, ty: number): this {
        mat3_setScale(this.m, tx, ty);
        return this;
    }

    setRotation(angle: number): this {
        mat3_setRotationAngle(this.m, angle);
        return this;
    }

    setSimpleOrtographic(width: number, height: number): this {
        mat3_setSimpleOrtographic(this.m, width, height);
        return this;
    }

    setOrtographic(left: number, right: number, top: number, bottom: number): this {
        mat3_setOrtographic(this.m, left, right, top, bottom);
        return this;
    }

    setScaleAtCenterPoint(scale: number, x: number, y: number): this {
        mat3_setScaleAtPoint(this.m, scale, x, y);
        return this;
    }

    setInverse(other: IReadonlyMatrix3): this {
        mat3_setInverse(this.m, other.m);
        return this;
    }

    multiply(other: IReadonlyMatrix3): this {
        mat3_multiply(this.m, this.m, other.m);
        return this;
    }

    static createSimpleOrtographic(width: number, height: number): Matrix3 {
        return (new Matrix3()).setSimpleOrtographic(width, height);
    }

    static createTranslation(x: number, y: number): Matrix3 {
        return (new Matrix3()).setTranslation(x, y);
    }

    static createScale(x: number, y: number): Matrix3 {
        return (new Matrix3()).setScale(x, y);
    }

    static createIdentity(): Matrix3 {
        return (new Matrix3()).setIdentify();
    }

    static createInverse(other: Matrix3): Matrix3 {
        return (new Matrix3()).setInverse(other);
    }

    get isReadonly(): boolean {
        return true;
    }
}

/**
 * 3x3 Matrix, aka Affine Transform.
 *
 * All the methods of this class follow these convention:
 * - Methods with a 'set' prefix have output sent to 'this'.
 * - Methods with a 'create' prefix have the output sent to a newly created object.
 */
export class VersionnedMatrix3 extends Matrix3 implements IVersionnedMatrix3, IMatrix3 {
    version:   number = 0;
    callback?: (from: IVersionnedMatrix3) => void;

    constructor(matrix?: IMatrix3 | Float32Array, callback?: (from: IVersionnedMatrix3) => void) {
        super(matrix);
        this.callback = callback;
    }

    setIdentify(): this {
        mat3_setIdentity(this.m);
        this._notifyChange();
        return this;
    }

    /**
     * Copy a matrix.
     *
     * @param other Other matrix
     */
    setMatrix(other: IMatrix3): this {
        if (other === this)
            return this;

        mat3_copy(this.m, other.m);
        this._notifyChange();
        return this;
    }

    setTranslation(tx: number, ty: number): this {
        mat3_setTranslation(this.m, tx, ty);
        this._notifyChange();
        return this;
    }

    setScale(tx: number, ty: number): this {
        mat3_setScale(this.m, tx, ty);
        this._notifyChange();
        return this;
    }

    setRotation(angle: number): this {
        mat3_setRotationAngle(this.m, angle);
        this._notifyChange();
        return this;
    }

    setSimpleOrtographic(width: number, height: number): this {
        mat3_setSimpleOrtographic(this.m, width, height);
        this._notifyChange();
        return this;
    }

    setOrtographic(left: number, right: number, top: number, bottom: number): this {
        mat3_setOrtographic(this.m, left, right, top, bottom);
        this._notifyChange();
        return this;
    }

    setScaleAtCenterPoint(scale: number, x: number, y: number): this {
        mat3_setScaleAtPoint(this.m, scale, x, y);
        this._notifyChange();
        return this;
    }

    setInverse(other: IMatrix3): this {
        mat3_setInverse(this.m, other.m);
        this._notifyChange();
        return this;
    }

    multiply(other: IMatrix3): this {
        mat3_multiply(this.m, this.m, other.m);
        this._notifyChange();
        return this;
    }

    get isReadonly(): boolean {
        return true;
    }

    private _notifyChange() {
        this.version++;

        const callback = this.callback;
        if (callback)
            callback(this);
    }

    get inverse(): IMatrix3 {
        const i = new Float32Array(9);
        mat3_setInverse(i, this.m);
        return new Matrix3(i);
    }
}

export class DynamicMatrix3 implements IReadonlyMatrix3, IVersionnedMatrix3 {
    private _a:        IVersionnedMatrix3 | null = null;
    private _aversion: number                    = -1;
    private _b:        IVersionnedMatrix3 | null = null;
    private _bversion: number                    = -1;
    private _m:        Float32Array              = new Float32Array(9);
    private _i:        Matrix3                   = new Matrix3();
    private _iversion: number                    = -1;
    private _version:  number                    = 0;

    constructor() {
    }

    get matrixA(): IVersionnedMatrix3 | null {
        return this._a;
    }

    set matrixA(a: IVersionnedMatrix3 | null) {
        if (this._a === a)
            return;

        this._a = a;
        this._aversion = -1;
        this.matricesHasChanged();
    }

    get matrixB(): IVersionnedMatrix3 | null {
        return this._b;
    }

    set matrixB(b: IVersionnedMatrix3 | null) {
        if (this._b === b)
            return;

        this._b = b;
        this._bversion = -1;
        this.matricesHasChanged();
    }

    private matricesHasChanged(): void {
        if (this._a === null && this._b === null) {
            mat3_setIdentity(this._m);
            this._version++;
        }
        else if (this._a === null) {
            mat3_copy(this._m, this._b!.m);
            this._version++;
        }
        else if (this._b === null) {
            mat3_copy(this._m, this._a!.m);
            this._version++;
        }
    }

    private ensureMatrixAndVersionAreUpToDate(): void {
        const a = this._a;
        const b = this._b;

        if (a && b) {
            const av = a.version;
            const bv = b.version;

            if ((av !== this._aversion) ||
                (bv !== this._bversion)) {
                this._aversion = av;
                this._bversion = bv;
                this._version++;
                mat3_multiply(this._m, a.m, b.m);
            }
        }
        else if (a) {
            const av = a.version;

            if (av !== this._aversion) {
                this._aversion = av;
                this._version++;
                mat3_copy(this._m, a.m);
            }
        }
        else if (b) {
            const bv = b.version;

            if (bv !== this._bversion) {
                this._bversion = bv;
                this._version++;
                mat3_copy(this._m, b.m);
            }
        }
    }

    get m(): Float32Array {
        this.ensureMatrixAndVersionAreUpToDate();
        return this._m;
    }

    get version(): number {
        this.ensureMatrixAndVersionAreUpToDate();
        return this._version;
    }

    get inverse(): IMatrix3 {
        this.ensureMatrixAndVersionAreUpToDate();
        const version = this._version;

        if (this._iversion !== version) {
            this._iversion = version;
            mat3_setInverse(this._i.m, this._m);
        }

        return this._i;
    }

    get isIdentity(): boolean {
        return mat3_isIdentity(this.m);
    }

    get determinant(): number {
        return mat3_determinant(this.m);
    }

    applyToCoord(x: number, y: number, out?: Point): Readonly<Point> {
        if (out) {
            mat3_applyToCoord(this.m, x, y, out);
            return out;
        }

        const m = this.m;
        return {
            x: (m[0] * x) + (m[3] * y) + m[6],
            y: (m[1] * x) + (m[4] * y) + m[7]
        }
    }

    applyToPoint(point: Point, out?: Point): Readonly<Point> {
        return this.applyToCoord(point.x, point.y, out);
    }

    toJSON(): number[] {
        const m = this.m;
        return [ m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8] ];
    }

    createInverse(): IMatrix3 {
        return (new Matrix3()).setInverse(this);
    }

    get isReadonly(): boolean {
        return false;
    }
}
