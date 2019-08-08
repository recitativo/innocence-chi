#!/bin/bash

npm install
echo $1
if [ $1 = "-d" ]; then
  nodemon -L --inspect=0.0.0.0:5858
else
  npm start
fi
