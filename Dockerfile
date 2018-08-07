FROM node:8-alpine

WORKDIR /code

RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh

RUN npm install -g nodemon@1.17.5

COPY package.json /code/package.json
RUN npm install && npm ls
RUN mv /code/node_modules /node_modules

COPY . /code

CMD ["npm", "start"]
