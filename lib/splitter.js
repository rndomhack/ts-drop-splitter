"use strict";

const fs = require("fs");
const path = require("path");
const stream = require("stream");
const util = require("util");

const aribts = require("aribts");

const stat = util.promisify(fs.stat);

async function exists(_path) {
    try {
        await stat(_path);
    } catch (err) {
        return false;
    }

    return true;
}

class Splitter {
    constructor(options) {
        options = options || {};

        this.options = {
            input: options.input,
            output: options.output || options.input,
            packetSize: options.packet_size
        };

        this.splits = [];
    }

    async execute() {
        await this.checkInput();
        await this.analyze();
        await this.split();
    }

    async checkInput() {
        console.log("Check Input...");

        if (this.options.input === void 0) {
            throw new Error("Invalid input");
        }

        if (!await exists(this.options.input)) {
            throw new Error("Can't find input");
        }
    }

    async analyze() {
        console.log("Analyze...");

        const stats = await stat(this.options.input);
        const size = stats.size;

        await new Promise(resolve => {
            let bytesRead = 0;
            let count = 0;

            this.splits.push([0]);

            const readableStream = fs.createReadStream(this.options.input);
            const transformStream = new stream.Transform({
                transform: function (chunk, encoding, done) {
                    bytesRead += chunk.length;

                    if (++count === 100) {
                        process.stdout.write("\r\u001b[K");
                        process.stdout.write(` - Analyze ${bytesRead} of ${size} [${Math.floor(bytesRead / size * 100)}%]`);
                        count = 0;
                    }

                    this.push(chunk);
                    done();
                },
                flush: function (done) {
                    process.stdout.write("\r\u001b[K");
                    process.stdout.write(` - Done ${bytesRead} of ${size} [${Math.floor(bytesRead / size * 100)}%]\n`);

                    done();
                }
            });

            const tsReadableConnector = new aribts.TsReadableConnector();
            const tsPacketParser = new aribts.TsPacketParser({ packetSize: this.options.packetSize });
            const tsPacketConverter = new aribts.TsPacketConverter();
            const tsPacketAnalyzer = new aribts.TsPacketAnalyzer();

            readableStream.pipe(transformStream);
            transformStream.pipe(tsReadableConnector);

            tsPacketAnalyzer.on("packetDrop", pid => {
                process.stdout.write("\r\u001b[K");
                console.log(`Find drop at 0x${pid.toString(16)}`);

                const result = tsPacketAnalyzer.getResult();
                const packets = Object.keys(result).reduce((prev, value) => prev + result[value].packet, 0);
                const expectedSize = (packets - 1) * this.options.packetSize;

                this.splits[this.splits.length - 1].push(expectedSize);
                this.splits.push([expectedSize]);
            });

            tsPacketAnalyzer.on("finish", () => {
                this.splits[this.splits.length - 1].push(size);

                resolve();
            });

            tsReadableConnector.pipe(tsPacketParser);
            tsPacketParser.pipe(tsPacketAnalyzer);
            tsPacketAnalyzer.pipe(tsPacketConverter);
        });
    }

    async split() {
        console.log("Split...");

        if (this.splits.length < 2) return;

        const stats = await stat(this.options.input);
        const size = stats.size;

        for (let i = 0; i < this.splits.length; i++) {
            const split = this.splits[i];

            await new Promise((resolve, reject) => {
                let bytesRead = split[0];
                let count = 0;

                const readableStream = fs.createReadStream(this.options.input, { start: split[0], end: split[1] });
                const writableStream = fs.createWriteStream(path.join(path.dirname(this.options.output), `${path.basename(this.options.output, path.extname(this.options.output))}_splitted_${i + 1}${path.extname(this.options.output)}`));
                const transformStream = new stream.Transform({
                    transform: function (chunk, encoding, done) {
                        bytesRead += chunk.length;

                        if (++count === 100) {
                            process.stdout.write("\r\u001b[K");
                            process.stdout.write(` - Split ${bytesRead} of ${size} [${Math.floor(bytesRead / size * 100)}%]`);
                            count = 0;
                        }

                        this.push(chunk);
                        done();
                    },
                    flush: function (done) {
                        process.stdout.write("\r\u001b[K");
                        process.stdout.write(` - Done ${bytesRead} of ${size} [${Math.floor(bytesRead / size * 100)}%]`);

                        done();
                    }
                });

                readableStream.on("error", err => {
                    reject(err);
                });

                writableStream.on("error", err => {
                    reject(err);
                });

                writableStream.on("finish", () => {
                    resolve();
                });

                readableStream.pipe(transformStream);
                transformStream.pipe(writableStream);
            });
        }

        process.stdout.write("\n");
    }
}

module.exports = Splitter;
