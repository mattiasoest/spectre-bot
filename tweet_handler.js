const Twit   = require("twit");
const config = require("./live_config");
// const config = require("./consts");

var twit = new Twit({
  consumer_key:         config.twitter_consumer_key,
  consumer_secret:      config.twitter_consumer_secret,
  access_token:         config.twitter_access_token,
  access_token_secret:  config.twitter_access_secret,
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
  strictSSL:            true,     // optional - requires SSL certificates to be valid.
});

// ! Max chars per tweet is 280.
exports.tweet = function(tweet) {
  tweetHelper(tweet);
}

exports.tweetImage = function(b64Image, imageText) {
    twit.post('media/upload', { media_data: b64Image }, (err, data, res) => {
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
    twit.post('statuses/update', tweet, (err, data, res) => {
      if (err) {
        console.log("ERROR POSTING TWEET:", err);
      }
      else {
        console.log("STATUS CODE FROM TWEET:", res.statusCode);
      }
    });
}
