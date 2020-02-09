FROM node:12-alpine

WORKDIR /innocchi

# Install dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh

# Install innocence-chi
COPY . .

EXPOSE 443
ENTRYPOINT [ "./entrypoint.sh" ]
