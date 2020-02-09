#!/bin/bash

echo $1
if [ $1 = "-d" ]; then
  npm install
  npm run start:dev
else
  npm install --production
  npm start
fi
