var tmi = require("tmi.js");
var consts =  require("./consts"); // no need for .js
const request = require('request');
const REQUEST_STREAM_LIMIT = 5;
const STREAMS_TO_BE_JOINED = 2;
// setInterval(function() {
var FETCHED_STREAMERS = [];
var SELECTED_STREAMERS = [];
var STREAM_OBJECTS = [];
  //clearTimeout(); to break the interval
  // for example if the channel is offline

  populateStreamerArrays().then(function () {
  var options = createOptions();

  createStreamers();
  var kappaCount = 0;
  var client = new tmi.client(options);
  console.log("Preparing connection to:", SELECTED_STREAMERS);
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
    console.log(`[${channel} (${user['message-type']})] ${user.username}: ${message}`);
  });
// }, 10000);
})
// ============================================================================


function randomlyPopulateSelectedStreamers() {
    console.log("Starting the picking process...");
    // Just return all of the streamers if we want more than we have
    let requestedAmount = STREAMS_TO_BE_JOINED;
    if (requestedAmount >= FETCHED_STREAMERS.length) {
      SELECTED_STREAMERS = FETCHED_STREAMERS.slice();
      return;
    }
    let fetchedCopy = FETCHED_STREAMERS.slice();
    // let pickedElements = [];
    while (requestedAmount > 0) {
      let randomIndex = Math.floor(Math.random() * fetchedCopy.length);
      // Pick random streamer and delete him at the same time
      // from the original array
      let elementToBeAdded = fetchedCopy.splice(randomIndex, 1)[0];
      SELECTED_STREAMERS.push(elementToBeAdded);
      // pickedElements.push(elementToBeAdded);
      console.log("Randomly picked streamer:" , elementToBeAdded);
      requestedAmount--;
    }
    console.log();
}
function populateFetchedStreamers(body) {
  // console.log('body---->>', body);
  console.log('Number of streamers fetched:', body.streams.length);
  console.log("===============================================================");

  for (var i = 0; i < body.streams.length; i++) {
    let streamer = body.streams[i].channel.name;
    console.log("Adding streamer:", streamer);
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
    channels : SELECTED_STREAMERS
  }
}

function createStreamers() {
  for (streamerName of SELECTED_STREAMERS) {
    let streamer = {};
    streamer.name = streamerName;
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
    STREAM_OBJECTS.push(streamer);
  }
  console.log("Created streamer objects:", STREAM_OBJECTS);
}
