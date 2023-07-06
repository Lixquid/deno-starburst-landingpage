// Hashes a password for use with the Starburst Landing Page server.
// Run with --help for more information.

import * as flags from "https://deno.land/std@0.193.0/flags/mod.ts";
import { hash } from "https://deno.land/x/argontwo@0.1.1/mod.ts";

const { password, salt, memory, iterations, parallelism, json } =
    await parseArgs();

const encoder = new TextEncoder();

const hashRaw = hash(
    encoder.encode(password),
    encoder.encode(salt),
    {
        m: memory,
        t: iterations,
        p: parallelism,
    },
);
const hashOutput = Array.from(hashRaw).map((b) =>
    b.toString(16).padStart(2, "0")
).join("");

if (json) {
    console.log(JSON.stringify({
        hash: hashOutput,
        salt,
        memory,
        iterations,
        parallelism,
    }));
} else {
    console.log(`Hash: ${hashOutput}`);
    console.log(`Salt: ${salt}`);
    console.log();
    console.log(`Memory: ${memory}`);
    console.log(`Iterations: ${iterations}`);
    console.log(`Parallelism: ${parallelism}`);
}

//#region Utility Functions
const helpMessage = `hash_password.ts [options] [password|-]

Hashes a password for use with the Starburst Landing Page server.

NOTE: Passwords will have leading and trailing whitespace removed.

Options with a STARBURST_ word in all caps can be set as environment variables.

Options:
    password                The password to hash.
    STARBURST_PASSWORD      If "-", the password will be read from stdin.
                            Otherwise, the password will be prompted for.

    -s, --salt              The salt to use for hashing.
    STARBURST_SALT          If not set, a random salt will be generated.

    -j, --json              Output the result as JSON.
    STARBURST_JSON

    -h, --help              Show this help message.

Advanced Options:
    --memory                The amount of memory to use for hashing, in KiB.
    STARBURST_MEMORY        Defaults to 4096.

    --iterations            The number of iterations to use for hashing.
    STARBURST_ITERATIONS    Defaults to 3.

    --parallelism           The number of threads to use for hashing.
    STARBURST_PARALLELISM   Defaults to 1.
`;

async function parseArgs() {
    const args = flags.parse(Deno.args, {
        string: ["salt", "memory", "iterations", "parallelism"],
        boolean: ["help", "json"],
        alias: {
            help: "h",
            salt: "s",
            json: "j",
        },
    });

    if (args.help) {
        console.log(helpMessage);
        Deno.exit(-1);
    }

    const password = await getPassword(args._[0]);

    const salt = args.salt ?? Deno.env.get("STARBURST_SALT") ?? generateSalt();

    const memory = parseInt(
        args.memory ?? Deno.env.get("STARBURST_MEMORY") ?? "4096",
    );
    if (isNaN(memory)) {
        console.error("Invalid memory value");
        Deno.exit(1);
    }

    const iterations = parseInt(
        args.iterations ?? Deno.env.get("STARBURST_ITERATIONS") ?? "3",
    );
    if (isNaN(iterations)) {
        console.error("Invalid iterations value");
        Deno.exit(1);
    }

    const parallelism = parseInt(
        args.parallelism ?? Deno.env.get("STARBURST_PARALLELISM") ?? "1",
    );
    if (isNaN(parallelism)) {
        console.error("Invalid parallelism value");
        Deno.exit(1);
    }

    const json = args.json ?? !!Deno.env.get("STARBURST_JSON") ?? false;

    return { password, salt, memory, iterations, parallelism, json };
}

async function getPassword(pass: string | number) {
    switch (pass) {
        case "-": {
            // Read from stdin
            const buf = new Uint8Array(1024);
            let input = "";
            while (true) {
                const n = await Deno.stdin.read(buf);
                if (n === null) {
                    break;
                }
                input += new TextDecoder().decode(buf.subarray(0, n));
            }
            return input.trim();
        }
        case undefined: {
            // Check environment variable
            const password = Deno.env.get("STARBURST_PASSWORD");
            if (password !== undefined) {
                return password.trim();
            }

            // Prompt the user
            const response = prompt("Enter password:");
            if (response !== null) {
                return response.trim();
            }

            console.error("No password provided");
            Deno.exit(1);
            break;
        }
        default: {
            // Use the argument
            return String(pass).trim();
        }
    }
}

function generateSalt() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
//#endregion
