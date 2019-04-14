const _ = require('lodash');
const babelify = require('babelify');
const browserSync = require('browser-sync');
const browserify = require('browserify');
const buffer = require('vinyl-buffer');
const clean = require('gulp-clean');
const concat = require('gulp-concat');
const chalk = require('chalk');
const eslint = require('gulp-eslint');
const fs = require('fs');
const gulp = require('gulp');
const htmlValidator = require('gulp-w3c-html-validator');
const logger = require('gulplog');
const nodemon = require('gulp-nodemon');
const noop = require('gulp-noop');
const path = require('path');
const rename = require('gulp-rename');
const sass = require('gulp-sass');
const sassLint = require('gulp-sass-lint');
const source = require('vinyl-source-stream');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify');
const watchify = require('watchify');
const packageJson = require('./package.json');

logger.info(`Building: ${packageJson.name}`);

const config = {
    dist: 'dist',
    watch: false,
    server: {
        script: process.env.npm_package_config_server_script || 'server.js',
        browser: 'google-chrome',
        browserSyncDelay: 600,
        rawPort: _.toNumber(process.env.npm_package_config_raw_port) || 3000,
        port: _.toNumber(process.env.npm_package_config_port) || 4000
    },
    browserify: {
        entryPoint: './src/index.js',
        destName: 'app',
        options: {
            debug: true
        },
        sourcemapsOptions: {
            loadMaps: true
        },
        babelOptions: {
            presets: ['@babel/preset-env'],
            sourceMaps: true
        }
    },
    html: {
        encoding: 'utf-8'
    },
    sass: {
        destFile: 'app.css'
    },
    sources: {
        js: 'src/*.js',
        scssFiles: null,
        scss: ['src/**/*.scss', 'src/*.scss'],
        html: './src/index.html'
    }
};

sass.compiler = require('node-sass');

gulp.task('clean', () => {
    return gulp.src(config.dist, {
        read: false,
        allowEmpty: true
    }).pipe(clean());
});

const rebundle = (bundler, callback) => {
    if (!config.browserify.initialized) {
        logger.debug('Adding browserify file listener');
        bundler.on('file', (file) => {
            config.browserify.sourceFileCache[file] = true;
        });
        config.browserify.sourceFileCache = {};
        config.browserify.initialized = true;
    }

    bundler.bundle()
        .on('error', (err) => {
            logger.error(`bundle error: ${chalk.red(err.stack)}`);
            bundler.emit('end');
            callback(chalk.red('Failed to build javascript bundle'));
        }).on('end', () => {
            callback();
        })
        .pipe(source(`${config.browserify.destName}.js`))
        .pipe(buffer())
        .pipe(rename(`${config.browserify.destName}.min.js`))
        .pipe(sourcemaps.init(config.browserify.sourcemapsOptions))
        .pipe(uglify())
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(config.dist));
};

const compile = (callback) => {
    let bundler = browserify(config.browserify.entryPoint, config.browserify.options)
        .transform(babelify, config.browserify.babelOptions);

    if (config.watch) {
        logger.info('Initiating javascript bundle with watch');
        bundler = watchify(bundler);

        bundler.on('update', () => {
            logger.info('Update js bundle');
            rebundle(bundler, callback);
            browserSync.reload();
        });

        rebundle(bundler, callback);
    } else {
        rebundle(bundler, callback);
    }
};

gulp.task('build:js', (callback) => {
    compile(callback);
});

const findScssFiles = (sourceFiles) => {
    const scssFiles = [];

    if (sourceFiles) {
        _.forEach(_.keys(sourceFiles), (file) => {
            const baseFileName = path.join(path.dirname(file), _.replace(path.basename(file), path.extname(file), ''));
            const sassFile = `${baseFileName}.scss`;
            if (fs.existsSync(sassFile)) {
                logger.debug(`    found scss file: ${file} -> ${sassFile}`);
                scssFiles.push(sassFile);
            }
        });
    }

    return scssFiles;
};

gulp.task('build:sass', () => {
    if (!config.sass.intialized) {
        logger.debug('Looking for referenced scss files');
        const scssFiles = findScssFiles(config.browserify.sourceFileCache);

        if (scssFiles.length > 0) {
            logger.info(`Found ${scssFiles.length} scss files`);
            config.sources.scssFiles = scssFiles;
        }

        config.sass.intialized = true;
    }

    const scssPatterns = config.sources.scssFiles || config.sources.scss;
    logger.info('scss patterns: ', scssPatterns);

    return gulp.src(scssPatterns)
        .pipe(sourcemaps.init())
        .pipe(sass().on('error', sass.logError))
        .pipe(sourcemaps.write('.'))
        .pipe(concat(config.sass.destFile))
        .pipe(gulp.dest(config.dist))
        .pipe(config.watch ? browserSync.stream() : noop());
});

gulp.task('html', () => {
    return gulp.src(config.sources.html)
        .pipe(gulp.dest(config.dist));
});

gulp.task('validate-html', () => {
    return gulp.src(config.sources.html)
        .pipe(htmlValidator({
            charset: config.html.encoding
        }))
        .pipe(htmlValidator.reporter());
});

gulp.task('lint:js', () => {
    return gulp.src([config.sources.js])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});

gulp.task('lint:scss', () => {
    return gulp.src(config.sources.scss)
        .pipe(sassLint())
        .pipe(sassLint.format())
        .pipe(sassLint.failOnError());
});

gulp.task('lint', gulp.parallel('lint:scss', 'lint:js', 'validate-html'));

gulp.task('server:start', (done) => {
    return nodemon({
        script: config.server.script,
        env: {
            NODE_ENV: 'development',
            SERVER_PORT: config.server.rawPort
        },
        ignore: [
            'gulpfile.babel.js',
            'src/',
            config.dist,
            'package.json',
            'node_modules/'
        ],
        tasks: (changedFiles) => {
            const tasks = [];
            if (!changedFiles) return tasks;
            _.forEach(changedFiles, (file) => {
                console.log('   nodemon found changes: ', file);
            });
            return tasks;
        }
    }).on('start', () => {
        if (!config.server.started) {
            logger.info('Starting browser-sync');
            browserSync({
                proxy: `http://localhost:${config.server.rawPort}`,
                port: config.server.port,
                browser: [config.server.browser]
            });
            done();
        }
        config.server.started = true;
    }).on('restart', () => {
        setTimeout(() => {
            browserSync.reload({
                stream: false
            });
        }, config.server.browserSyncDelay);
    });
});

gulp.task('browser-sync:reload', (done) => {
    browserSync.reload();
    done();
});

gulp.task('configure:watcher', (done) => {
    config.watch = true;
    done();
});

gulp.task('build', gulp.series('clean', gulp.parallel('html', gulp.series('build:js', 'build:sass'))));

gulp.task('watch', (done) => {
    gulp.watch(config.sources.html, gulp.series('html', 'browser-sync:reload'));
    gulp.watch(config.sources.scss, gulp.series('build:sass'));
    done();
});

gulp.task('start', gulp.series('configure:watcher', 'build', 'watch', 'server:start'));

gulp.task('default', gulp.series('clean'));
