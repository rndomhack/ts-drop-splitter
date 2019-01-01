"use strict";

const path = require("path");

const fse = require("fs-extra");
const program = require("commander");

const TsDropSplitter = require("./lib/ts_drop_splitter");
const settings = require("./settings/settings");

async function readdirp(_path, level = 0) {
    const files = [];

    const items = (await fse.readdir(_path)).map(name => path.join(_path, name));

    for (const item of items) {
        const stats = await fse.stat(item);

        if (stats.isFile()) {
            files.push(item);
        } else if (level > 0) {
            files.push(...await readdirp(item, level - 1));
        }
    }

    return files;
}

program
    .usage("[options] <input>...")
    .option("-p, --packet-size <value>", "Packet size", Number.parseInt)
    .option("-r, --recursive-level <value>", "Recursive level", Number.parseInt)
    .parse(process.argv);

(async () => {
    if (program.args.length === 0) {
        program.outputHelp();

        return;
    }

    const options = Object.assign(settings.options, program);

    let files = [];

    for (const arg of program.args) {
        try {
            const stats = await fse.stat(arg);

            if (stats.isFile()) {
                files.push(arg);
            } else {
                files.push(...await readdirp(arg, options.recursiveLevel));
            }
        } catch (err) {
            console.error(`Error: ${err.message}\n`);

            process.exitCode = 1;

            continue;
        }
    }

    files = files.filter(file => /^\.(ts|m2ts)$/.test(path.extname(file)));

    for (const file of files) {
        console.log(`[ ${file} ]`);

        const tsDropSplitter = new TsDropSplitter({
            options: Object.assign({ input: file }, options)
        });

        try {
            await tsDropSplitter.execute();
        } catch (err) {
            console.error(`${err.stack}\n`);

            process.exitCode = 1;

            continue;
        }

        console.log("File is split\n");
    }
})();
