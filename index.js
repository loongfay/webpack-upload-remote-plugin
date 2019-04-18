/**
 * @file UploadRemotePlugin
 * @author izhaolongfei@gmail.com
 */

const ConsoleProgressBar = require('console-progress-bar');
const request = require('request').defaults({
    pool: {
        maxSockets: 10
    },
    forever: true
});
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class UploadRemotePlugin {
    constructor(options) {
        const {
            context = '',
            receiver,
            rules,
            parallel = true
        } = options;
        this.context = context;
        this.receiver = receiver;
        this.rules = rules;
        this.parallel = parallel;
        this.files = [];
        this.retry = 10;
        this.fails = {};
        this.totalNum = 0;
        this.uploadedNum = 0;
    }

    apply(compiler) {
        compiler.plugin('done', stats => {
            this.startTime = Date.now();

            const {
                compilation
            } = stats;
            const assets = compilation.assets;
            const assetKeys = Object.keys(assets);

            console.log(chalk.cyan.bold('\n[UploadToRemotePlugin] upload start...'));
            console.log(chalk.cyan.bold('Total Files: ' + assetKeys.length));

            for (let file of assetKeys) {
                for (let rule of this.rules) {
                    if (rule.from.test(file)) {
                        this.files.push({
                            filename: path.basename(file),
                            pathFrom: file,
                            pathTo: this.calTargetFile(rule.to, file),
                            content: assets[file].existsAt
                        });
                    }
                }
            }

            this.totalNum = this.files.length;

            this.consoleProgressBar = new ConsoleProgressBar({
                maxValue: this.files.length
            });

            this.parallel ? this.uploadFiles() : this.uploadFileOneByOne();
        });
    }

    calTargetFile(todir, assetfile) {
        return (todir.endsWith('/') ? todir : todir + '/') +
            (assetfile.startsWith('/') ? assetfile.replace('/', '') : assetfile);
    }

    uploadFiles() {
        for (let file of this.files) {
            this.upload(file);
        }
    }

    uploadFileOneByOne() {
        const file = this.files.shift();
        file && this.upload(file, this.uploadFileOneByOne.bind(this));
    }

    upload(file, next) {
        const {
            filename,
            pathFrom,
            pathTo,
            content
        } = file;

        const buffer = fs.createReadStream(content);

        const formData = {
            filename: filename,
            path: pathTo,
            file: buffer
        };

        request.post({
            url: this.receiver,
            formData
        }, (error, response) => {
            if (!error && response.statusCode === 200) {
                this.uploadedNum++;

                this.consoleProgressBar.addValue(1);

                if (this.fails[pathFrom]) {
                    console.log(chalk.green.bold(`\n[UploadToRemotePlugin] upload retry "${pathFrom}" success`));
                    delete this.fails[pathFrom];
                }

                next && next();
            } else {
                this.fails[pathFrom] = (this.fails[pathFrom] || 0) + 1;

                if (this.fails[pathFrom] <= this.retry) {
                    // 重试
                    console.log(chalk.yellow.bold(`\n[UploadToRemotePlugin] upload retry No.${this.fails[pathFrom]}: ${pathFrom} >> ${pathTo}`));

                    this.upload(file, next);
                } else {
                    this.uploadedNum++;

                    this.consoleProgressBar.addValue(1);

                    console.log(chalk.red.bold(`\n[UploadToRemotePlugin] upload failed: ${pathFrom} >> ${pathTo}; Post Error: ${error}`));

                    !this.parallel && next && next();
                }
            }

            if (this.uploadedNum === this.totalNum) {
                const cost = ((Date.now() - this.startTime) / 1000).toFixed(3);
                console.log(chalk.cyan.bold(`\n[UploadToRemotePlugin] upload done...Cost:${cost}s`));
            }
        });
    }
}

module.exports = UploadRemotePlugin;