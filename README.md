# Polyspector

## Tutorial

Please check tutorial.md
[TUTORIAL](TUTORIAL.md)

## setup on Centos7.5

### require  library

``` text
 erlang
 rabbitmq-server
 nodejs (v6.17.1)
 npm (v3.10.0)
 sqlite3-devel
```

### Installation

#### node

```console
sudo curl -sL https://rpm.nodesource.com/setup_6.x | sudo -E bash -
sudo yum install -y nodejs  
node -v  
```

configure npm (when your machine under proxy)

```console
npm config set proxy PROXY
```

#### forever

install forever

```console
cd Polyspector/
npm install
sudo npm install -g forever
```

#### rabbitmq

edit /etc/selinux/config

```console
sudo sed -i 's/SELINUX=enforcing/SELINUX=disabled/g' /etc/selinux/config
```

install rabbitmq

```console
 sudo yum install -y epel-release
 sudo yum install -y erlang
 sudo yum install -y rabbitmq-server 
 sudo systemctl start rabbitmq-server ; systemctl enable rabbitmq-server
```

#### Install 3rd party lib from npm

```console
npm install
npm install sqlite3
```

## Boot minimum platform

```console
// Launch frontend server
node server/start.js  PORT=8888

// Launch workers for sample data (csv, tsv)
node server/backend/worker_datalist/main.js
node  server/backend/worker_csvtsv/main.js
```

### Access

Please access http://IP_ADDRESS:PORT Using Google Chrome.
USER:: admin
PASSWORD :: 1234567

## License

*** Polyspector is licensed under the Apache License, Version2.0
