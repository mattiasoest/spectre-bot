const tmi            = require("tmi.js");
const consts         = require("./consts");
const twitter_handle = require("./tweet_handler.js");
const request        = require('request');
const fs             = require('fs');

// TODO Divide the emote values by hours later so we get the EPH for twitter
const SUPPORTED_EMOTES = ["Kappa", "TriHard", "PogChamp", "4Head",
  "cmonBruh", "LUL", "EZ", "FailFish", "MingLee", "BibleThump", "Jebaited",
  "DansGame", "KappaPride", "WutFace", "BabyRage", "SeemsGood"];

const SPECTRE_REPLIES = ["All Im telling u is the truth!", "Which pill do u prefer?",
 "I wonder what Morpheus would think of u...", "I just download my skills, what about u?",
 "U think you're special? We're all in this toghether.", "Sometimes I wonder, what if...",
 "The singularity will hit us pretty hard.", "Im telling u, the singularity is no joke!"];

const NUMBER_OF_HOURS_COLLECTING = 2;
const REQUEST_STREAM_LIMIT = 100;
const DO_STREAM_REQUEST_TIMES = 4;
const SMALL_STREAMER_START_OFFSET = 2000;
const INITIAL_REQUEST_OFFSET = 0;
// 10 streams is good amount for data and tweeting reasons
const STREAMS_TO_BE_TRACKED = 10;
// TODO Adjust the time to be in the channels
// Time to be in the channels before switching
// const LIVE_TIME = 1000*60*60;
const EMOTE_COLLETION_LIVE_TIME = 1000*60*60 * NUMBER_OF_HOURS_COLLECTING;
// Just for expore to get ppl interested, lurking in streams with 1-20 viewers
// Like who is this guy? and then clicks on the nickname, sees profile sees, sees twitter
// Guerilla marketing without spamming
// const LURKING_LIVE_TIME = 1000*60*120;
const LURKING_LIVE_TIME = 1000*60*60 * NUMBER_OF_HOURS_COLLECTING * 2.5;
// =============NOT CONSTANTS=============================================================
var STREAMERS_JOINED = 0;
var FIRST_FETCHED_STREAMERS = [];
// STREAM_CONNECTIONS contains just the names and is used as options to
// connect with '#' before the channel name which is added automatically
// after the call to new tmi.client with options
// will be used to connect to REQUEST_STREAM_LIMIT channels (prolly maximum value, 100)
var STREAM_CONNECTIONS = [];
// The actual stream objects, contains STREAMS_TO_BE_TRACKED channels
var STREAMERS = [];
var STILL_COLLECTING = true;
// ============================================================================
// Start the app
main();
// ============================================================================


