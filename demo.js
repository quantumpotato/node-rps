var net = require("net");

var clients = [];

function Client(stream) {
  this.stream = stream;
}

var server = net.createServer(function (stream) {
  var client = new Client(stream);
  clients.push(client);

  stream.setTimeout(-1);
  stream.setEncoding("utf8");

  stream.addListener("connect", function () {
		process.nextTick(function() {
    	stream.write("Welcome!\n");
  	});		
	});
	
  stream.addListener("data", function (data) {
		var broadcast = data.match(/\S+/)[0];
		for (var i = 0; i < clients.length; i = i + 1) {
			var c = clients[i];
			c.stream.write(broadcast+"\n");
		}
	});
	
	process.on('uncaughtException', function (err) {
		console.log('WARNING! UNCAUGHT EXCEPTION: ' + err);
	});
		
});

server.listen(7000);