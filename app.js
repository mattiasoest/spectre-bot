var tmi = require("tmi.js");
var consts =  require("./consts"); // no need for .js
const request = require('request');

const SUPPORTED_EMOTES = ["Kappa", "TriHard", "PogChamp", "4Head",
 "cmonBruh", "LUL", "EZ", "FailFish", "MingLee", "BibleThump", "Jebaited",
  "DansGame", "KappaPride", "WutFace", "BabyRage", "SeemsGood", "MrDestructoid", "PixelBob"];


const REQUEST_STREAM_LIMIT = 5;
const STREAMS_TO_BE_JOINED = 3;
// Time to be in the channels before switching
// const LIVE_TIME = 1000*60*60;
const LIVE_TIME = 1000*10; // Dummy value for testing

var FETCHED_STREAMERS = [];
// STREAM_CONNECTIONS contains just the names and is used as options to
// connect with '#' before the channel name which is added automatically
// after the call to new tmi.client with options
var STREAM_CONNECTIONS = [];
// The actual stream objects
var STREAMERS = [];

// ============================================================================
// Start the app
main();
// ============================================================================


// Implementation
function main() {

  populateStreamerArrays().then(function () {
    var options = createOptions();
    var client = new tmi.client(options);
    console.log("Preparing connection to:", STREAM_CONNECTIONS);
    console.log();
    console.log("===============================================================");
    client.connect();
    registerListeners(client);
    // Keep the connections until LIVE_TIME has passed and then reset everything
    // Rejoin STREAMS_TO_BE_JOINED channels after specific time
    setTimeout(function (){
      // TODO TWEET THE STATS AND THEN JOIN NEW TWITCH CHANNELS
      // Just log it for now
      for (streamer of STREAMERS) {
        console.log("===============================================================");
        console.log(streamer.displayName);
        console.log("Collected: ");
        console.log(streamer.emotes);
        console.log();
      }

      console.log("\nDISCONNECTING... PREPARING NEW CONNECTIONS!\n");
      // After successfull disconnect go back to top of main()
      client.disconnect().then(function () {

        // Reset all streamer data arrays
        var FETCHED_STREAMERS = [];
        var STREAM_CONNECTIONS = [];
        var STREAMERS = [];

        main();
        }
      ).catch(function(err) {
        console.log("Caught error during disconnect:", err);
          //
      });
    }, LIVE_TIME);

  });
}

// ============================================================================
function registerListeners(client) {
  client.on("connected", function(address, port){
    console.log("Connected...");
    // client.action("<name>", "Hello twitch chat!");
  });

  client.on('disconnected', function(reason){
    console.log("Disconnected:", reason)
  })

  client.on("chat", function(channel, user, message, self) {
      if (self) {
        // Ignore the bot's msg's
        return;
      }
      // Looks ugly but both arrays are bounded by
      // pre-defined constants so the loops are executed in O(1) time
      // message.includes is upper bound
      for (streamer of STREAMERS) {
        let currentChannelName = "#" + streamer.name;
        if (currentChannelName === channel) {
          for (supportedEmote of SUPPORTED_EMOTES) {
            if (message.includes(supportedEmote)) {
              // Its an supported emote, add +1 to the current channel
              streamer.emotes[supportedEmote]++;
              console.log();
              console.log("Channel: " + channel + "got +1 of: " + supportedEmote);
              console.log("Currently has a total of: " + streamer.emotes[supportedEmote]);
              console.log();
            }
            else {
              // Normal msg... do something fun
              //TODO commands??
            }
          }
        }
      }
  });
}
// Helper founctions

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
    streamer.displayName = body.streams[i].channel.display_name;
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
    let emotes = {
        "Kappa": 0
      , "TriHard": 0
      , "PogChamp": 0
      , "4Head": 0
      , "cmonBruh": 0
      , "LUL": 0
      , "EZ": 0
      , "FailFish": 0
      , "MingLee": 0
      , "BibleThump": 0
      , "Jebaited": 0
      , "DansGame": 0
      , "KappaPride": 0
      , "WutFace": 0
      , "BabyRage": 0
      , "SeemsGood": 0
      , "MrDestructoid": 0
      , "PixelBob": 0
    }
    streamer.emotes = emotes;
    // streamer.kappaCount = 0;
    // streamer.trihardCount = 0;
    // streamer.pogchampCount = 0;
    // streamer.fourheadCount = 0;
    // streamer.cmonbruhCount = 0;
    // streamer.lulCount = 0;
    // streamer.ezCount = 0;
    // streamer.mingLeeCount = 0;
    // streamer.bibleThumpCount = 0;
    // streamer.jebaitedCount = 0;
    // streamer.dansGameCount = 0;
    // streamer.kappaPride = 0;
    // streamer.wutFaceCount = 0;
    // streamer.babyRageCount = 0;
    // streamer.seemsGoodCount = 0;
    // streamer.mrdestructroid = 0;
    // streamer.pixelBobCount = 0;
}
