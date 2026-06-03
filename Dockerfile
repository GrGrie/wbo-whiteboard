FROM node:12-alpine

COPY . /opt/app
WORKDIR /opt/app
RUN npm install --production

ENV PORT=80
ENV SAVE_BOARDS=true
ENV WBO_HISTORY_DIR=/opt/app/server-data
EXPOSE 80

VOLUME /opt/app/server-data

CMD ["npm", "start"]
