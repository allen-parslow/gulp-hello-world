console.log(`Starting tests ...`);

const config = {
    sources: {
        tests: 'src/*-test.js'
    }
};

module.exports = (karma) => {
    karma.set({
        basePath: '',
        frameworks: ['browserify', 'mocha', 'chai'],
        files: [
            config.sources.tests
        ],
        exclude: [],
        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            'src/**/*.js': ['browserify']
        },
        browserify: {
            debug: true,
            transform: ['babelify']
        },
        reporters: ['progress'],
        port: 9876,
        colors: true,
        // level of logging, possible values:
        // LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
        logLevel: config.LOG_INFO,
        autoWatch: true,
        browsers: ['Chrome'],
        singleRun: false,
        concurrency: Infinity
    });
};
