FROM node:20.6.1 as build
WORKDIR /vital-data-dashboard
COPY package.json /vital-data-dashboard/package.json
RUN npm install

COPY public /vital-data-dashboard/public
COPY src /vital-data-dashboard/src
COPY .env /vital-data-dashboard/.env
# COPY . /vital-dashboard/
RUN npm run build

FROM nginx:latest
COPY --from=build /vital-data-dashboard/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


# RUN npm run start