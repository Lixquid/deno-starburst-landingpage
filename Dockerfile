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

CMD ["deno", "run", "-A", "--unstable", "/app/backend/main.ts"]

LABEL org.opencontainers.image.source=https://github.com/lixquid/deno-starburst-landingpage
LABEL org.opencontainers.image.description="Starburst Landing Page Server"
LABEL org.opencontainers.image.authors=lixquid
LABEL org.opencontainers.image.licenses=MIT
