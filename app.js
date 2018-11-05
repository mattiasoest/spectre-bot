var tmi = require("tmi.js");
var consts =  require("./consts"); // no need for .js
var options = {
  options : {
    debug : true
  },
  connection : {
    reconnect : true
  },
  identity : {
    username : "spectre_807",
    password : consts.twitchPass
  },
  channels : ["GhettoProgrammer"]
}

var kappaCount = 0;
var client = new tmi.client(options);
client.connect();

client.on("connected", function(address, port){
  client.action("GhettoProgrammer", "Hello twitch chat!");
});

client.on("chat", function(channel, user, message, self) {

  console.log(channel);
  let responseMsg = "";
  switch (channel.toUpperCase()) {
    case '#GHETTOPROGRAMMER':
        console.log("GhettoProgrammer's channel");
        if (message === "Kappa") {
          kappaCount++;
          responseMsg = "Current Kappa count : " + kappaCount;
          client.action("GhettoProgrammer", responseMsg);
        }
        else if (message.toUpperCase() === "HI") {
          responseMsg = "Hi @" + user['display-name'];
          client.action("GhettoProgrammer", responseMsg);
        }
      break;
      case '#RANDOMCHANNEL':
        console.log("GhettoProgrammer's channel");
      break;
    default:
  }
});
