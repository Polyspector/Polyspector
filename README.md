# Polyspector

## Tutorial
Please check tutorial.md
[TUTORIAL](TUTORIAL.md)

## setup on Centos7.5
### require  library
```
 erlang
 rabbitmq-server
 nodejs (v6.17.1)
 npm (v3.10.0)
 sqlite3-devel
```
### library Installation
  [node]
```
$ sudo curl -sL https://rpm.nodesource.com/setup_6.x | sudo -E bash -
$ sudo yum install -y nodejs  
$ node -v  
```
 configure npm (when your machine under proxy)
```
$npm config set proxy PROXY
```
  [forever]
  install forever
```
 cd Polyspector/
 npm install
 sudo npm install -g forever
```
  [rabbitmq]
  edit /etc/selinux/config
```
SELINUX=disabled
```
  install rabbitmq
```
 sudo yum install -y epel-release
 sudo yum install -y erlang
 sudo yum install -y rabbitmq-server 
 sudo systemctl start rabbitmq-server ; systemctl enable rabbitmq-server
```

### install 3rd party lib from npm
```
 cd VisualizationPlatform/
 npm install
 npm install sqlite3 bower
```

### install 3rd party lib via bower
```
 cd VisualizationPlatform/
 bower install
```
## Boot minimum platform 
```
 node server/start.js  PORT=8888
 //default data list
 node server/backend/worker_datalist/main.js
 //default workers for sample data (csv, tsv)
 node  server/backend/worker_csvtsv/main.js
 // Please Set Data at server/backend/worker_csvtsv/data/hoge.csv
```

## Access
  Please access http://IP_ADDRESS:PORT Using Google Chrome.
  USER:: admin
  PASSWORD :: 1234567

## License

*** Polyspector is licensed under the Apache License, Version2.0
