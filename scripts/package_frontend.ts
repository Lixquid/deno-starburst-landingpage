// Packages the frontend into the correct location for the backend to serve it.
// Run with --help for more information.

import * as flags from "https://deno.land/std@0.193.0/flags/mod.ts";
import * as fs from "https://deno.land/std@0.193.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.193.0/path/mod.ts";

parseArgs();

const root = path.dirname(path.dirname(path.fromFileUrl(import.meta.url)));
log("Project Root:", root);

// Check npx is available
log("Checking npx is available...");
await run(["npx", "--version"]);

// Ensure the frontend dependencies are installed
log("Installing frontend dependencies...");
await run(["npx", "yarn", "install"]);

// Clear the "dist" directory
log("Clearing frontend/dist directory...");
await fs.emptyDir(path.join(root, "frontend", "dist"));

// Run the "yarn build" command
log("Building frontend...");
await run(["npx", "yarn", "build"]);

// Remove the backend/static directory
log("Removing backend/static directory...");
await Deno.remove(path.join(root, "backend", "static"), { recursive: true });

// Copy the frontend files to the backend
log("Copying frontend files to backend...");
await fs.copy(
    path.join(root, "frontend", "dist"),
    path.join(root, "backend", "static"),
    { overwrite: true },
);

// Ensure the backend/templates directory exists
log("Ensuring backend/templates directory exists...");
await fs.ensureDir(path.join(root, "backend", "templates"));

// Empty the backend/templates directory
log("Emptying backend/templates directory...");
await fs.emptyDir(path.join(root, "backend", "templates"));

// Move the HTML files to the templates directory
log("Moving HTML files to templates directory...");
for await (
    const entry of Deno.readDir(
        path.join(root, "backend", "static"),
    )
) {
    if (entry.isFile && entry.name.endsWith(".html")) {
        await Deno.rename(
            path.join(root, "backend", "static", entry.name),
            path.join(
                root,
                "backend",
                "templates",
                entry.name.replace(".html", ".eta"),
            ),
        );
    }
}

log("Done!");

//#region Utility Functions
const helpMessage = `package_frontend.ts [options]

Packages the frontend into the correct location for the backend to serve it.

Options:
    -h, --help              Show this help message.
`;

function parseArgs() {
    const args = flags.parse(Deno.args, {
        boolean: [
            "help",
        ],
        alias: {
            "help": ["h"],
        },
    });

    if (args.help) {
        console.log(helpMessage);
        Deno.exit(-1);
    }
}

function log(...args: unknown[]) {
    console.log("►", ...args);
}

async function run(cmd: string[]) {
    // If windows, use cmd.exe
    const isWindows = Deno.build.os === "windows";
    if (isWindows) {
        cmd = ["cmd.exe", "/c", ...cmd];
    }

    const [command, ...args] = cmd;
    const process = new Deno.Command(command, {
        args,
        cwd: path.join(root, "frontend"),
    }).spawn();
    const status = await process.status;

    if (!status.success) {
        console.error(`Failed to run command: ${cmd.join(" ")}`);
        Deno.exit(1);
    }
}
//#endregion
