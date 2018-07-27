# innocence-chi
Cloud oriented WebSocket server

Overview
========

* Multi tenancy and scalability.
* Subprotocol based message dispatch.
* Binary messaging.

Features
========

## Scalability
* All messages are sent to all WebSocket server instances via AMQP backend, if backend enabled. To use AMQP backend, set AMQP URI into `AMQP` environment variable.
## Subprotocol Plugins
* All WebSocket connections are processed by subprotocol plugins when the connection requested. Subprotocols are processed in order to specified from client. The first succeeded subprotocol will be returned by WebSocket server.
* Every subprotocol plugins should return URI for the authorized connection. According to the URI, connections and messages are managed by WebSocket server. The format of URI is "[subprotocol]:[identifier]@[domain]/[path]", based on `url` module.
* Subprotocol plugin can process messages that is sent via own subprotocol, e.g send message to remote process and stop sending it via this WebSocket server.
* To create new plugin, refer to existing plugins.
## Multi tenancy
* Multitenancy is realized by delivering messages according to connection URI. It means this WebSocket server can dispatch messages for various applications without touching client messages.
## External message
* AMQP backend is able to use for not only scaling, but also is able to use for RPC or integration with external system.

Usage
=====

## Prerequisites
* Docker
* Docker Compose

## How to run
1. `git clone https://github.com/recitaivo/innocence-chi.git`
2. `cd innocence-chi`
3. `sudo docker-compose build`
4. `sudo docker-compose up`
5. To test, access https://[ip address]:8000/example/ws.html