const babelify = require('babelify');
const browserSync = require('browser-sync');
const browserify = require('browserify');
const buffer = require('vinyl-buffer');
const clean = require('gulp-clean');
const concat = require('gulp-concat');
const eslint = require('gulp-eslint');
const exit = require('gulp-exit');
const gulp = require('gulp');
const htmlValidator = require('gulp-w3c-html-validator');
const logger = require('gulplog');
const nodemon = require('gulp-nodemon');
const rename = require('gulp-rename');
const sass = require('gulp-sass');
const source = require('vinyl-source-stream');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify');
const watchify = require('watchify');
sass.compiler = require('node-sass');

const packageJson = require('./package.json');

logger.info(`Building: ${packageJson.name}`);

const SYNC_DELAY = 600;

const config = {
    dist: 'dist',
    rawPort: 3000,
    port: 4000,
    js: 'src/js/*.js',
    html: './src/templates/index.html'
};

gulp.task('clean-scripts', () => {
    return gulp.src(config.dist, {
        read: false,
        allowEmpty: true
    }).pipe(clean());
});

const rebundle = (bundler) => {
    return bundler.bundle()
        .on('error', (err) => {
            console.error(err);
            bundler.emit('end');
        })
        .pipe(source('build.js'))
        .pipe(buffer())
        .pipe(rename('index.min.js'))
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(uglify())
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(config.dist));
};

const compile = (watch) => {
    const bundler = watchify(browserify('./src/index.js', {debug: true}).transform(babelify, {
        // Use all of the ES2015 spec
        presets: ['@babel/preset-env'],
        sourceMaps: true
    }));

    if (watch) {
        bundler.on('update', () => {
            logger.info('Update js bundle');
            rebundle(bundler);
        });

        rebundle(bundler);
    } else {
        rebundle(bundler);
        // rebundle(bundler).pipe(exit());
    }

    return bundler;
};

gulp.task('compile:js', (done) => {
    compile();
    done();
});

gulp.task('sass', function () {
    return gulp.src('./src/**/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(concat('app.css'))
        .pipe(gulp.dest(config.dist));
});

gulp.task('html', () => {
    return gulp.src('src/index.html')
        .pipe(gulp.dest(config.dist));
});

gulp.task('validate-html', () => {
    return gulp.src('src/index.html')
        .pipe(htmlValidator({
            charset: 'utf-8'
        }))
        .pipe(htmlValidator.reporter());
});

gulp.task('lint', () => {
    return gulp.src([config.js])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});


gulp.task('start-express', (done) => {
    let started = false;
    return nodemon({
        script: 'server.js',
        env: { NODE_ENV: 'development' }
    }).on('start', () => {
        if (!started) {
            done();
        }
        started = true;
    }).on('restart', () => {
        setTimeout(() => {
            browserSync.reload({
                stream: false
            });
        }, SYNC_DELAY);
    });
});

gulp.task('browser-sync', (done) => {
    browserSync({
        proxy: `http://localhost:${config.rawPort}`,
        port: config.port,
        browser: ['google-chrome']
    });
    done();
});

gulp.task('browser-sync-reload', (done) => {
    browserSync.reload();
    done();
});

gulp.task('watch', (done) => {
    compile(true);
    done();
});

gulp.task('build', gulp.parallel('html', 'sass', 'compile:js'));

gulp.task('default', gulp.series('build', 'start-express', 'browser-sync', 'watch'), (done) => {
    gulp.watch('src/index.html', gulp.series('html', 'browser-sync-reload'));
    gulp.watch('src/**/*.scss', gulp.series('sass', 'browser-sync-reload'));
    done();
});
