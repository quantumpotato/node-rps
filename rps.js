var net = require("net");

var clients = [];
var games 	= [];
var events = require('events');
var eventEmitter = new events.EventEmitter();

var lineEnd = "\n> ";
var arrowPrompt = "> ";

function StreamHandler() {
	this.addMessage = function(player, message) {
		player.messages.push(message);
	}
	
}

function CommunicationHandler() {
	this.processResult = function(game, result){
		if (result === "win") {
			//Refactor to winner/loser message		
			//Refactor parallel: winner/lose message (instead of game.players[#])
			game.players[0].stream.write("Victory! You defeated " + game.players[1].name + lineEnd);
			game.players[1].stream.write("Defeat! You lost to " + game.players[0].name + lineEnd);
		} else if (result === "loss") {
			game.players[1].stream.write("Victory! You defeated " + game.players[0].name + lineEnd);
			game.players[0].stream.write("Defeat! You lost to " + game.players[1].name + lineEnd);			
		} else if (result === "draw") {
			game.players[0].stream.write("Draw game! Choose again wisely." + lineEnd);			
			game.players[1].stream.write("Draw game! Choose again wisely." + lineEnd);
		}
	}
	
	this.broadcast = function(game, message) {
		game.players[0].stream.write(message + lineEnd);
		game.players[1].stream.write(message + lineEnd);
	}
	
	this.secondPlayerJoining = function(game, newPlayer) {
		game.players[0].stream.write("\n" + newPlayer.name + " has joined your game" + lineEnd); 
		newPlayer.stream.write("Joined game with " + game.players[0].name + lineEnd);
		game.players[0].stream.pipe(process.stdout)
	}
	
	this.chat = function(player, chat) {
		var game = player.game;
		var otherplayer;
		if (player == game.players[0]) {
			otherplayer = game.players[1];
		} else {
			otherplayer = game.players[0];
		}
		
		if (otherplayer) {
			chat = chat.substring(0, chat.length-1);
			otherplayer.stream.write("\n" + player.name + ": " + chat + lineEnd);
		}
	}
	
}

function GameStateHandler() {
	this.processResult = function(game, result) {
		game.finish();
	}
	
	this.secondPlayerJoining = function(game, newPlayer) {
		game.addSecondPlayer(newPlayer);
	}
	
	this.playersHaveDecided = function(game) {
		game.evaluateChoices();
	}
}

var communicationHandler = new CommunicationHandler();
eventEmitter.on("resultEvaluated", communicationHandler.processResult);
eventEmitter.on("addSecondPlayerToGame", communicationHandler.secondPlayerJoining);
eventEmitter.on("chat", communicationHandler.chat);

var gameStateHandler = new GameStateHandler();
eventEmitter.on("resultEvaluated", gameStateHandler.processResult);
eventEmitter.on("addSecondPlayerToGame", gameStateHandler.secondPlayerJoining);


eventEmitter.on("choiceValidated", processValidChoice);
eventEmitter.on("availableGameFound",processAvailableGame);
eventEmitter.on("playerNamed", findAvailableGame);
eventEmitter.on("gameBroadcast",communicationHandler.broadcast);
eventEmitter.on("playersHaveDecided",gameStateHandler.playersHaveDecided);

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
	
	return this;
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
	
	return this;
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
	
	return this;
}

function Client(stream) {
	this.messages = [];
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
	
	this.addMessage = function(message) {
		this.messages.push(message);
	}
	
	this.processMessages = function() {
		for (var i = this.messages.length -1; i >= 0; i--) {
			var message = this.messages[i];
			this.stream.write(message);
			this.messages.pop();
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

	this.finish = function() {
		console.log("game finished");
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
		console.log("player 0 choice: " + this.players[0].choice);
		console.log("player 1 choice: " + this.players[1].choice);
		if (this.players[0].choice != null && this.players[1].choice != null) {
			return true;
		}
		
		return false;
	}
	
	this.evaluateChoices = function() {
		var result = this.players[0].getChoiceObject().evaluateChoice(this.players[1].choice);
		eventEmitter.emit("resultEvaluated",this, result);
	}
	
	this.addSecondPlayer = function(newPlayer) {
		this.players.push(newPlayer);
		newPlayer.game = this;
		eventEmitter.emit("gameBroadcast",this,"Please enter r, p or s");		
	}
	
	return this;
}

function nameClient(client, data) {
	var name = data.match(/\S+/);
	if (name){
		client.name = data.match(/\S+/)
	} else {
		client.name = "anonymous";
	}
  clients.forEach(function(c) {
    process.nextTick(function() {
			if (c != client) {
					c.stream.write(client.name + " has joined the server." + lineEnd);	  
	    }
		});
  });

	client.stream.write(arrowPrompt);
	eventEmitter.emit("playerNamed", client);
}

function findAvailableGame(player) {
	
	//Todo: make this asynchronously awesome?
	var availableGame = null;
	for (var i = 0; i < games.length; i++) {
		var game = games[i];
		if (game.available()) {
			availableGame = game;
		};
	}
	
	eventEmitter.emit("availableGameFound", player, availableGame);
}

function processAvailableGame(client, game) {
	if (game) {
		eventEmitter.emit("addSecondPlayerToGame", game, client);
	} else {
		game = new Game(client);
		games.push(game);
	}
}

function validateRPSChoice(player, data) {
	var choice = data.match(/\S+/)[0];
	console.log(player.name + " chose " + choice);	
	if (choice === "r" || choice === "p" || choice === "s") {
		eventEmitter.emit("choiceValidated", player, choice);
	} else {
		process.nextTick(function(){
			player.stream.write("Please choose r, p or s." + lineEnd);
		});
	}
}

function processValidChoice(player, choice) {
	player.choice = choice;		
	player.stream.write("You chose " + choice + lineEnd);
	var game = player.game;
	if (game.isActive() && game.bothPlayersHaveDecided()) {
		eventEmitter.emit("playersHaveDecided", game);
	}
}

function inputIsRPSMove(input) {
	input = input.match(/\S+/);
	if (input) {
		input = input[0];
	}
	if (input === "r" || input === "p" || input === "s") {
		return true;
	}
	
	return false;
}

function processInput(player, data) {
	//Leaving process input here because we may not want to do other actions besides validateRPSChoice
	//For some reason, processNextTick here fails!
// 	var input = data.match(/\S+/);

	player.addMessage("Message 1\n");
	player.addMessage("Message 2\n");
	player.processMessages();

	var input = data;
	if (inputIsRPSMove(input)) {
		validateRPSChoice(player, data);	
	} else {
		eventEmitter.emit("chat", player, input);
		player.stream.write(arrowPrompt);
	}
	
//	player.stream.write(arrowPrompt);
}

var server = net.createServer(function (stream) {
  var client = new Client(stream);
  clients.push(client);

  stream.setTimeout(0);
  stream.setEncoding("utf8");

  stream.addListener("connect", function () {
    	stream.write("Welcome! Please enter your name\n> ");
	});
	
	stream.addListener("data", function (data) {
    if (client.name === null) {
				nameClient(client, data);
				return;
    }

		processInput(client, data);    
	 });			
	
//	process.on('uncaughtException', function (err) {
//		console.log('WARNING! UNCAUGHT EXCEPTION: ' + err);
//	});
	
});

server.listen(7000);