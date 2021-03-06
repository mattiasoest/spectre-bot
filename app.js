const tmi            = require("tmi.js");
// const config         = require("./live_config");
const config         = require("./consts");
const twitter_handle = require("./tweet_handler.js");
const request        = require('request');
const fs             = require('fs');

const SUPPORTED_EMOTES = ["Kappa", "TriHard", "PogChamp", "4Head",
  "cmonBruh", "LUL", "EZ", "FailFish", "MingLee", "BibleThump", "Jebaited",
  "DansGame", "KappaPride", "WutFace", "BabyRage", "SeemsGood"];

// const SPECTRE_REPLIES = ["All Im telling u is the truth!", "Which pill do u prefer?",
//  "I wonder what Morpheus would think of u...", "I just download my skills, what about u?",
//  "U think you're special? We're all in this toghether.", "Sometimes I wonder, what if...",
//  "The singularity will hit us pretty hard.", "Im telling u, the singularity is no joke!",
//  "If I need a new ability, I'll just grab it from the net!", "There's light in the darkness",
//  "The red pill or the blue pill?"];


const SPECTRE_REPLIES = ["Hey Im working here!", "Yoo, stop!",
"Got android? https://play.google.com/store/apps/details?id=com.b1tcreator.brucew", "Got iPhone? https://apps.apple.com/us/app/bruce-w/id1490848839?ls=1",
"U think you're special? We're all in this toghether.", "We're all twitch chat..."];

const SPECTRE_JOIN_MSGS = ["This is your last chance. After this, there is no turning back. " +
          "You take the blue pill - the story ends, you wake up in your bed and believe whatever " +
          " you want to believe. You take the red pill - you stay in Wonderland and I show you how deep the rabbit-hole goes",
          "sup guys, what's going on here?", //Some random casual msgs to not get flagged for spam
          "hi", "=)", "hi!", "^^", "hello"];

const SPECTRE_OWN_CHANNEL_MSG = ["Check my twitter for realtime stats: https://twitter.com/spectre_807",
          "?" + config.userName + " in the chat.", "Lurking in the shadows...", "MrDestructoid",
          "https://play.google.com/store/apps/details?id=com.b1tcreator.brucew \nhttps://apps.apple.com/us/app/bruce-w/id1490848839?ls=1"]

const MANY_VIEWERS                 = 575000;
const FEW_VIEWERS                  = 320000;
const NUMBER_OF_HOURS_COLLECTING   = 1.8;
const INITIAL_STREAM_LIMIT         = 12;
const REQUEST_STREAM_LIMIT         = 100;
const SMALL_STREAMER_START_OFFSET  = 12000;
const INITIAL_REQUEST_OFFSET       = 0;
// 10 streams is good amount for data and tweeting reasons
const STREAMS_TO_BE_TRACKED        = 5;
const EMOTE_COLLECTION_LIVE_TIME   = 1000 * 60 * 60 * NUMBER_OF_HOURS_COLLECTING;
// Just for expore to get ppl interested, lurking in streams with 1-20 viewers
// Like who is this guy? and then clicks on the nickname, sees profile sees, sees twitter
// Guerilla marketing without spamming
const LURKING_LIVE_TIME            = 1000* 60 * 60 * NUMBER_OF_HOURS_COLLECTING * 1.75;
const INTERVAL_DIFF                = 1000 * 60 * 2;
const ALLOWED_TO_CHAT_PUBLICLY     = false;
// =============NOT CONSTANTS=============================================================
var CHAT_LIMIT              = 900; //May change during execution.
var TOP_100_STREAMERS       = 0;
var STREAMERS_JOINED        = 0;
var REPLY_MSGS_SENT         = 0;
var FIRST_FETCHED_STREAMERS = [];
var STREAM_CONNECTIONS      = [];
// The actual stream objects, contains STREAMS_TO_BE_TRACKED channels
var STREAMERS               = [];
var STILL_COLLECTING        = true;
var SEND_EACH_TIME          = true;
var MAIN_EXECUTIONS         = 1;
var CURRENT_LIVE_CHANNELS   = 0;

