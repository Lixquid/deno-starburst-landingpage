import { Eta } from "eta";
import { defineConfig } from "vite";

const demoData = {
    name: "Demo Landing",
    servers: [
        {
            name: "Inactive",
            active: false,
            controllable: false,
        },
        {
            name: "Active",
            active: true,
            controllable: false,
        },
        {
            name: "Controllable",
            active: true,
            controllable: true,
        },
    ],
};

export default defineConfig({
    plugins: [
        // This plugin renders the eta tags in the index.html file with
        // some demo data in development mode.
        {
            name: "render-eta-in-dev",
            apply: "serve",
            transformIndexHtml: {
                enforce: "pre",
                async handler(html) {
                    return new Eta({
                        tags: ["{{", "}}"],
                    }).renderStringAsync(html, demoData);
                },
            },
        },
    ],
});
