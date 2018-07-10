# innocence-chi
[WIP] Cloud oriented WebSocket server

Overview
========

* Multi tenancy and scalability.
* Subprotocol based message dispatch.

Features
========

## Scalability
* All messages are sent to all WebSocket server instances via AMQP backend, if backend enabled.
* **NOT IMPLEMENTED YET**
## Subprotocol Plugins
* All WebSocket connections are processed by subprotocol plugins when the connection requested. Subprotocols are processed in order to specified from client. The first succeeded subprotocol will be returned by WebSocket server.
* Every subprotocol plugins should return URI for the authorized connection. According to the URI, connections and messages are managed by WebSocket server. The format of URI is "[subprotocol]:[identifier]@[domain]/[path]", based on `url` module.
## Multi tenancy
* Multitenancy is realized by delivering messages according to connection URI. It means this WebSocket server can dispatch messages for various applications without touching client messages.
## External message
* AMQP backend is used for not only scaling, but also is able to use for RPC or integration with external system.
* **NOT IMPLEMENTED YET**

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
