FROM node:8-alpine

WORKDIR /innocchi

# Install dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh
RUN npm install -g nodemon@1.17.5

# Install innocence-chi
COPY . .

EXPOSE 443
ENTRYPOINT [ "./entrypoint.sh" ]
