/**
 * For reference:
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */
const express = require('express');
const exphbs = require('express-handlebars');
const request = require('request');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const credentials = require('./util/credentials.js');
const utils = require('./util/util.js');

const ERROR_URI = '/error';
const LOGIN_URI = '/login';
const REDIRECT_URI = '/callback';
const STATE_KEY = 'spotify_auth_state';

const app = express();

app.set('view engine', 'handlebars')
  .set('views', __dirname + '/public') //For static assets
  .engine('handlebars', exphbs())
  .use(express.static(__dirname + '/public'))
  .use(function(req, res, next) {
    app.set('CURRENT_HOST', req.protocol + '://' + req.get('host'));
    next();
  })
  .use(cookieParser());

//For avoiding Heroku $PORT error
app.set('port', (process.env.PORT || 8888));
app.listen(app.get('port'), function() {
  console.log('App is running, server is listening on port', app.get('port'));
});

//Render home
app.get('/', function(req, res) {
  res.render('index', {});
});

//Login redirect to Spotify
app.get(LOGIN_URI, function(req, res) {
  let state = utils.generateRandomString(16);
  res.cookie(STATE_KEY, state);

  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: credentials.client_id,
      scope: 'user-library-read',
      redirect_uri: app.get('CURRENT_HOST') + REDIRECT_URI,
      state: state,
    }));
});

//Return response
app.get(REDIRECT_URI, function(req, res) {
  let state = req.query.state || null;
  let storedState = req.cookies ? req.cookies[STATE_KEY] : null;

  if (state === null || state !== storedState) {
    res.redirect('/error#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(STATE_KEY);
    let code = req.query.code || null;
    let authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: app.get('CURRENT_HOST') + REDIRECT_URI,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + Buffer.from(credentials.client_id + ':' + credentials.client_secret).toString('base64')
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: body.access_token,
            refresh_token: body.refresh_token
          })); //TODO: Find better way to pass these values
      } else {
        res.redirect('/error#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get(ERROR_URI, function(req, res) {
  res.render('error', {}); //Temporary error page
});