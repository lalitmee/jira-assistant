FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN yarn install --frozen-lockfile

COPY apps/api apps/api
COPY apps/web apps/web

RUN yarn build

FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./package.json
COPY --from=build /app/apps/web/dist ./web-dist

EXPOSE 8888

CMD ["node", "dist/index.js"]
