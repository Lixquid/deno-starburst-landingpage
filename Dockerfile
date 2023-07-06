FROM denoland/deno:alpine-1.34.3 AS frontend_builder

COPY ["./backend", "/app/backend"]
COPY ["./frontend", "/app/frontend"]
COPY ["./scripts", "/app/scripts"]

# Build the frontend
RUN apk add --no-cache nodejs npm && \
    deno run --allow-read --allow-write --allow-run /app/scripts/package_frontend.ts

FROM denoland/deno:alpine-1.34.3

COPY ["./backend", "/app/backend"]
COPY --from=frontend_builder ["/app/backend/static", "/app/backend/static"]
COPY --from=frontend_builder ["/app/backend/templates", "/app/backend/templates"]
COPY ["./scripts", "/scripts"]

RUN deno cache /app/backend/main.ts

WORKDIR /app

ENTRYPOINT ["deno", "run", "--allow-env"]
CMD ["--allow-net", "--allow-read", "--unstable", "/app/backend/main.ts"]
