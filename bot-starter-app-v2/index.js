require('dotenv').config();

var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
const RC = require('ringcentral');

var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const PORT= process.env.RINGCENTRAL_PORT;
const CLIENT_ID = process.env.RINGCENTRAL_CLIENT_ID;
const CLIENT_SECRET = process.env.RINGCENTRAL_CLIENT_SECRET;
const RINGCENTRAL_ENV= process.env.RINGCENTRAL_SERVER_URL;
const REDIRECT_HOST = process.env.RINGCENTRAL_REDIRECT_URL;
const GET_SUMMARY_URL = process.env.SUMMARY_API_SERVER_URL

var platform, rcsdk, botID, creatorID;

rcsdk = new RC({
    server: RINGCENTRAL_ENV,
    appKey: CLIENT_ID,
    appSecret: CLIENT_SECRET
});

platform = rcsdk.platform();
app.listen(PORT, function () {
    //Callback triggered when server is successfully listening. Hurray!
    console.log("Example app listening on port " + PORT);
});


app.get('/', function(req, res) {
    console.log('hi i am here');
    res.send('Ngrok is working! Path Hit: ' + req.url);
});


app.post('/getSummary', function(req, res) {
    console.log(req.body);
    // const request = require('request');
    var postData=req.body;
    var options = {
      method: 'post',
      body: postData,
      json: true,
      url: GET_SUMMARY_URL
    };
    request(options, function (err, res, body) {
      if (err) {
        console.error('error posting json: ', err)
        throw err
      }
      var headers = res.headers
      var statusCode = res.statusCode
      console.log('headers: ', headers)
      console.log('statusCode: ', statusCode)
      console.log('body: ', body)
      res=body
    });
    res.status(200).send(res);
});


app.post('/oauth', function(req, res){
    var token = req.body.access_token;
    creatorID = req.body.creator_extension_id; 
    console.log(token);
    res.send({});
    var data = platform.auth().data();
    data.token_type = "bearer"
    data.expires_in = 5000000
    data.refresh_token_expires_in = 5000000
    data.access_token = token
    data.refresh_token = token
    platform.auth().setData(data)
    getBotIdentity();
});


//U0pDMTFQMDFQQVMwMHxBQUNuX3dEVkpGV0JvU2s5cUtnWDFiejBfa0g4TUtNZG5yTTNoZ1NtTUsyWGNyWC10Vjc3SlRNaW9PZElSeXgwQUNONF9QWWRPMEVYNENYQjd4dmJsWHJoY2sySjRCTnBCd3Atay1zUzVMVDhFREtzOW1XTEZXSTViVHRmbFJYRG9lTXZMcTRUWjFkdWZkLWlCbEJFNVhCLTdaRlJZTzgwWk41eVZ1RnBFOWx0YUZFc0I1U3h3dUY4T0hYSVh3Ym5pVWt8LWJxa0xBfDFIY3F0T0hjVTZQekRnaUE2ZFdScEF8QUE
// Callback method received after subscribing to webhook
app.post('/glip/receive', function (req, res) {

    var validationToken = req.get('Validation-Token');

    if(validationToken) {
        console.log('Responding to RingCentral as last leg to create new Webhook');
        res.setHeader('Validation-Token', validationToken);
        res.status(200).json({
            message: 'Set Header Validation'
        });
    } else {
        // console.log(JSON.stringify(req.body));
        res.status(200).send({});
        var regex_hi = RegExp('^hi');
        var regex_url = RegExp('^https://*');
        if(req.body.body.eventType=== "PostAdded" && regex_url.test(req.body.body.text)){
                
            console.log('before req');
            // if(regex_hi.test(req.body.body.text)){
            //     platform.post('/glip/groups/'+ req.body.body.groupId + '/posts',{  
            //         groupId: req.body.body.groupId,   
            //         text: "Please post a url??" 
            //         }).then(function(response){ 
            //             console.log(response);
            //         }).catch(function(err){ 
            //             console.log(err);   
            //     });
            // }
                var postData={url:req.body.body.text};
                var options = {
                  method: 'post',
                  body: postData,
                  json: true,
                  url: GET_SUMMARY_URL
                };
                request(options, function (err, res, body) {
                  if (err) {
                    console.error('error posting json: ', err)
                    throw err
                  }
                  var option_rc = {
                      method: 'post',
                      headers: {
                        Authorization: "Bearer U0pDMTFQMDFQQVMwMHxBQUNuX3dEVkpGV0JvU2s5cUtnWDFiejBfa0g4TUtNZG5yTTNoZ1NtTUsyWGNvNkFuOEZYLXJGZ1NDU2dPOXplYjJSNF9QWWRPMEVYNENYQjd4dmJsWHJoRnRURkNPdnhwUWtmNTd1Z3ZZZlpjcDh2SVJrZG9HSFp0V1JXTi1oVVhvSG9MYmQzdWE3S1dFcWQ0Vmh2VlRDUTFXLVJWdTFRUUFaeVZ1RnBFOWx0YUtIakdrbFZaR1FNV3JCNWd3TmRuNE18SmdzQk1BfGpibXlscV9uSExsNWtwUm4zakphRVF8QUE"
                      },
                      body: {
                        groupId: req.body.body.groupId, 
                        text:body.summary
                        },
                      json: true,
                      url: RINGCENTRAL_ENV+'/restapi/v1.0/glip/groups/'+req.body.body.groupId+'/posts'
                  };

                  request(option_rc, function (err, res, body) {
                  if (err) {
                    console.error('error posting json: ', err)
                    throw err
                  }
                  console.log(body);
                });
                });
        }
   }
});

// Method to Get Bot Information.
function getBotIdentity(){
    platform.get('/account/~/extension/~')
        .then(function(extensionInfo){
            var identity = JSON.parse(extensionInfo.text());
            console.log("Bot Identity :" + JSON.stringify(identity));
            botID = identity.id;
            subscribeToGlipEvents();
            IsBotAddedToGlip();
        }).catch(function(e){
            console.error(e);
            throw e;
        })
}


// Method to Subscribe to Glip Events.
function subscribeToGlipEvents(){

    var requestData = {
        "eventFilters": [
            //Get Glip Post Events
            "/restapi/v1.0/glip/posts", 
            //Get Glip Group Events
            "/restapi/v1.0/glip/groups"
        ],
        "deliveryMode": {
            "transportType": "WebHook",
            "address": REDIRECT_HOST + "/glip/receive"
        },
        "expiresIn": 500000000
    };
    platform.post('/subscription', requestData)
        .then(function (subscriptionResponse) {
            console.log('Subscription Response: ', subscriptionResponse.json());
            // subscription = subscriptionResponse.json();
            // subscriptionId = subscriptionResponse.id;
        }).catch(function (e) {
            console.error(e);
            throw e;
    });
}

function IsBotAddedToGlip(){
    platform.get('/glip/persons/'+botID)
        .then(function(botInfo){
               console.log("Bot is Added to Glip");
               //createGroup(); 
        }).catch(function(e){
            console.log("Waiting for bot to be added to Glip...!");
            setTimeout(function() {
                IsBotAddedToGlip();
            }, 10000);
        })
}