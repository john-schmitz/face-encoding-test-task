FROM node:22 AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install --silent

COPY . .

RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD [ "node", "dist/index.js" ]
