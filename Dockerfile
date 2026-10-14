FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8085 DATA_DIR=/app/data
COPY server/ ./server/
COPY public/ ./public/
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
EXPOSE 8085
CMD ["node", "--no-warnings", "server/server.js"]
