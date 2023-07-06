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

If you want to support wake-on-lan:

1. Run the `scripts/hash_password.ts` script to generate a password hash.

   ```sh
   deno run --allow-env scripts/hash_password.ts
   ```
2. Edit the `backend/config.json` file, putting the password hash and salt in
   the `password.hash` and `password.salt` fields, respectively.
3. Add the MAC addresses of the devices you want to support wake-on-lan for to
   the `servers[].mac` field in the `backend/config.json` file.

For more information, all scripts and the server support the `--help` flag.
