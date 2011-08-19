var net = require("net");

var clients = [];
var games 	= [];

function Client(stream) {
  this.stream = stream;
	this.name = null;
}

function nameClient(client, data, callback) {
	client.name = data.match(/\S+/);
  clients.forEach(function(c) {
    if (c != client) {
      c.stream.write(client.name + " has joined the server.\n");
    }
  });

	callback(client);
}

function Game(client) {
	this.players = [client];
}

function newGame(client) {
	for (var i = 0; i < games.length; i = i + 1) {
		var game = games[i];
		if (game.players.length === 1) {
			game.players[0].stream.write(client.name + " has joined your game.\n");
			game.players.push(client);
			return game;
		}
	};
	
	var aNewGame = new Game(client);
	return aNewGame;
}


function findGameForClient(client) {
	var game = newGame(client);
	if (game.players.length === 1) {
		games.push(game);
	};	
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

  stream.setTimeout(0);
  stream.setEncoding("utf8");

  stream.addListener("connect", function () {
		process.nextTick(function() {
    	stream.write("Welcome! Please enter your name. \n");
  	});		
	});
	
	stream.addListener("data", function (data) {
	    if (client.name == null) {
				process.nextTick(function() {
					nameClient(client, data, findGameForClient)
					});
	    }
	
			broadcastClientData(client, data);
	    
	  });	
		
});

server.listen(7000);