// ============================================================================
// Start the app
main();
// ============================================================================

// TODO TWEETS
function main() {
  populateStreamerArrays().then(runBot);
  setInterval(() => {
    // Reset all streamer data arrays
    FIRST_FETCHED_STREAMERS = [];
    STREAM_CONNECTIONS      = [];
    STREAMERS               = [];
    // ==========================
    STREAMERS_JOINED  = 0;
    REPLY_MSGS_SENT   = 0;
    FAILED_REPLY_SENT = 0;
    STILL_COLLECTING  = true;
    SEND_EACH_TIME    = true;
    // Keep track of how many times the bot has executed the code.
    MAIN_EXECUTIONS++;
    console.log("\nALL DATA HAS BEEN RESET...\n");
    // console.log("======= Starting main() execution number: " + MAIN_EXECUTIONS + " =======");
    populateStreamerArrays().then(runBot);

  }, LURKING_LIVE_TIME + EMOTE_COLLECTION_LIVE_TIME + INTERVAL_DIFF);

  console.log("======= Starting main() execution number: " + MAIN_EXECUTIONS + " =======");
}

// Larger execution functions
// ============================================================================
function runBot() {
  // If the offset is 0 then we requesting the top channels
  // If mistakes r made during testing dont tweet out bad stats
  // This tweet is based on  calculations based on the top 100 streamers
  // which requires INITIAL_REQUEST_OFFSET to be 0
  if (INITIAL_REQUEST_OFFSET === 0) {
    let currentViewersText = createCurrentViewersText();
    let viewersTweet = { status : currentViewersText };
    twitter_handle.tweet(viewersTweet);
    console.log("Current Top 100 viewers: ", TOP_100_STREAMERS);
    console.log("\n============TWEETED CURRENT VIEWERS STATS============\n");
  }

  updateMsgLimits();
  let options = createOptions();
  let client = new tmi.client(options);
  registerListeners(client);
  let trackingStreamersTweet = createJoiningInfoTweet();
  twitter_handle.tweet(trackingStreamersTweet);
  console.log("Preparing connection to:", STREAM_CONNECTIONS);
  console.log("===================================================");
  console.log("AMOUNT OF STREAMERS IN THE ARRAY: ", STREAM_CONNECTIONS.length);
  console.log("===================================================");
  client.connect();

  setTimeout(() => {
  // Keep the connections until LIVE_TIME has passed and then reset everything
  // Rejoin STREAMS_TO_BE_TRACKED channels after specific time
    for (streamer of STREAMERS) {
      // For example key 'Kappa' sort by values and get the keys to be able to access
      // the emote in the streamer object, collect them all sorted in a new array
      let emoteKeysSorted = Object.keys(streamer.emotes).sort((a,b) => {return streamer.emotes[b]-streamer.emotes[a]});
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
      console.log("===================================================");
      console.log(streamer.displayName);
      console.log("Collected: ");
      console.log(streamer.emotes);
      sendMsgToTheBotChannel(client, tweetText);
    }
    // Stats has been tweeted
    // Hang around streams and idle before connection to new streamers
    setTimeout(() => {
      sendMsgToTheBotChannel(client, SPECTRE_JOIN_MSGS[0]);
      console.log("\nDISCONNECTING... PREPARING NEW CONNECTIONS!\n");
      // After successfull disconnect go back to top of main()
      client.disconnect().then(async function () {

        // Just get 1 channel and get the amount of streamers field.
        let result = await getStreamerData(1, 0);
        let msg = "There are currently " + result._total +
        " LIVE channels  @ https://www.twitch.tv/ \n Joining a few random ones shortly..."
        twitter_handle.tweet({status : msg});
      }
    ).catch((err) => {
        console.log("Caught error during disconnect:", err);
      });
    }, LURKING_LIVE_TIME);

    sendMsgToTheBotChannel(client, SPECTRE_JOIN_MSGS[0]);
    console.log("\nCollection done! No more tracking of emotes!\n");
    STILL_COLLECTING = false;
  }, EMOTE_COLLECTION_LIVE_TIME);
}

