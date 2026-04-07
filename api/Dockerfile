FROM denoland/deno:2.0.0

WORKDIR /app

COPY deno.json .
RUN deno cache src/main.ts || true

COPY src/ ./src/

EXPOSE 3000

CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "src/main.ts"]
