# Blockchain Academics MCP server, built from this repository's source.
# It speaks MCP over stdio, so run it with docker run -i:
#
#   docker build -t bca-mcp .
#   docker run -i --rm bca-mcp                   (the demo tools need no key)
#   docker run -i --rm -e BCA_API_KEY bca-mcp    (passes your key from your shell)
#
# No key is baked into the image. Without BCA_API_KEY the server uses the
# public demo key that also ships in the npm package.

FROM node:22.23.4-trixie-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY tsconfig.json server.json ./
COPY scripts ./scripts
COPY src ./src
# build: demo key module from scripts/demo-key.txt, tsc, then tools.json.
RUN npm run build && npm prune --omit=dev

FROM node:22.23.4-trixie-slim
LABEL org.opencontainers.image.title="Blockchain Academics MCP" \
      org.opencontainers.image.description="Crypto news, prices, onchain data and sentiment as agent tools, each answer with its primary source and a completeness status." \
      org.opencontainers.image.source="https://github.com/blockchainacademics/bca-mcp" \
      org.opencontainers.image.licenses="MIT" \
      io.modelcontextprotocol.server.name="io.github.blockchainacademics/mcp"
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/tools.json ./
USER node
CMD ["node", "dist/index.js"]
