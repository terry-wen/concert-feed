/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */
let express = require('express'); // Express web server framework
let request = require('request'); // "Request" library
let path = require("path");
let querystring = require('querystring');
let cookieParser = require('cookie-parser');
let credentials = require('./util/credentials.js');
let utils = require('./util/util.js');

let LOGIN_URI = '/login';
let REDIRECT_URI = '/callback';
let REFRESH_URI = '/refresh_token';
let STATE_KEY = 'spotify_auth_state';

let app = express();

//app.set('view engine', 'html'); //dynamic views
app.use(express.static(path.join(__dirname, 'public'))) //static html
  .use(function(req, res, next) {
    app.set('CURRENT_HOST', req.protocol + '://' + req.get('host'));
    next();
  })
  .use(cookieParser());

app.set('port', (process.env.PORT || 8888));
//For avoiding Heroku $PORT error
app.listen(app.get('port'), function() {
  console.log('App is running, server is listening on port', app.get('port'));
});

app.get('/', function(request, response) {
    response.render('index', {});
});

app.get(LOGIN_URI, function(req, res) {
  let state = utils.generateRandomString(16);
  res.cookie(STATE_KEY, state);

  // your application requests authorization
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: credentials.client_id,
      scope: 'user-read-private user-library-read user-read-email',
      redirect_uri: app.get('CURRENT_HOST') + REDIRECT_URI,
      state: state,
	    show_dialog: true
    }));
});

app.get(REDIRECT_URI, function(req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[STATE_KEY] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(STATE_KEY);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: app.get('CURRENT_HOST') + REDIRECT_URI,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(credentials.client_id + ':' + credentials.client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          //console.log("hey");
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get(REFRESH_URI, function(req, res) {
  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});
