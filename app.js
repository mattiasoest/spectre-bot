const tmi            = require("tmi.js");
const consts         = require("./consts");
const twitter_handle = require("./tweet_handler.js");
const request        = require('request');
const fs             = require('fs');

const SUPPORTED_EMOTES = ["Kappa", "TriHard", "PogChamp", "4Head",
 "cmonBruh", "LUL", "EZ", "FailFish", "MingLee", "BibleThump", "Jebaited",
  "DansGame", "KappaPride", "WutFace", "BabyRage", "SeemsGood"];


const REQUEST_STREAM_LIMIT = 50;

// 10 streams is good amount for data and tweeting reasons
const STREAMS_TO_BE_TRACKED = 10;

// TODO Adjust the time to be in the channels
// Time to be in the channels before switching
// const LIVE_TIME = 1000*60*60;
const LIVE_TIME = 1000*60; // Dummy value for testing

var FETCHED_STREAMERS = [];
// STREAM_CONNECTIONS contains just the names and is used as options to
// connect with '#' before the channel name which is added automatically
// after the call to new tmi.client with options
// will be used to connect to REQUEST_STREAM_LIMIT channels (prolly maximum value, 100)
var STREAM_CONNECTIONS = [];

// The actual stream objects, contains STREAMS_TO_BE_TRACKED channels
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

    registerListeners(client);
    let trackingStreamersTweet = createJoiningInfoTweet();
    twitter_handle.tweet(trackingStreamersTweet);
    console.log("Preparing connection to:", STREAM_CONNECTIONS);
    console.log();
    console.log("===============================================================");
    client.connect();

    // Keep the connections until LIVE_TIME has passed and then reset everything
    // Rejoin STREAMS_TO_BE_TRACKED channels after specific time
    setTimeout(function (){
      for (streamer of STREAMERS) {
        // For example key 'Kappa' sort by values and get the keys to be able to access
        // the emote in the streamer object, collect them all sorted in a new array
        let emoteKeysSorted = Object.keys(streamer.emotes).sort(function(a,b){return streamer.emotes[b]-streamer.emotes[a]});
        let tweetText = createTweetText(streamer, emoteKeysSorted);
        // Very RARE case all emotes needs to hit 4-digit numbers
        // amd we have to delete one element
        while (tweetText.length > 280) {
          console.log("Too many characters in the Emotes Tweet... deleting the last element.");
           // Adjust the array by deleting 1 element each iteration
           // until we're in a tweet friendly range of characters
           // Delete from the back to get rid of less used emotes first
          emoteKeysSorted.pop();
          tweetText = createTweetText(streamer, emoteKeysSorted);
        }

        twitter_handle.tweetImage(streamer.logo, tweetText);
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
        FETCHED_STREAMERS = [];
        STREAM_CONNECTIONS = [];
        STREAMERS = [];

        console.log("After RESET: ", FETCHED_STREAMERS);
        console.log("After RESET: ", STREAM_CONNECTIONS);
        console.log("After RESET: ", STREAMERS);

        // Just wait a few seconds to let all tweets get through
        // before we tweet a new join tweet after the recursion call.
        // probably is enough with 1-2 sec but theres no rush.
        setTimeout(function() {
          // Use recursion back to the top
          main();
        }, 10000);
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

  client.on("join", function (channel, username, self) {
    // Bot joined broadcast msg
    if (self) {
      // client.action(streamerChannel, "Hello twitch chat!");
      // TODO just log for now.
      console.log(channel, "HELLO TWITCH CHAT =)");
    }
    else {
        // random users joined...
        // do something fun?
    }
  });

  // Adress looks something like
  // irc-ws.chat.twitch.tv
  client.on("connected", function(address, port){

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

// Helper functions
async function randomlyPopulateSelectedStreamers() {
    console.log("Starting the picking process...");
    // Just grab all of the streamers names if we want more than we have
    let requestedAmount = STREAMS_TO_BE_TRACKED;
    if (requestedAmount >= FETCHED_STREAMERS.length) {
      console.log("------DONT REQUEST MORE STREAMERS THAN WE HAVE!!!! Check the const field in app.js!");
      requestedAmount = FETCHED_STREAMERS.length;
    }
    //TODO MAYBE used the FETCHED_STREAMERS so we dont hold all the unsued data
    //TODO for unconnected streams until next random connection phase
    let fetchedCopy = FETCHED_STREAMERS.slice();
    while (requestedAmount > 0) {
      let randomIndex = Math.floor(Math.random() * fetchedCopy.length);
      // Pick random streamer and delete him at the same time
      // from the original array
      var streamerData = fetchedCopy.splice(randomIndex, 1)[0];
      console.log("Randomly picked streamer:" , streamerData.name);
      var updatedStreamer =  await addAdditionalAttributes(streamerData);
      // Add just the name to the array used to connect
      STREAMERS.push(updatedStreamer);
      console.log("PUSHED STREAMER DATA", updatedStreamer.displayName);
      console.log();
      requestedAmount--;
      }

      console.log();
}

function populateFetchedStreamers(body) {
  // console.log('body---->>', body);
  console.log('Number of streamers fetched:', body.streams.length);
  console.log("===============================================================");

  for (var i = 0; i < body.streams.length; i++) {
    let streamer = {};
    streamer.displayName = body.streams[i].channel.display_name;
    streamer.name = body.streams[i].channel.name;
    streamer.logoUrl = body.streams[i].channel.logo;
    streamer.url = body.streams[i].channel.url;
    console.log("Fetching streamer data from:", streamer.name);
    FETCHED_STREAMERS.push(streamer);
    // CONNECT TO ALL OF THEM
    STREAM_CONNECTIONS.push("#" + streamer.name);
  }
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
        reject("ERROR" + res.statusCode);
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
      let res2 = await randomlyPopulateSelectedStreamers();
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

async function addAdditionalAttributes(streamer) {
    try {
      console.log("Downloading logo for streamer :", streamer.name);
      var imageLogo = await downloadFile(streamer.logoUrl);
      streamer.logo = imageLogo;
    } catch (error) {
        console.log("Error:", error);
    }
    console.log("Downloading logo AFTER:", streamer.name);
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
    }
    streamer.emotes = emotes;
    return streamer;
}

function broadcastMsg(message, connectionArray) {
  for (streamerChannel of connectionArray) {
    // client.action(streamerChannel, "Hello twitch chat!");
    console.log(message, streamerChannel);
  }
}

function downloadFile(url) {
    var opts = {url, encoding: 'base64'}
    return new Promise(function(resolve, reject) {
      request(opts, function(err, res, body) {
        if (err) {
          console.log(err);  // Log the error if one occurred
          reject("ERROR code for image logo download" + res.statusCode);
          return;
        }
        else {
          console.log('statusCode for image logo download:', res.statusCode); // Print the response status code if a response was received
          resolve(body);
        }
        });
      });
}

function createTweetText(streamer, emoteKeys) {
  let tweetText = "Avg. EPH  in " + streamer.displayName + " @ " + streamer.url + "\n";
  // let tweetText = streamer.name + "\n";
  for (emote of emoteKeys) {
    tweetText += "#" + emote + " " + streamer.emotes[emote] + " ";
  }
  return tweetText
}

function createJoiningInfoTweet() {

    // Local helper function
    let createMsg = function(streamsArray) {
      let msg = "";
      for (streamer of streamsArray) {
        msg += "#" + streamer.name + " ";
      }
      return "Now joining the following Twitch channels: " + msg + " see you there!";
    }

  let tweetMsg = createMsg(STREAMERS);
  // Should not happen if dont go over 10 STREAMERS
  if (tweetMsg.length > 280) {
    console.log("The joining tweet was too long, starting to cut the string.");
    let streamersCopy = STREAMERS.slice();
    // Still want to join all the channels just dont tweet out them all
    while (tweetMsg.length > 280) {
      console.log("REMOVED 1 element from the joining tweet.");
      streamersCopy.pop();
      // Overwrite the msg with the new array
      tweetMsg = createMsg(streamersCopy);
    }
  }
  return tweet = {
    status : tweetMsg
  }
}
