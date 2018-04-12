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

const gulp       = require("gulp");
const ts         = require("gulp-typescript");
const sourcemaps = require("gulp-sourcemaps");
const path       = require("path");
const merge      = require("merge2");
const cwd        = process.cwd();
const dirName    = path.relative(cwd, __dirname);

const tsEngineSourceProject = ts.createProject(path.join(dirName, "tsconfig.json"), {
    outFile: path.join(cwd, "dist", "engine.js"),
    rootDir: path.join(dirName, "src")
});

const tsEngineToolsProject = ts.createProject(path.join(dirName, "tools.tsconfig.json"), {
    rootDir: path.join(dirName, "tools")
});

gulp.task("engine-src", function() {
    function mapper(sourcePath, file) {
        return path.join("..", dirName, sourcePath);
    }

    const outputs = gulp.src(path.join(dirName, "src/**/*.ts"))
        .pipe(sourcemaps.init())
        .pipe(tsEngineSourceProject());

    const externals = gulp.src(path.join(dirName, "externals", "*.js"));

    return merge(
        outputs.js
            .pipe(sourcemaps.mapSources(mapper))
            .pipe(sourcemaps.write(".", { includeContent: false })),
        outputs.dts,
        externals
    ).pipe(gulp.dest("dist"))
});

gulp.task("engine-tools", function() {
    function mapper(sourcePath, file) {
        return path.join("../..", dirName, "tools", sourcePath);
    }

    return gulp.src(path.join(dirName, "tools/**/*.ts"))
        .pipe(sourcemaps.init())
        .pipe(tsEngineToolsProject()) 
        .pipe(sourcemaps.mapSources(mapper))
        .pipe(sourcemaps.write(".", { includeContent: false }))
        .pipe(gulp.dest("dist/tools"));
});

gulp.task("engine", ["engine-src", "engine-tools"]);

gulp.watch(path.join(dirName, "src/**/*.ts"),   ["engine-src"]);
gulp.watch(path.join(dirName, "tools/**/*.ts"), ["engine-tools"]);
