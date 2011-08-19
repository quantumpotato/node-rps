var net = require("net");

var clients = [];
var games 	= [];

function Client(stream) {
  this.stream = stream;
	this.name = null;
	this.game = null;
	this.turn = null;
	
	return this;
}

function Game(client) {
	this.players = [client];
	client.game = this;
	
	this.available = function() {
		if (this.players.length === 1) {
			return true;
		}
		
		return false;
	}
	
	this.active = function() {
		if (this.players.length === 2) {
			return true;
		}
		
		return false;
	}
	
	this.addPlayer = function(newPlayer) {
		this.players[0].stream.write(newPlayer.name + " has joined your game.\n"); 
		newPlayer.game = this;
		this.players.push(newPlayer);
	}
	
	return this;
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

function findAvailableGame() {
	for (var i = 0; i < games.length; i++) {
		var game = games[i];
		if (game.available()) {
			return game;
		};
	}
	
	return null;
}

function findGameForClient(client) {
	var game = findAvailableGame();
	
	if (game) {
		game.addPlayer(client);
	} else {
		game = Game(client);
		games.push(game);
	}
	
}

function processInput(client, data) {
	var command = data.match(/\S+/);
	var game = client.game;
	if (game.active()) {
		client.turn = command;
	} else {
		client.stream.write("Waiting for an opponent. \n");
	}
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
			return;
    }

		processInput(client, data);
	    
	 });	
		
});

server.listen(7000);