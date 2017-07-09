"use strict";

const cli = require("cli");
const Splitter = require("./lib/splitter");

cli.parse({
    input: [false, "Input file", "string", ""],
    output: [false, "Output file", "string", ""],
    packet_size: [false, "Packet size", "number", 188]
});

cli.main(async (args, options) => {
    if (options.input === "") {
        console.log(cli.getUsage());

        return;
    }

    const splitter = new Splitter(options);

    try {
        await splitter.execute();
    } catch (err) {
        console.error(`Error: ${err.message}`);

        process.exitCode = 1;
    }

    console.log("File split");
});
