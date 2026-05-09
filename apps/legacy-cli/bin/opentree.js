#!/usr/bin/env node

const { run } = require("../src/cli");

run()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error("[opentree] Unexpected error");
    console.error(error);
    process.exitCode = 1;
  });
