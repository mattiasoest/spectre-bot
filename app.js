var tmi = require("tmi.js");
var consts =  require("./consts"); // no need for .js
const request = require('request');
const REQUEST_STREAM_LIMIT = 5;
const STREAMS_TO_BE_JOINED = 2;
// setInterval(function() {

var FETCHED_STREAMERS = [];
// Contains just the names and is used as options to connect
var STREAM_CONNECTIONS = [];
// The actual stream objects
var STREAMERS = [];
  //clearTimeout(); to break the interval
  // for example if the channel is offline

  populateStreamerArrays().then(function () {
  var options = createOptions();
  var client = new tmi.client(options);
  console.log("Preparing connection to:", STREAM_CONNECTIONS);
  console.log();
  console.log("===============================================================");
  client.connect();
  client.on("connected", function(address, port){
    console.log("Connected...");
    // console.log("Joined the channels:", SELECTED_STREAMERS);
    // client.action("GhettoProgrammer", "Hello twitch chat!");
  });

  client.on('disconnected', function(reason){
    console.log("Disconnected:", reason)
    process.exit(1)
  })

  client.on("chat", function(channel, user, message, self) {
      if (self) {
        // Ignore the bot's msg's
        return;
      }

    // console.log(channel);
    // let responseMsg = "";
    // switch (channel.toUpperCase()) {
    //   case '#GHETTOPROGRAMMER':
    //       console.log("GhettoProgrammer's channel");
    //       if (message === "Kappa") {
    //         kappaCount++;
    //         responseMsg = "Current Kappa count : " + kappaCount;
    //         client.action("GhettoProgrammer", responseMsg);
    //       }
    //       else if (message.toUpperCase() === "HI") {
    //         responseMsg = "Hi @" + user['display-name'];
    //         client.action("GhettoProgrammer", responseMsg);
    //       }
    //     break;
    //   default:
    // }

    // console.log(channel + ": " + user + ": " + message);
    // console.log(`[${channel} (${user['message-type']})] ${user.username}: ${message}`);
  });
// }, 10000);
})
// ============================================================================


function randomlyPopulateSelectedStreamers() {
    console.log("Starting the picking process...");
    // Just grab all of the streamers names if we want more than we have
    let requestedAmount = STREAMS_TO_BE_JOINED;
    if (requestedAmount >= FETCHED_STREAMERS.length) {
      FETCHED_STREAMERS.forEach((streamer) => STREAM_CONNECTIONS.push(streamer.name));
    }
    else {
      //TODO MAYBE used the FETCHED_STREAMERS so we dont hold all the unsued data
      //TODO for unconnected streams until next random connection phase
      let fetchedCopy = FETCHED_STREAMERS.slice();
      while (requestedAmount > 0) {
        let randomIndex = Math.floor(Math.random() * fetchedCopy.length);
        // Pick random streamer and delete him at the same time
        // from the original array
        let streamerData = fetchedCopy.splice(randomIndex, 1)[0];
        addAdditionalAttributes(streamerData);
        // Add just the name to the array used to connect
        STREAM_CONNECTIONS.push(streamerData.name);
        STREAMERS.push(streamerData);
        console.log("Randomly picked streamer:" , streamerData.name);
        requestedAmount--;
      }
      console.log();
  }
}
function populateFetchedStreamers(body) {
  // console.log('body---->>', body);
  console.log('Number of streamers fetched:', body.streams.length);
  console.log("===============================================================");

  for (var i = 0; i < body.streams.length; i++) {
    let streamer = {};
    streamer.name = body.streams[i].channel.name;
    streamer.logo = body.streams[i].channel.logo;
    streamer.url = body.streams[i].channel.url;
    console.log("Fetching streamer data from:", streamer.name);
    FETCHED_STREAMERS.push(streamer);
  }
  console.log();
  console.log("Fetched streamer list now contains:", FETCHED_STREAMERS);
  console.log();
}

function getStreamerData(limit) {
  var options = {
    url: 'https://api.twitch.tv/kraken/streams?limit=' + limit + '&language=en',
    json: true,
    headers: {
        'Client-ID': consts.clientId
      }
  };

  return new Promise(function(resolve, reject) {
    request(options, function(err, res, body) {
      if (err) {
        console.log(err);  // Log the error if one occurred
        reject("ERROR" + response.statusCode);
        return;
      }
      else {
        console.log('statusCode:', res.statusCode); // Print the response status code if a response was received
        console.log();
        resolve(body);
      }
      });
    });
}

async function populateStreamerArrays() {
  try {
      let result = await getStreamerData(REQUEST_STREAM_LIMIT);
      populateFetchedStreamers(result);
      randomlyPopulateSelectedStreamers();;
  } catch (error) {
      console.log("Error:", error);
  }
  return;
}

function createOptions() {
  return options = {
    options : {
      debug : true
    },
    connection : {
      reconnect : true
    },
    identity : {
      username : consts.userName,
      password : consts.twitchPass
    },
    channels : STREAM_CONNECTIONS
  }
}

function addAdditionalAttributes(streamer) {
    streamer.kappaCount = 0;
    streamer.trihardCount = 0;
    streamer.pogchampCount = 0;
    streamer.fourheadCount = 0;
    streamer.cmonbruhCount = 0;
    streamer.lulCount = 0;
    streamer.hahaaCount = 0;
    streamer.sourplsCount = 0;
    streamer.feeldgoodmanCount = 0;
    streamer.feelsbadmanCount = 0;
    streamer.gachigasmCount = 0;
    streamer.monkasCount = 0;
    streamer.poggersCount = 0;
    streamer.pepehandsCount = 0;
    streamer.mrdestructroid = 0;
    streamer.jebaitedCount = 0;
}
