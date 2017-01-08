"use strict";

const cli = require("cli");
const Splitter = require("./lib/splitter");

cli.parse({
    input: [false, "Input file", "string", ""],
    output: [false, "Input file", "string", ""],
    packet_size: [false, "Packet size", "number", 188]
});

cli.main((args, options) => {
    if (options.input === "") {
        console.log(cli.getUsage());

        return;
    }

    const splitter = new Splitter(options);

    splitter.execute().then(() => {
        console.log("Successful");
    }).catch(err => {
        console.error(`Error: ${err.message}`);

        process.exitCode = 1;
    });
});
