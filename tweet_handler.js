const Twit  = require("twit");
const config = require("./live_config");
// const config = require("./consts");

var T = new Twit({
  consumer_key:         config.twitter_consumer_key,
  consumer_secret:      config.twitter_consumer_secret,
  access_token:         config.twitter_access_token,
  access_token_secret:  config.twitter_access_secret,
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
  strictSSL:            true,     // optional - requires SSL certificates to be valid.
});


// MAX CHARS PER TWEET 280
exports.tweet = function(tweet) {
  tweetHelper(tweet);
}

// MAX CHARS PER TWEET 280 + IMAGE
exports.tweetImage = function(b64Image, imageText) {
    T.post('media/upload', { media_data: b64Image }, (err, data, res) => {
      if (err) {
        console.log("ERROR POSTING TWEET:", err);
      }
      else {
        var tweet = {
          status: imageText,
          media_ids: [data.media_id_string]
        }
        tweetHelper(tweet);
      }
    });
}

function tweetHelper(tweet) {
    T.post('statuses/update', tweet, (err, data, res) => {
      if (err) {
        console.log("ERROR POSTING TWEET:", err);
      }
      else {
        console.log("STATUS CODE FROM TWEET:", res.statusCode);
      }
    });
}
