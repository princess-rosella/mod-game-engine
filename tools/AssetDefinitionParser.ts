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

import path = require("path");
import yaml = require("js-yaml");

import { readTextFile }             from "./AsyncFile";
import { AssetDefinition }          from "./AssetDefinition";
import { AssetDefinitionReference } from "./AssetDefinitionReference";

export function convertDashToCamel(str: string): string {
    const dashRegex = /\-([a-z])/g;

	while (true) {
        const match = dashRegex.exec(str);
        if (!match)
            break;

        str = str.replace(match[0], match[1].toUpperCase());
    }

    return str;
}

export function convertDashDictionaryToCamel<T>(dict: { [key: string]: T }): { [key: string]: T } {
    const output: { [key: string]: T } = {};

    for (const key of Object.getOwnPropertyNames(dict))
        output[convertDashToCamel(key)] = dict[key];

    return output;
}

export function parseAssetDefinition(yamlText: string, basePath: string, references?: Set<AssetDefinitionReference>): AssetDefinition {
    const schema = yaml.Schema.create(yaml.DEFAULT_FULL_SCHEMA, [
        new yaml.Type("!ref", {
            kind: "scalar",
            construct: function(data: any) {
                const ref = new AssetDefinitionReference(path.normalize(path.join(basePath, String(data))));
                if (references)
                    references.add(ref);
                return ref;
            }
        })
    ]);

    const yamlData = <AssetDefinition>yaml.load(yamlText, { schema: schema });
    if (!yamlData)
        throw new Error("Found an 'undefined'. Expected a map");

    if (Array.isArray(yamlData))
        throw new Error("Found an array. Expected a map");

    const yamlType = typeof yamlData;
    if (yamlType !== "object")
        throw new Error(`Found an ${yamlType}. Expected a map`);

    return <AssetDefinition>convertDashDictionaryToCamel<any>(yamlData);
}

export async function parseAssetDefinitionFile(file: string, basePath: string, references?: Set<AssetDefinitionReference>): Promise<AssetDefinition> {
    return parseAssetDefinition(await readTextFile(file), basePath, references);
}
