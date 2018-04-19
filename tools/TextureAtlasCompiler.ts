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

function nextPowerOfTwo(x: number): number {
    x--;
    x |= x >> 1;
    x |= x >> 2;
    x |= x >> 4;
    x |= x >> 8;
    x |= x >> 16;
    x++;
    return x;
}

export interface IImage {
    readonly width:  number;
    readonly height: number;
}

export interface Rectangle {
    left:   number;
    top:    number;
    width:  number;
    height: number;
    part:   number;
}

export interface Atlas {
    textures: { width: number, height: number }[];
    images:   { [image: string]: Readonly<Rectangle> };
}

type size = [number, number];

function _buildTexturesSizes(maxSize: number, w: number, h: number, sizes: size[]): void {
    if (w > maxSize || h > maxSize)
        return;

    sizes.push([w, h]);

    // Pass 1: Move right
    for (let newWidth = w << 1; newWidth <= maxSize; newWidth <<= 1) {
        sizes.push([newWidth, h]);
    }

    // Pass 2: Move bottom
    for (let newHeight = h << 1; newHeight <= maxSize; newHeight <<= 1) {
        sizes.push([w, newHeight]);
    }

    _buildTexturesSizes(maxSize, w << 1, h << 1, sizes);
}

function buildTextureSizes(maxSize: number): size[] {
    const sizes = <size[]>[];

    _buildTexturesSizes(maxSize, 16, 16, sizes);

    return sizes.sort((a, b) => {
        return (a[0] * a[1]) - (b[0] * b[1]);
    });
}

export class TextureAtlasCompiler<T extends IImage> {
    readonly maxSize: number;
    readonly spacing: number;
    private readonly sizes: size[];

    constructor(maxSize: number = 2048, spacing: number = 1) {
        this.maxSize = maxSize;
        this.spacing = spacing;
        this.sizes   = buildTextureSizes(maxSize);
    }

    private sortImagesBySize(images: Map<string, T>): Map<string, T> {
        const names = [...images.keys()].sort((a: string, b: string) => {
            const ia     = images.get(a)!;
            const ib     = images.get(b)!;
            const result = (ia.width * ia.height) - (ib.width * ib.height);

            if (result === 0) {
                if (a < b)
                    return -1;
                else if (a > b)
                    return 1;
            }

            return result;
        });

        const orderedImages = new Map<string, T>();
        for (const name of names)
            orderedImages.set(name, images.get(name)!);

        return orderedImages;
    }

    private compileWithSize(width: number, height: number, images: Map<string, T>, multiTextures: boolean): Atlas | null {
        const rectangles: Rectangle[] = [
            { left: 0, top: 0, width: width, height: height, part: 0 }
        ]

        // PHASE 1: Place everything in a set of rectangles.

        const output = new Map<string, Rectangle>();
        let   part   = 0;

        for (const [imageName, image] of images) {
            function pass1(rect: Rectangle, spacingWidth: number, spacingHeight: number, needWidth: number, needHeight: number) {
                if (rect.width === needWidth && rect.height === needHeight) {
                    const index = rectangles.indexOf(rect);
                    rectangles.splice(index, 1);
                    output.set(imageName, rect);
                    return true;
                }

                return false;
            }

            function pass2(rect: Rectangle, spacingWidth: number, spacingHeight: number, needWidth: number, needHeight: number) {
                if (rect.width === needWidth) {
                    output.set(imageName, { left: rect.left + spacingWidth, top: rect.top + spacingHeight, width: image.width, height: image.height, part: rect.part });
                    rect.top    += needHeight;
                    rect.height -= needHeight;
                    return true;
                }

                if (rect.height === needHeight) {
                    output.set(imageName, { left: rect.left + spacingWidth, top: rect.top + spacingHeight, width: image.width, height: image.height, part: rect.part });
                    rect.left  += needWidth;
                    rect.width -= needWidth;
                    return true;
                }

                return false;
            }

            function pass3(rect: Rectangle, spacingWidth: number, spacingHeight: number, needWidth: number, needHeight: number) {
                if ((rect.width <= needWidth) || (rect.height <= needHeight))
                    return false;
                
                output.set(imageName, { left: rect.left + spacingWidth, top: rect.top + spacingHeight, width: image.width, height: image.height, part: rect.part });
                rectangles.push({ left: rect.left + needWidth, top: rect.top, width: rect.width - needWidth, height: needHeight, part: rect.part });
                rect.top    += needHeight;
                rect.height -= needHeight;
                return true;
            }

            const passes = [pass1, pass2, pass3];
            let   placed = false;

            while (true) {
                for (const pass of passes) {
                    for (const rect of rectangles) {
                        const spacingWidth  = (rect.left === 0)? 0: this.spacing;
                        const spacingHeight = (rect.top  === 0)? 0: this.spacing;
                        const needWidth     = image.width  + spacingWidth;
                        const needHeight    = image.height + spacingHeight;

                        if (rect.width < needWidth || rect.height < needHeight)
                            continue;

                        if (pass(rect, spacingWidth, spacingHeight, needWidth, needHeight)) {
                            placed = true;
                            break;
                        }
                    }

                    if (placed)
                        break;
                }

                if (!placed) {
                    if (!multiTextures) {
                        // Failed. Out of space.
                        return null;
                    }

                    rectangles.push({ left: 0, top: 0, width: width, height: height, part: ++part });
                    continue;
                }

                break;
            }
        }

        function imageNamesForPart(partIndex: number): string[] {
            const imageNames: string[] = [];

            for (const [imageName, rect] of output) {
                if (rect.part === partIndex)
                    imageNames.push(imageName);
            }

            return imageNames;
        }

        const atlas: Atlas = {
            textures: [],
            images:   {}
        };

        // PHASE 2: Create textures with the minimum required space.

        for (let partIndex = 0; partIndex <= part; partIndex++) {
            const imageNames = imageNamesForPart(partIndex);

            let maxRight  = 0;
            let maxBottom = 0;

            for (const imageName of imageNames) {
                const rect = output.get(imageName)!

                maxRight  = Math.max(maxRight,  rect.left + rect.width);
                maxBottom = Math.max(maxBottom, rect.top  + rect.height);
            }

            maxRight  = nextPowerOfTwo(maxRight);
            maxBottom = nextPowerOfTwo(maxBottom);
            atlas.textures.push({ width: maxRight, height: maxBottom });
        }

        // PHASE 3: Freezing all the rectangles

        for (const [imageName, rect] of output)
            atlas.images[imageName] = Object.freeze(rect);

        return atlas;
    }

    compile(images: Map<string, T>): Atlas {
        const orderedImages = this.sortImagesBySize(images);

        for (const [width, height] of this.sizes) {
            const atlas = this.compileWithSize(width, height, orderedImages, (width === this.maxSize) && (height == this.maxSize));
            if (atlas)
                return atlas;
        }

        throw new Error("Unable to create texture atlas: No matching size");
    }
}