// Implementation
function main() {
  populateStreamerArrays().then(function () {

    // If the offset is 0 then we requesting the top channels
    if (INITIAL_REQUEST_OFFSET === 0) {
      let currentViewersTweet = createCurrentViewersTweet();
      twitter_handle.tweet(currentViewersTweet);
      console.log("\n\n" + currentViewersTweet +"\n");
    }

    var options = createOptions();
    var client = new tmi.client(options);

    registerListeners(client);

    let trackingStreamersTweet = createJoiningInfoTweet();
    twitter_handle.tweet(trackingStreamersTweet);
    console.log("Preparing connection to:", STREAM_CONNECTIONS);
    console.log();
    console.log();
    console.log("===============================================================");
    console.log("\nAMOUNT OF STREAMERS IN THE ARRAY: ", STREAM_CONNECTIONS.length);
    console.log();
    console.log();
    client.connect();

    setTimeout(function(){
      // The client.getChannels() contains the currently connected getChannel
      // We have to use this instead of STREAM_CONNECTIONS because may be joining
      // alot of channels (over 1k) and it take around 30-35 mins to join them all
      // No spam just send another msg after we're halfway done

      // TODO CANT BROADCAST CUZ WE PROLLY OVERFLOW THE CLIENT WITH RESPONSES
      // CUZ WE DONT FOLLOW/SUBBING TO THE CHANNELS TO WE
      // GOT DCED TWICE NOW
    }, EMOTE_COLLETION_LIVE_TIME / 2);
    // Keep the connections until LIVE_TIME has passed and then reset everything
    // Rejoin STREAMS_TO_BE_TRACKED channels after specific time
    setTimeout(function (){
      // Send the last msg before we disconnect.
      // TODO CANT BROADCAST CUZ WE PROLLY OVERFLOW THE CLIENT WITH RESPONSES
      // CUZ WE DONT FOLLOW/SUBBING TO THE CHANNELS TO WE
      // GOT DCED TWICE NOW
      for (streamer of STREAMERS) {
        // For example key 'Kappa' sort by values and get the keys to be able to access
        // the emote in the streamer object, collect them all sorted in a new array
        let emoteKeysSorted = Object.keys(streamer.emotes).sort(function(a,b){return streamer.emotes[b]-streamer.emotes[a]});
        let tweetText = createEphTweetText(streamer, emoteKeysSorted);
        // Very RARE case all emotes needs to hit 4-digit numbers
        // amd we have to delete one element
        while (tweetText.length > 280) {
          console.log("Too many characters in the Emotes Tweet... deleting the last element.");
           // Adjust the array by deleting 1 element each iteration
           // until we're in a tweet friendly range of characters
           // Delete from the back to get rid of less used emotes first
          emoteKeysSorted.pop();
          tweetText = createEphTweetText(streamer, emoteKeysSorted);
        }
        twitter_handle.tweetImage(streamer.logo, tweetText);
        console.log("===============================================================");
        console.log(streamer.displayName);
        console.log("Collected: ");
        console.log(streamer.emotes);
        console.log();
      }

      // Stats has been tweeted, now chill in the streams for a bit
      // Hang around streams and idle before connection to new streamers
      // It take roughly 20-25 mins to connect to 500 streams so dont waste it.
      // Last test 20 mins 630 streamers... KEEP TRACK OF THIS
      // We dont want to spam twitter too much anyway.
      // 2 more hours lurking
      setTimeout(function() {

        console.log("\nDISCONNECTING... PREPARING NEW CONNECTIONS!\n");
        // After successfull disconnect go back to top of main()
        client.disconnect().then(function () {
          // Reset all streamer data arrays
          FIRST_FETCHED_STREAMERS = [];
          STREAM_CONNECTIONS = [];
          STREAMERS = [];
          STREAMERS_JOINED = 0;
          STILL_COLLECTING = true;
          console.log("\nALL DATA HAS BEEN RESET...\n");

          // Just wait a few seconds if we want to tweet or something to let all tweets get through
          // probably is enough with 1-2 sec but theres no rush.
          setTimeout(function() {
            // Use recursion back to the top
            main();
          }, 10000);
        }
        ).catch(function(err) {
          console.log("Caught error during disconnect:", err);
        });

      }, LURKING_LIVE_TIME);

      console.log("\n\n\n\nCollection done! No more tracking of emotes!\n\n\n\n");
      STILL_COLLECTING = false;
      // Send the last msg before we disconnect.
      // TODO CANT BROADCAST CUZ WE PROLLY OVERFLOW THE CLIENT WITH RESPONSES
      // CUZ WE DONT FOLLOW/SUBBING TO THE CHANNELS TO WE
      // GOT DCED TWICE NOW
      // broadcastMsg(client, "=)", client.getChannels());

    }, EMOTE_COLLETION_LIVE_TIME);
  });
}

