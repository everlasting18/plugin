FROM denoland/deno:2.0.0

WORKDIR /app

COPY deno.json .
COPY src/ ./src/
COPY main.ts .

EXPOSE 3000

CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "--allow-write", "main.ts"]
