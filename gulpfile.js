// Gulp project build file for VJ-Controller

// require modules
var gulp = require('gulp'),
    gutil = require('gulp-util'),
    concat = require('gulp-concat'),
    minify = require('gulp-minify'),
    jshint = require('gulp-jshint'),
    sass = require('gulp-sass'),
    yargs = require('yargs'),
    del = require('del'),
    rename = require('gulp-rename'),
    fs = require('fs'),
    empty = require('gulp-empty'),
    browserify = require('gulp-browserify');

// list source files
var jsSources = [
  'src/js/app.js',
  'src/js/controllers/faderCtrl.js',
  'src/js/controllers/sequencerCtrl.js',
  'src/js/controllers/headerCtrl.js',
  'src/js/services/faderManager.js',
  'src/js/services/sequencerManager.js',
  'src/js/services/assetLibrary.js',
  'src/js/services/colorLibrary.js',
  'src/js/services/socketFactory.js',
  'src/js/modules/jquery-extend.js'
];
var htmlSources = [
  'src/*.html',
  'src/partials/*.html'
];
var scssSources = [
  'src/scss/**/*.scss'
];
// all of the dist folders for deleting
var distFolders = [
  'dist/css',
  'dist/fonts',
  'dist/data',
  'dist/images',
  'dist/js',
  'dist/lib',
  'dist/partials'
];

// Check for --production flag
const PRODUCTION = !!(yargs.argv.production);

// cleans out the dist folder
gulp.task('clean', function(done) {
  del.sync(distFolders);
  done();
});
// cleans up working JS files
gulp.task('cleanEnd', ['copyJS'], function(done) {
  del.sync(['src/js/script.js', 'src/js/script-min.js']);
  done();
});

// copy partials (html) into dist folder
gulp.task('copyViews', function(done) {
  return gulp.src("src/partials/*.html")
      .pipe(gulp.dest('dist/partials'));
});
// copy libraries (Angular) into dist folder
// NOTE: change this to do only on --production build ...
gulp.task('copyLibraries', function(done) {
  return gulp.src("src/lib/**/*")
      .pipe(gulp.dest('dist/lib'));
});
// copy root files to dist folder
gulp.task('copyServerConfig', function(done) {
  if(PRODUCTION) {
    return gulp.src("src/serverIP - production.js")
        .pipe(rename('serverIP.js'))
        .pipe(gulp.dest('./dist'));
  } else {
    return gulp.src("src/serverIP - local.js")
        .pipe(rename('serverIP.js'))
        .pipe(gulp.dest('./dist'));
  }
});
gulp.task('copyHtmlRoot', function(done) {
  return gulp.src("src/index.html")
      .pipe(gulp.dest('dist'));
});
// copy the Bootstrap CSS files
gulp.task('copyBootstrapCSS', function(done) {
  return gulp.src("src/css/bootstrap/*")
      .pipe(gulp.dest('dist/css'));
});
// copy over any fonts (or glyphicons)
gulp.task('copyFonts', function(done) {
  return gulp.src("src/fonts/*")
      .pipe(gulp.dest('dist/fonts'));
});
// copy data (JSON, etc.)
gulp.task('copyData', function(done) {
  return gulp.src("src/data/*")
      .pipe(gulp.dest('dist/data'));
});
// copy images
gulp.task('copyImages', function(done) {
  return gulp.src("src/images/*")
      .pipe(gulp.dest('dist/images'));
});

gulp.task('copyFiles', ['copyViews', 'copyLibraries', 'copyHtmlRoot', 'copyServerConfig', 'copyBootstrapCSS', 'copyFonts', 'copyData', 'copyImages']);

// define tasks
gulp.task('jshint', function() {
  gulp.src(jsSources)
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish-ex'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('sass', function() {
  return gulp.src(scssSources)
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('dist/css'));
});

gulp.task('js', ['jshint'], function() {
  gulp.src(jsSources)
    .pipe(concat('script.js'))
    .pipe(browserify())
    .pipe(gulp.dest('src/js'));
});

// minify code for production
gulp.task('minify', ['js'], function() {
  if(!PRODUCTION) {
    minify = require("gulp-empty");
  }
  return gulp.src('src/js/script.js')
    .pipe(minify({
      ext:{
        src:'.js',
        min:'-min.js'
      }
    }))
    .pipe(gulp.dest('src/js'));
});

// copy over JS code after possible minification
gulp.task('copyJS', ['minify'], function() {
  if(!PRODUCTION) {
    return gulp.src('src/js/script.js')
      .pipe(gulp.dest('dist/js'));
  } else {
    return gulp.src('src/js/script-min.js')
      .pipe(rename('script.js'))
      .pipe(gulp.dest('dist/js'));
  }
});

// watch for file changes to JS or Sass
gulp.task('watch', ['copyJS'], function() {
  gulp.watch(jsSources, ['jshint', 'js', 'minify', 'copyJS', 'cleanEnd']);
  gulp.watch(htmlSources, ['copyViews']);
  gulp.watch(scssSources, ['sass']);
});

//  default task when running Gulp
gulp.task('default', ['clean', 'jshint', 'sass', 'js', 'copyFiles', 'minify', 'copyJS', 'cleanEnd', 'watch']);
