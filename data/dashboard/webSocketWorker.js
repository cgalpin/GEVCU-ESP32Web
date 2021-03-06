const heartbeatInterval = 5000;
const deadConnectionTimeout = 10000;
const reconnectDelay = 1000;

var socket = null;
var heartbeat = null;
var timestampLastReception = 0;

onmessage = function(event) {
	switch (event.data.cmd) {
	case 'start':
		console.log('webSocket start');
		setTimeout(function() {openWebSocket();}, 2000); // give the browser enough time to load other resources and create gauges
		break;
	case 'stop':
		console.log('webSocket stop');
		closeWebSocket();
		break;
	case 'message':
		socket.send(event.data.message);
		break;
	default:
		console.log("webSocket: received unknown command from parent: " + event.data.cmd);
	}
}

function openWebSocket() {
	if (heartbeat) {
		clearInterval(heartbeat);
		heartbeat = null;
	}
	if (socket == null) {
		var url = "ws://" + location.hostname + "/ws";
		console.log('webSocket: opening web socket connection ' + url);
		socket = new WebSocket(url);

		// Log errors and try to reconnect
		socket.onerror = function(error) {
			console.log('webSocket error: ' + error);
			closeWebSocket();
			setTimeout(function() {openWebSocket();}, reconnectDelay);
			timestampLastReception = new Date().getTime();
		};

		// process messages from the server
		socket.onmessage = function(message) {
			timestampLastReception = new Date().getTime();
			if (message.data !== "pong") {
				var data = JSON.parse(message.data);
				postMessage(data);
			}
		};
	}
	timestampLastReception = new Date().getTime();
	heartbeat = setInterval(checkConnection, heartbeatInterval);
}

function closeWebSocket() {
	console.log('webSocket: closing web socket connection');
	if (socket) {
		socket.close();
		socket = null;
	}
}

function checkConnection() {
	if (timestampLastReception + deadConnectionTimeout < new Date().getTime()) {
		postMessage({"logMessage": {"level": "WARNING","message": "websocket connection failure, trying to re-connect"}});
		closeWebSocket();
		setTimeout(function() {openWebSocket();}, reconnectDelay);
		timestampPong = new Date().getTime();
	}
	if (timestampLastReception + heartbeatInterval < new Date().getTime() && socket) {
		socket.send("ping");
	}
}