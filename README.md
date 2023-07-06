# Starburst Landing Page

A small web server that serves a landing page for a collection of devices.

Supports pinging devices for availability, and sending wake-on-lan packets.

Useful for home networks with a collection of devices that can be accessed
remotely and are not always on, like desktops and laptops.

## Requirements

- [Deno](https://deno.land/)
- [Node.js](https://nodejs.org/en/)
- [Yarn](https://yarnpkg.com/)

## Getting Started

### Docker

> If you want to support wake-on-lan, run the `/scripts/hash_password.ts` script
> to generate a password hash and salt.
>
> ```sh
> docker run --rm -it -v ghcr.io/lixquid/starburst-landingpage:latest deno run --allow-env /scripts/hash_password.ts
> ```

1. Copy the `backend/config.example.json` file to `config.json`, and update the
   values as needed.
2. Run the server.

   ```sh
   docker run -v "$(pwd)/config.json:/app/config.json" -p 8080:8080 ghcr.io/lixquid/starburst-landingpage:latest
   ```

### From Source

> If you want to support wake-on-lan, run the `scripts/hash_password.ts` script
> to generate a password hash and salt.
>
> ```sh
> deno run --allow-env scripts/hash_password.ts
> ```

1. Run the `scripts/package_frontend.ts` script to build and package the
   frontend into the correct locations in the backend.

   ```sh
   deno run --allow-read --allow-write --allow-run scripts/package_frontend.ts
   ```
2. Copy the `backend/config.example.json` file to `backend/config.json`, and
   update the values as needed.
3. Run the server.

   ```sh
   cd backend
   deno run --allow-net --allow-read --unstable main.ts
   ```

For more information, all scripts and the server support the `--help` flag.

<details>
<summary><h2>Developer Documentation</h2></summary>

### Preparing a new release

1. Create an entry in [CHANGELOG.md](CHANGELOG.md).
2. Update the README.md file as needed.
3. Commit with `Version x.y.z` as the commit message.
4. Tag the commit with `vX.Y.Z`.

</details>
