// A server to see the status of devices and send wake-on-lan packets.
// Run with --help to see options.

import * as flags from "https://deno.land/std@0.193.0/flags/mod.ts";
import * as path from "https://deno.land/std@0.193.0/path/mod.ts";
import { hash } from "https://deno.land/x/argontwo@0.1.1/mod.ts";
import { Eta } from "https://deno.land/x/eta@v3.0.3/src/index.ts";
import * as oak from "https://deno.land/x/oak@v12.5.0/mod.ts";
import * as wol from "https://deno.land/x/wol@v1.0.1/mod.ts";
// @deno-types="npm:@types/ping"
import ping from "npm:ping@0.4.4";

const { configPath, port, verbose } = await parseArgs();
const config = await readConfig(configPath);
if (verbose) printConfig(port, config);

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
const eta = new Eta({
    views: path.join(__dirname, "templates"),
    tags: ["{{", "}}"],
});

const app = new oak.Application();
const router = new oak.Router();

//// Logging ////
if (verbose) {
    app.use(async (ctx, next) => {
        await next();
        console.log(
            `${ctx.request.method} ${ctx.request.url} - ${ctx.response.status}`,
        );
    });
}

//// WOL Requests ////
router.get("/wol/:index", async (ctx) => {
    const index = parseInt(ctx.params.index);
    if (isNaN(index) || index < 0 || index >= config.servers.length) {
        ctx.response.status = 400;
        ctx.response.body = "Invalid index";
        return;
    }

    // Check authorization
    const auth = ctx.request.headers.get("Authorization");
    if (!matchesPassword(auth)) {
        ctx.response.status = 401;
        ctx.response.headers.set("WWW-Authenticate", "Basic");
        ctx.response.body = "Unauthorized";
        return;
    }

    // Check if server supports WOL
    const mac = config.servers[index].mac;
    if (mac === undefined) {
        ctx.response.status = 400;
        ctx.response.body = "Server does not support WOL";
        return;
    }

    // Send WOL packet
    try {
        await wol.wake(mac);
        if (verbose) console.log(`Sent WOL packet to ${mac}`);
    } catch (ex: unknown) {
        ctx.response.status = 500;
        ctx.response.body = "Failed to send WOL packet";
        console.error(`Failed to send WOL packet to ${mac}: ${ex}`);
        return;
    }

    ctx.response.body = await renderIndex();
});

//// Index Page ////
router.get("/", async (ctx) => {
    ctx.response.body = await renderIndex();
});

app.use(router.routes());

//// Static Files ////
app.use(async (ctx, next) => {
    try {
        await ctx.send({
            root: path.join(__dirname, "static"),
        });
    } catch {
        await next();
    }
});

//// Start Server ////
app.addEventListener("listen", () => {
    console.log(`Listening on port ${port}`);
});
await app.listen({ port });

//#region Utility Methods
const helpMessage = `main.ts [options]

A server to see the status of devices and send wake-on-lan packets.

Options with a STARBURST_ word in all caps can be set as environment variables.

Options:
    -h, --help                Show this help message.

    -v, --verbose             Enable verbose logging.
    STARBURST_VERBOSE

    -c, --config              The path to the config file.
    STARBURST_CONFIG          Defaults to "config.json".

    -p, --port                The port to listen on.
    STARBURST_PORT            Defaults to 8080.
`;

/** Parses the command line arguments. */
async function parseArgs() {
    const args = flags.parse(Deno.args, {
        string: [
            "config",
            "port",
        ],
        boolean: [
            "help",
            "verbose",
        ],
        alias: {
            h: "help",
            c: "config",
            p: "port",
            v: "verbose",
        },
    });

    if (args.help) {
        console.log(helpMessage);
        Deno.exit(-1);
    }

    const configPath = args.config ?? Deno.env.get("STARBURST_CONFIG") ??
        "config.json";
    if (await Deno.stat(configPath).catch(() => null) === null) {
        console.error(`Config file "${configPath}" does not exist`);
        Deno.exit(-1);
    }

    const port = parseInt(
        args.port ?? Deno.env.get("STARBURST_PORT") ?? "8080",
    );
    if (isNaN(port)) {
        console.error("Invalid port value");
        Deno.exit(-1);
    }
    if (port < 0 || port > 65535) {
        console.error("Port must be between 0 and 65535");
        Deno.exit(-1);
    }

    return {
        configPath,
        port,
        verbose: args.verbose ?? !!Deno.env.get("STARBURST_VERBOSE"),
    };
}

