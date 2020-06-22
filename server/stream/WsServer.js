/*
    Copyright (c) 2016 Toshiba
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0


    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

var WsServer = function(port) {
  var self = this;
  self.rlink  = {};
  
  self.sio =  require('socket.io').listen(port);
  
  self.sio.sockets.on('connection', function(socket) {
    
    /**remotelink start */
    socket.on('init:remotelink', function(data) { //client access 
      socket.join(data.room); //the room name is user purpose, such as screen share
      //self.rlink[socket.id] = { room: data.room}; // to access room name later
      console.log('init:remotelink '+ data.room)
    });
    socket.on('close:remotelink', function(data) { //client access 
      socket.leave(data.room); //the room name is user purpose, such as screen share
      //delete self.rlink[socket.id];
      console.log('init:remotelink '+ data.room)
    });
    
    socket.on('board:remotelink', function(data) { //share operation of charts inside screen
      //socket.broadcast.to(self.rlink[socket.id].room).emit('board:remotelink', data);
      socket.broadcast.to(data.room).emit('board:remotelink', data.data);
      console.log('board:remotelink '+ data.room)
    });
    socket.on('screen:remotelink', function(data) { //share operation among screen
      //socket.broadcast.to(self.rlink[socket.id].room).emit('screen:remotelink', data);
      socket.broadcast.to(data.room).emit('screen:remotelink', data.data);
      console.log('screen:remotelink '+ data.room)
    });
    /**remotelink end */

    /**streame start */
    socket.on('init:streame', function(data) { //client access 
      socket.join(data.room); //from client, the vtname to receive stream data
    });

    socket.on('worker:streame', function(data) { //stream from work: data to client have the same vtname
      socket.broadcast.to(data.wvtname).emit(data.wvtname, data);
    });
    /**streame end */

    socket.on('disconnect', function() {
      /*if(socket.id in self.rlink) {
        socket.leave(self.rlink[socket.id].room);
        delete self.rlink[socket.id];
      }*/
    });
  });

  self.sio.sockets.on('connect_error', function(socket) {
    /*if(socket.id in self.rlink) {
      socket.leave(self.rlink[socket.id].room);
      delete self.rlink[socket.id];
    }*/
  });

  self.sio.sockets.on('connect_timout', function(socket) {
    /*if(socket.id in self.rlink) {
      socket.leave(self.rlink[socket.id].room);
      delete self.rlink[socket.id];
    }*/
  });

};

/*used in debug */ 
WsServer.prototype.check = function(user) {
 console.log('--------------client count--------------');
 console.log(this.sio.sockets.server.eio.clientsCount);
 console.log('--------------current-user--------------: '+user);
}

WsServer.prototype.broadcast = function(room, payload) {
  self.sio.sockets.in(self.ws[socket.id].room).emit(payload);
}

module.exports = WsServer;
