var net = require("net");

var clients = [];

function Client(stream) {
  this.stream = stream;
	this.name = null;
}

function nameClient(client, data) {
	client.name = data.match(/\S+/);
  clients.forEach(function(c) {
    if (c != client) {
      c.stream.write(client.name + " has joined.\n");
    }
  });
}

function broadcastClientData(client, data) {
	clients.forEach(function(c) {
    if (c != client) {
      c.stream.write(client.name + ": " + data);
    }
  });
}

var server = net.createServer(function (stream) {
  var client = new Client(stream);
  clients.push(client);

  stream.setTimeout(-1);
  stream.setEncoding("utf8");

  stream.addListener("connect", function () {
		process.nextTick(function() {
    	stream.write("Welcome! Please enter your name. \n");
  	});		
	});
	
	stream.addListener("data", function (data) {
	    if (client.name == null) {
				nameClient(client, data);
	      return;
	    }
	
			broadcastClientData(client, data);
	    
	  });	
		
});

server.listen(7000);