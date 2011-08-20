var net = require("net");

var clients = [];
var games 	= [];

function Rock() {
	this.evaluateChoice = function(choice) {
		if (choice === "r") {
			return "draw";
		} else if (choice === "p") {
			return "loss";
		} else if (choice === "s") {
			return "win";
		}
	}
}

function Paper() {
	this.evaluateChoice = function(choice) {
		if (choice === "r") {
			return "win";
		} else if (choice === "p") {
			return "draw";
		} else if (choice === "s") {
			return "loss";
		}
	}
}

function Scissors() {
	this.evaluateChoice = function(choice) {
		if (choice === "r") {
			return "loss";
		} else if (choice === "p") {
			return "win";
		} else if (choice === "s") {
			return "draw";
		}
	}
}

function Client(stream) {
  this.stream = stream;
	this.name = null;
	this.game = null;
	this.choice = null;
	this.getChoiceObject = function() {
		if (this.choice === "r") {
			return new Rock();
		} else if (this.choice === "p") {
			return new Paper();
		} else if (this.choice === "s") {
			return new Scissors();
		}
	}
	
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

	this.processResult = function(result) {
		if (result === "win") {
			this.players[0].stream.write("Victory! You defeated " + this.players[1].name + "\n");
			this.players[1].stream.write("Defeat! You lost to " + this.players[0].name + "\n");
		} else if (result === "loss") {
			this.players[1].stream.write("Victory! You defeated " + this.players[0].name + "\n");
			this.players[0].stream.write("Defeat! You lost to " + this.players[1].name + "\n");			
		} else if (result === "draw") {
			this.players[0].stream.write("Draw game! Choose again wisely.\n");			
			this.players[1].stream.write("Draw game! Choose again wisely.\n");
		}

		this.finish();
	}

	this.finish = function() {
		this.players[0].choice = null;
		this.players[1].choice = null;
	}
	
	this.isActive = function() {
		if (this.players.length === 2) {
			return true;
		}
		
		return false;
	}
	
	this.bothPlayersHaveDecided = function() {
		console.log("player 0 choice: + " + this.players[0].choice);
		console.log("player 1 choice: + " + this.players[1].choice);
		if (this.players[0].choice != null && this.players[1].choice != null) {
			return true;
		}
		
		return false;
	}
	
	this.evaluateChoices = function() {
		var result = this.players[0].getChoiceObject().evaluateChoice(this.players[1].choice);
		return result;
	}
	
	this.startGame = function() {
		promptForMove(this.players[0]);
		promptForMove(this.players[1]);
	}
	
	this.addSecondPlayer = function(newPlayer) {
		this.players[0].stream.write(newPlayer.name + " has joined your game.\n"); 
		newPlayer.game = this;
		this.players.push(newPlayer);
	}
	
	this.announce = function(announcement) {
		this.players[0].stream.write(announcement);
		this.players[1].stream.write(announcement);
	}
	
	return this;
}

function promptForMove(client) {
	client.choice = null;
	client.stream.write("Enter r, p or s \n");
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
		game.addSecondPlayer(client);
		game.startGame();
	} else {
		game = Game(client);
		games.push(game);
	}
}

function validRPSChoice(choice) {
	return (choice === "r" || choice === "p" || choice === "s");
}

function processInput(player, data) {
	var rpsChoice = data.match(/\S+/)[0];
	console.log(player.name + " chose " + rpsChoice);
	console.log("valid choice? " + validRPSChoice(rpsChoice));
	
	player.choice = null;
	if (validRPSChoice(rpsChoice)) {
		player.choice = rpsChoice;
		var game = player.game;
		if (game.isActive() && game.bothPlayersHaveDecided()) {
			var result = game.evaluateChoices();

			console.log("result: " + result);
			game.processResult(result);
		} else {
			player.stream.write("Waiting for your opponent to choose. \n");
		}
	} else {
		player.stream.write("Please enter r, p or s for your choice. \n");
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
    if (client.name === null) {
			process.nextTick(function() {
				nameClient(client, data, findGameForClient)
			});
			return;
    }

		processInput(client, data);
	    
	 });			
});

server.listen(7000);