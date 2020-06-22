FROM node:argon

#set a PROXY variables
#ENV PROXY http://your-proxy:port

#create a directory 
RUN mkdir  -p /usr/src/vispla
WORKDIR /usr/src/vispla

#copy dependencies
COPY package.json /usr/src/vispla

#set environment variables and install dependencies
RUN npm config set proxy $PROXY
RUN npm config set http-proxy $PROXY
RUN npm config set https-proxy $PROXY
RUN npm config set strict-ssl false
RUN npm config set ca ""
RUN npm install
ENV NODE_TLS_REJECT_UNAUTHORIZED 0
RUN npm install sqlite3

#install rabbitmq server
ENV http-proxy $PROXY
ENV ftp-proxy $PROXY
RUN apt-get update
RUN apt-get -y install rabbitmq-server

#bundle app source
COPY . /usr/src/vispla

EXPOSE 15672 5672 8003

#run rabbitmq server and application services
CMD sh /usr/src/vispla/startindocker.sh