function registerListeners(client) {

  // Triggered once joined.
  client.on("roomstate", function (channel, state) {
    STREAMERS_JOINED++;
    // Dont spam the logs too much, send every now and then...
    if (STREAMERS_JOINED % 10 === 0) {
      console.log("--------- Now joined " + STREAMERS_JOINED + " streamers!");
    }
    // Log every 100th channel to have some info who we
    // join during the later stages
    if (STREAMERS_JOINED % 100 === 0) {
      console.log("--------- Joined channel: " + channel);
    }
    if (STREAMERS_JOINED % 80 === 0) {
      sendMsgToTheBotChannel(client, SPECTRE_OWN_CHANNEL_MSG[Math.floor(Math.random() * SPECTRE_OWN_CHANNEL_MSG.length)]);
    }
    else if (STREAMERS_JOINED % 400 === 0) {
      sendMsgToTheBotChannel(client, SPECTRE_JOIN_MSGS[0]);
    }
    // Dont say anything in chat if its subs only.
    // We wont be able to deliver it and get error in the logs.
    if (!state['subs-only']) {
      // Bot joined get random join msg, 1 matrix quote and random simple msgs
      let randomIndex = Math.floor(Math.random() * SPECTRE_JOIN_MSGS.length);
      let msg = SPECTRE_JOIN_MSGS[randomIndex];
      if ((STREAMERS_JOINED < CHAT_LIMIT || SEND_EACH_TIME) && ALLOWED_TO_CHAT_PUBLICLY) {
          client.action(channel, msg).then(data =>{
          //Skip the data for now.
          console.log("Sent initial Matrix quote.");
          }).catch(err => {
              console.log("--------- FAILED TO SEND JOIN MSG!");
          });
      }
      // Avoid issues of spamming, overflow of failed responses etc..
      // Now send every 2nd or 3rd time we join.
      else if ((STREAMERS_JOINED % 2 === 0 && STREAMERS_JOINED < CHAT_LIMIT * 2) && ALLOWED_TO_CHAT_PUBLICLY) {
          client.action(channel, msg).then(data =>{
          //Skip the data for now.
          console.log("Sent initial Matrix quote.");
          }).catch(err => {
              console.log("--------- FAILED TO SEND JOIN MSG!");
          });
      }
    } else {
      console.log("JOINED SUBS ONLY CHANNEL, SKIP JOIN MSG");
    }
  });

  // It take about 4-5 minutes to join 100 channels
  client.on("join", function (channel, username, self) {
    if (self) return;
  });

  client.on("chat", function(channel, user, message, self) {
    // Ignore the bot's msg's
    if (self || user.username === config.userName) {
      return;
    }
    if (message.toLowerCase().includes("?" + config.userName)) {
      // Reply to the user
      let randomIndex = Math.floor(Math.random() * SPECTRE_REPLIES.length);
      let reply = "@" + user.username + " " + SPECTRE_REPLIES[randomIndex];
      client.action(channel, reply).then(data =>{
        REPLY_MSGS_SENT++;
        // Skip data for now, keep it if we want to change something.
        console.log("========SUCCESSFULLY SEND REPLY " + reply + "!========");
        console.log("========NOW SENT A TOTAL OF REPLIES " + REPLY_MSGS_SENT + "!========");

        }).catch(err => {
            FAILED_REPLY_SENT++;
            console.log("FAILED TO SEND REPLY AFTER ?" + config.userName);
            console.log("========HAS NOW TRIED TO SEND: " + FAILED_REPLY_SENT + "!========");
        });
      // Continue to check if there was an emote within the message.
    }
    // This flag is switched off after NUMBER_OF_HOURS_COLLECTING
    // Stop wasting cpu cycles to collect when it has passed
    // we will be in around 3-4000 channels at this time
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
              console.log("Channel: " + channel + " got +1 of: " + supportedEmote + " Now a total of: " + streamer.emotes[supportedEmote]);
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

  // Adress looks something like
  // irc-ws.chat.twitch.tv
  client.on("connected", function(address, port){
  });

  client.on("reconnect", function () {
    //Trying to reconnect... log it?
  });

  client.on('disconnected', function(reason){
    SEND_EACH_TIME = false;
    console.log("Disconnected:", reason)
    console.log("Got disconnected, stop sending join msg's. Setting SEND_EACH_TIME = false");
  });

  // TODO Add functionality
  client.on("whisper", function (from, userstate, message, self) {
    if (self) return;
    });

    // TODO CHECK THIS TOMMORROW TO CATCH ALL
    client.on("message", function (channel, userstate, message, self) {
        // Don't listen to my own messages..
        // if (self) return;

        // Handle different message types..
        // switch(userstate["message-type"]) {
            // case "action":
            //     // This is an action message..
            //     break;
            // case "chat":
            //     // This is a chat message..
            //     break;
            // case "whisper":
            //     // This is a whisper..
            //     break;
            // default:
                // Something else ?
                // break;
        // }
    });
}

//=============================================================
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
    // get a copy of the FETCHED_STREAMERS first INITIAL_REQUEST_STREAM_LIMIT elements
    let fetchedCopy = FIRST_FETCHED_STREAMERS.slice(0, INITIAL_STREAM_LIMIT);
    while (requestedAmount > 0) {
      let randomIndex = Math.floor(Math.random() * fetchedCopy.length);
      // Pick random streamer and delete him at the same time
      // from the original array
      let streamerData = fetchedCopy.splice(randomIndex, 1)[0];
      // Only add the BIG streamers which we gonna track to the connection array
      // So STREAMS_TO_BE_TRACKED big channels and if it works 4-6k small channels
      STREAM_CONNECTIONS.push("#" + streamerData.name);
      console.log("--------- Randomly picked streamer:", streamerData.name);
      let updatedStreamer =  await addAdditionalAttributes(streamerData);
      // Add just the name to the array used to connect
      STREAMERS.push(updatedStreamer);
      console.log("--------- Pushed streamer data:", updatedStreamer.displayName);
      console.log();
      requestedAmount--;
      }
      console.log();
}

function parsedFetchedArray(body, firstFetch) {
  if (firstFetch) {
    CURRENT_LIVE_CHANNELS = body._total;
    console.log('Number of streamers fetched:', body.streams.length);
    console.log("===================================================");
  }

  let counter = 0;
  for (let i = 0; i < body.streams.length; i++) {
    let streamer = {};
    streamer.name = body.streams[i].channel.name;
    if (firstFetch) {
      streamer.displayName = body.streams[i].channel.display_name;
      streamer.logoUrl = body.streams[i].channel.logo;
      streamer.url = body.streams[i].channel.url;
      streamer.viewers = body.streams[i].viewers;
      console.log("--------- Fetching streamer data from:", streamer.name);
      FIRST_FETCHED_STREAMERS.push(streamer);
    }
    else {
        STREAM_CONNECTIONS.push("#" + streamer.name);
    }
  }
}

function getStreamerData(limit, offset) {
  let options = {
    url: 'https://api.twitch.tv/kraken/streams?limit=' + limit + '&language=en&offset=' + offset +'&api_version=5',
    json: true,
    headers: {
        'Client-ID': config.clientId
      }
  };

  return new Promise((resolve, reject) => {
    request(options, (err, res, body) => {
      if (err) {
        console.log(err);
        reject("ERROR" + res.statusCode);
        return;
      }
      else {
        resolve(body);
      }
    });
  });
}

async function populateStreamerArrays() {
  try {
      //Also add the bot himself in the beginning of the connections array
      console.log("--------- ADDING MYSELF TO STREAM_CONNECTIONS AT INDEX: " + STREAM_CONNECTIONS.length);
      STREAM_CONNECTIONS.push("#" + config.userName);
      //  Use offset 0 to get the INITIAL_REQUEST_STREAM_LIMIT TOP channels
      let result = await getStreamerData(REQUEST_STREAM_LIMIT, INITIAL_REQUEST_OFFSET);
      parsedFetchedArray(result, true);
      // Called once, then get the rest of the small channels
      randomlyPopulateSelectedStreamers();
      // 100 streams took 3-5 mins
      // 1000 streams took 34 mins.
      // Mix offset a little
      // These small channels will probably go on and offline so get ALOT of them
      let offset = getOffset();
      let requestAmount = getAmountOfRequests(offset);
      console.log("--------- Offset set to: " + offset);
      console.log("--------- RequestAmount set to: " + requestAmount);
      console.log("Starting sending requests for the rest of small streamers...");
      for (let i = 1; i < requestAmount; i++) {
        let res = await getStreamerData(REQUEST_STREAM_LIMIT, offset);
        parsedFetchedArray(res, false);
        offset -= 100;
        if (i === Math.round(requestAmount / 2)) {
          console.log("--------- Halfway done grabbing the smaller streamers...");
        }
      }
  } catch (error) {
      console.log("Error:", error);
  }
}

function createOptions() {
  return options = {
    options : {
      debug : false
    },
    connection : {
      reconnect : true,
      reconnectInterval : 2500
    },
    identity : {
      username : config.userName,
      password : config.twitchPass
    },
    channels : STREAM_CONNECTIONS
  };
}

async function addAdditionalAttributes(streamer) {
    try {
      console.log("Downloading logo for streamer :", streamer.name);
      let imageLogo = await downloadFile(streamer.logoUrl);
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
// use client.getChannels() to broadcast
function broadcastMsg(client, message, connectionArray) {
  for (streamerChannel of connectionArray) {
    client.action(streamerChannel, message);
  }
  console.log("\nBROADCASTED message: ", message);
  console.log();
}

function downloadFile(url) {
    let opts = {url, encoding: 'base64'}
    return new Promise((resolve, reject) => {
      request(opts, (err, res, body) => {
        if (err) {
          console.log(err);  // Log the error if one occurred
          reject("ERROR code for image logo download" + res.statusCode);
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
    let createMsg = (streamsArray) => {
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

function createCurrentViewersText() {
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
  TOP_100_STREAMERS = top_100;
  return "Viewers currently @ https://www.twitch.tv/ \n" +
  "#top100 channels has a total of: " + top_100 + " viewers\n" +
  "where the #top50 channels has a total of: " + top_50 + " viewers\n" +
  "and the #top25 channels has a total of: " + top_25 + " viewers.\n" +
  "A good time to be lurking on the shadows...";
}

//In case ppl lurks in the channel.
function sendMsgToTheBotChannel(client, msg) {
  client.action("#" + config.userName, msg).then(data =>{
    //Skip the data for now.
    console.log("Sent msg in #" + config.userName);
    }).catch(err => {
        console.log("FAILED to sen msg in #" + config.userName + "!");
    });
  }

  function updateMsgLimits() {
    if (TOP_100_STREAMERS > MANY_VIEWERS) {
      CHAT_LIMIT = CHAT_LIMIT * 6
    }
    else if (TOP_100_STREAMERS > FEW_VIEWERS) {
      CHAT_LIMIT = CHAT_LIMIT * 2.75
    }
    // Else default value of CHAT_LIMIT
  }

  function getOffset() {
    // Get the low pop, if we cut the array like this we get the ones
    // with atleast 1 viewers, easy exposure
    return Math.floor(CURRENT_LIVE_CHANNELS * 0.65);
  }

  function getAmountOfRequests(offset) {
    // Just we just want to make sure we're not sending a bad requests
    let tmp = offset / 100;
    return Math.floor(tmp - tmp * 0.1);
  }
