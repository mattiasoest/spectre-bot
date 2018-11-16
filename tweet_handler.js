var Twit   = require("twit");
var consts =  require("./consts");

var T = new Twit({
  consumer_key:         consts.twitter_consumer_key,
  consumer_secret:      consts.twitter_consumer_secret,
  access_token:         consts.twitter_access_token,
  access_token_secret:  consts.twitter_access_secret,
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
  strictSSL:            true,     // optional - requires SSL certificates to be valid.
});

exports.tweet = function(tweet) {
  tweetHelper(tweet);
}

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