/** Reads and validates the config file and returns the config object. */
async function readConfig(path: string) {
    const config = JSON.parse(await Deno.readTextFile(path));
    if (typeof config !== "object" || config === null) {
        console.error("Invalid config file");
        Deno.exit(-1);
    }

    const name = config.name as unknown ?? undefined;
    if (name !== undefined && typeof name !== "string") {
        console.error(`Invalid config: "name" must be a string or unset`);
        Deno.exit(-1);
    }

    const passwordHash = config.password?.hash as unknown ?? undefined;
    if (passwordHash !== undefined && typeof passwordHash !== "string") {
        console.error(
            `Invalid config: "password.hash" must be a string or unset`,
        );
        Deno.exit(-1);
    }
    if (passwordHash !== undefined && !/^[0-9a-f]{64}$/i.test(passwordHash)) {
        console.error(
            `Invalid config: "password.hash" must be a 64-character hex string`,
        );
        Deno.exit(-1);
    }

    const passwordSalt = config.password?.salt as unknown ?? undefined;
    if (passwordSalt !== undefined && typeof passwordSalt !== "string") {
        console.error(
            `Invalid config: "password.salt" must be a string or unset`,
        );
        Deno.exit(-1);
    }

    const passwordMemory = config.password?.advanced?.memory as unknown ?? 4096;
    if (typeof passwordMemory !== "number" || isNaN(passwordMemory)) {
        console.error(
            `Invalid config: "password.advanced.memory" must be a number or unset`,
        );
        Deno.exit(-1);
    }
    if (passwordMemory < 0) {
        console.error(
            `Invalid config: "password.advanced.memory" must be positive`,
        );
        Deno.exit(-1);
    }

    const passwordIterations =
        config.password?.advanced?.iterations as unknown ?? 3;
    if (typeof passwordIterations !== "number" || isNaN(passwordIterations)) {
        console.error(
            `Invalid config: "password.advanced.iterations" must be a number or unset`,
        );
        Deno.exit(-1);
    }
    if (passwordIterations < 0) {
        console.error(
            `Invalid config: "password.advanced.iterations" must be positive`,
        );
        Deno.exit(-1);
    }

    const passwordParallelism =
        config.password?.advanced?.parallelism as unknown ?? 1;
    if (typeof passwordParallelism !== "number" || isNaN(passwordParallelism)) {
        console.error(
            `Invalid config: "password.advanced.parallelism" must be a number or unset`,
        );
        Deno.exit(-1);
    }
    if (passwordParallelism < 0) {
        console.error(
            `Invalid config: "password.advanced.parallelism" must be positive`,
        );
        Deno.exit(-1);
    }

    const serversRaw = config.servers as unknown;
    if (!Array.isArray(serversRaw)) {
        console.error(`Invalid config: "servers" must be an array`);
        Deno.exit(-1);
    }

    const servers = serversRaw.map((v, i) => {
        if (typeof v !== "object" || v === null) {
            console.error(`Invalid config: "servers[${i}]" must be an object`);
            Deno.exit(-1);
        }

        const name = v.name as unknown;
        if (typeof name !== "string") {
            console.error(
                `Invalid config: "servers[${i}].name" must be a string`,
            );
            Deno.exit(-1);
        }

        const hostname = v.hostname as unknown;
        if (typeof hostname !== "string") {
            console.error(
                `Invalid config: "servers[${i}].hostname" must be a string`,
            );
            Deno.exit(-1);
        }

        const mac = v.mac as unknown ?? undefined;
        if (mac !== undefined && typeof mac !== "string") {
            console.error(
                `Invalid config: "servers[${i}].mac" must be a string or unset`,
            );
            Deno.exit(-1);
        }

        return { name, hostname, mac };
    });

    return {
        name,
        passwordHash,
        passwordSalt,
        passwordMemory,
        passwordIterations,
        passwordParallelism,
        servers,
    };
}

/** Checks if the given auth header matches the password in the config. */
function matchesPassword(authHeader: string | null): boolean {
    if (!config.passwordHash || !config.passwordSalt) {
        return false;
    }
    if (authHeader === null) {
        return false;
    }
    if (!authHeader.startsWith("Basic ")) {
        return false;
    }
    authHeader = authHeader.slice("Basic ".length);
    const [, password] = atob(authHeader).split(":", 2);

    const encoder = new TextEncoder();
    const hashRaw = hash(
        encoder.encode(password),
        encoder.encode(config.passwordSalt),
        {
            m: config.passwordMemory,
            t: config.passwordIterations,
            p: config.passwordParallelism,
        },
    );
    const hex = Array.from(hashRaw)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    return hex === config.passwordHash;
}

/** Prints the config to stdout. */
function printConfig(
    port: number,
    config: Awaited<ReturnType<typeof readConfig>>,
) {
    console.log(`Name: ${config.name ?? "(unset)"}`);
    console.log(`Port: ${port}`);
    console.log(`Password Hash: ${config.passwordHash ?? "(unset)"}`);
    console.log(`Password Salt: ${config.passwordSalt ?? "(unset)"}`);
    console.log(`    Password Memory: ${config.passwordMemory}`);
    console.log(`    Password Iterations: ${config.passwordIterations}`);
    console.log(`    Password Parallelism: ${config.passwordParallelism}`);
    console.log(`Servers:`);
    for (const [i, server] of config.servers.entries()) {
        console.log(`    ${i + 1}:`);
        console.log(`        Name: ${server.name}`);
        console.log(`        Hostname: ${server.hostname}`);
        console.log(`        MAC: ${server.mac ?? "(unset)"}`);
    }
}

/** Renders the index eta template. */
async function renderIndex() {
    const pings = await Promise.all(config.servers.map((server) => {
        return ping.promise.probe(server.hostname, {
            timeout: 1,
            min_reply: 1,
        }) as Promise<{ alive: boolean }>;
    }));
    return await eta.renderAsync("index", {
        name: config.name ?? "",
        servers: config.servers.map((server, i) => ({
            name: server.name,
            active: pings[i].alive,
            controllable: server.mac !== undefined,
        })),
    });
}
//#endregion