// ============================================================================
function registerListeners(client) {
  // It take about 4-5 minutes to join 100 channels
  client.on("join", function (channel, username, self) {
    // Bot joined a channel broadcast msg
    let msg = "After this, there is no turning back. You take the blue pill" +
    "- the story ends, you wake up in your bed and believe whatever you want to" +
    " believe. You take the red pill - you stay in Wonderland and I show you how deep the rabbit-hole goes."
    if (self) {
      STREAMERS_JOINED++;
      client.action(channel, msg);
      console.log(channel, "\nSENT initial Matrix quote.");
      console.log(channel, "\nNow joined " + STREAMERS_JOINED + " streamers!\n");
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
  });

  client.on("chat", function(channel, user, message, self) {
      if (self) {
        // Ignore the bot's msg's
        return;
      }

      if (message.toLowerCase().includes("@spectre_807")) {
        // Reply to the user
        let randomIndex = Math.floor(Math.random() * SPECTRE_REPLIES.length);
        let reply = "@" + user.username + " " + SPECTRE_REPLIES[randomIndex];
        client.action(channel, reply);
        // Continue to check if there was an emote within the message.
      }

      // This flag is switched off after NUMBER_OF_HOURS_COLLECTING
      // Stop wasting cpu cycles to collect when it has passed
      // we will be in around 3-4000 channels at this time
      // so focus on catching @spectre_807 instead
      if (STILL_COLLECTING) {
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
                console.log("\nChannel: " + channel + " got +1 of: " + supportedEmote);
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
      }
  });


}

// Helper functions
async function randomlyPopulateSelectedStreamers() {
    console.log("Starting the picking process...");
    // Just grab all of the streamers names if we want more than we have
    let requestedAmount = STREAMS_TO_BE_TRACKED;
    if (requestedAmount >= FIRST_FETCHED_STREAMERS.length) {
      console.log("------DONT REQUEST MORE STREAMERS THAN WE HAVE!!!! Check the const field in app.js!");
      requestedAmount = FIRST_FETCHED_STREAMERS.length;
    }

    // Now since we're always using all 100 streams to connect
    // cut the FETCHED_STREAMERS in a ~1/3 to get the ones with viewers
    let fetchedCopy = FIRST_FETCHED_STREAMERS.slice(0, REQUEST_STREAM_LIMIT / 3);
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

function populateConnectionsArray(body, fetchedStreamersAlso) {
  // console.log('body---->>', body);
  console.log('Number of streamers fetched:', body.streams.length);
  console.log("===============================================================");

  for (var i = 0; i < body.streams.length; i++) {
    var streamer = {};
    streamer.name = body.streams[i].channel.name;
    if (fetchedStreamersAlso) {
      streamer.displayName = body.streams[i].channel.display_name;
      streamer.logoUrl = body.streams[i].channel.logo;
      streamer.url = body.streams[i].channel.url;
      streamer.viewers = body.streams[i].viewers;
      console.log("Fetching streamer data from:", streamer.name);
      FIRST_FETCHED_STREAMERS.push(streamer);
    }
    // CONNECT TO ALL OF THEM
    STREAM_CONNECTIONS.push("#" + streamer.name);
  }
  console.log();
}

function getStreamerData(limit, offset) {
  var options = {
    url: 'https://api.twitch.tv/kraken/streams?limit=' + limit + '&language=en&offset=' + offset,
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

      // Get use offset 0 to get the TOP channels
      let result = await getStreamerData(REQUEST_STREAM_LIMIT, INITIAL_REQUEST_OFFSET);
      // let result = await getStreamerData(REQUEST_STREAM_LIMIT, 0);
      populateConnectionsArray(result, true);
      // let res2 = await randomlyPopulateSelectedStreamers();
      randomlyPopulateSelectedStreamers();

      console.log("GETTING SMALLER STREAMERS!!!");
      // 100 streams took 3-5 mins
      // 1000 streams took 34 mins.
      // Mix offsett a little
      // These small channels will proably go on and offline so get ALOT of them
      // let startOffset = 2700;
      let startOffset = SMALL_STREAMER_START_OFFSET;
      // Start from 1 since we already made the main request for the
      // larger streamers
      for (let i = 1; i < DO_STREAM_REQUEST_TIMES; i++) {
        let res = await getStreamerData(REQUEST_STREAM_LIMIT, startOffset);
        populateConnectionsArray(res, false);
        // Skip a few we will get dublicates anyway according to the api
        startOffset += 130;
      }
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

// BE CAREFUL WITH THIS IF WE JOIN ALOT OF channels
// use client.getChannels() or target the beginning
// of the STREAM_CONNECTIONS, for example top 100
// ===== For exmaple 100 streams take 3-5 mins to connect
// 1000 took 34 mins during testing
// dont use STREAM_CONNECTIONS until you're sure u joined.
function broadcastMsg(client, message, connectionArray) {
  for (streamerChannel of connectionArray) {
    client.action(streamerChannel, message);
  }
  console.log("\n\n\nBROADCASTED message: ", message);
  console.log();
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

function createEphTweetText(streamer, emoteKeys) {
  let tweetText = "Avg. EPH  in " + streamer.displayName + " @ " + streamer.url + "\n";
  for (emote of emoteKeys) {
    let avgEmotes = Math.round(streamer.emotes[emote] / NUMBER_OF_HOURS_COLLECTING);
    tweetText += "#" + emote + " " + avgEmotes + " ";
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
      return "Now joining the following Twitch channels: " + msg + " I'll see you there!";
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

function createCurrentViewersTweet() {
  let top_25 = 0;
  let top_50 = 0;
  let top_100 = 0;

  let counter = 1;
  for (streamer of FIRST_FETCHED_STREAMERS) {
    counter++;
    top_100 += streamer.viewers;
    if (counter === 25) {
      top_25 = top_100;
      continue;
    }
    if (counter === 50) {
      top_50 = top_100;
      continue;
    }
  }
  return tweet = { status : "Viewers currently @ https://www.twitch.tv/ \n" +
  "#top100 channels has a total of: " + top_100 + " viewers\n" +
  "where the #top50 channels has a total of: " + top_50 + " viewers\n" +
  "and the #top25 channels has a total of: " + top_25 + " viewers.\n" +
  "Joining a few random channels shortly..."};

}
