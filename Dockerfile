FROM node:18-slim AS build

ENV PUBLIC_URL="\$PUBLIC_URL"
ENV REACT_APP_CLIENT_ID="\$REACT_APP_CLIENT_ID"
ENV REACT_APP_DATA_AUTHORITY="\$REACT_APP_DATA_AUTHORITY"

RUN printenv

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build


FROM nginx:stable-alpine
RUN apk add --no-cache 
COPY --from=build /app/build /var/www/html
COPY docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
ENTRYPOINT ["/bin/sh", "-c", "./docker-entrypoint.sh"]