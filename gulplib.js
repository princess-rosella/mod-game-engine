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
const preprocess = require("gulp-preprocess");
const rename     = require("gulp-rename");
const sourcemaps = require("gulp-sourcemaps");
const ts         = require("gulp-typescript");
const path       = require("path");
const cwd        = process.cwd();
const dirName    = path.relative(cwd, __dirname);

process.on('unhandledRejection', (error) => {
    console.log('unhandledRejection', error);
});

function AssetCompiler() {
    return require(path.join(process.cwd(), "dist/tools/AssetCompiler")).default();
}

function defineGame(game, title) {
    const assetCompiler = function() {
        return AssetCompiler();
    };

    const sourceCompiler = ts.createProject(path.join(dirName, "tsconfig.json"), {
        declaration: false,
        outFile:     `${game}.js`,
        rootDir:     path.join(cwd, "games", game)
    });

    function compileSource() {
        return gulp.src(path.join(cwd, `games/${game}/**/*.ts`))
            .pipe(sourcemaps.init())
            .pipe(sourceCompiler()) 
            .pipe(sourcemaps.write(".", { includeContent: false }))
            .pipe(gulp.dest("dist"));
    }

    function compileAssets() {
        return gulp.src(`games/${game}/**/*.assets`)
                   .pipe(assetCompiler()())
                   .pipe(gulp.dest(`dist/games/${game}`));
    }

    function copyHTML() {
        return gulp.src(path.join(cwd, dirName, "engine.html"))
                   .pipe(preprocess({context: { TITLE: title, GAMEID: game }}))
                   .pipe(rename(`${game}.html`))
                   .pipe(gulp.dest(`dist`));
    }

    gulp.task(`${game}-src`, ["engine"], compileSource);
    gulp.task(`${game}-assets`, ["engine-tools"], compileAssets);
    gulp.task(`${game}-html`, [], copyHTML);
    gulp.task(`${game}-src-ib`, [], compileSource);
    gulp.task(`${game}-assets-ib`, [], compileAssets);
    gulp.task(game, [`${game}-src`, `${game}-assets`, `${game}-html`], function() {});

    gulp.watch(`games/${game}/**/*.assets/**/*`, [`${game}-assets-ib`]);
    gulp.watch(`games/${game}/**/*.ts`, [`${game}-src-ib`]);
}

module.exports = {
    AssetCompiler:        AssetCompiler,
    defineGame:           defineGame
};
