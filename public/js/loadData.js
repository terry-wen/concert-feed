(function() {

  /**
   * Obtains parameters from the hash of the URL
   * @return Object
   */
  function getHashParams() {
    var hashParams = {};
    var e, r = /([^&;=]+)=?([^&;]*)/g,
      q = window.location.hash.substring(1);
    while ( e = r.exec(q)) {
      hashParams[e[1]] = decodeURIComponent(e[2]);
    }
    return hashParams;
  }

  var params = getHashParams();

  var access_token = params.access_token,
      refresh_token = params.refresh_token,
      error = params.error;

  var artists = [];
  var events = [];
  var output = "";

  var name;

  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var date;

  var list = "";

  var noConcerts = true;

  function getArtists(songs, artists) {
    for(i = 0; i < songs.items.length; i++){
      name = songs.items[i].track.artists[0].name;
      if (artists.indexOf(name) == -1 ) {
        artists.push(name);
        //console.log(songs.items[i].track.artists[0].name);
        $.getJSON("https://api.bandsintown.com/artists/"+name+"/events/search.json?api_version=2.0&callback=?&app_id=concertFeed&location=use_geoip&radius=100", function(result) {
          if(typeof result !== 'undefined' && result.length > 0) {
            //console.log(result);
            date = new Date(result[0].datetime);
            output = "<div class=\"row vertical-center concertRow\">" +
              "<div class=\"col-xs-2\"><img src=\""+result[0].artists[0].thumb_url+"\" class=\"thumb\"></div>" +
              "<div class=\"col-xs-8\">"+result[0].artists[0].name+" @ " + result[0].venue.name + "<br>"+days[date.getDay()]+", "+ months[date.getMonth()] +" "+ date.getDate() +" in " + result[0].venue.city + ", " + result[0].venue.region + "</div>" +
              "<div class=\"col-xs-2\"><div class=\"buttonOuter\"><a href=\""+result[0].facebook_rsvp_url+"\"><div class=\"button\" align=\"center\"><img class=\"bitimg\" alt=\"Open in Bandsintown\"></div></a></div></div></div>";
            if(noConcerts){
              document.getElementById('concerts').innerHTML = output;
              noConcerts = false;
            } else {
              document.getElementById('concerts').innerHTML += output;
            }
          }
        });
      }
    }
  }

  if (error) {
    alert('There was an error during the authentication');
  } else {
    if (access_token) {

      var songs;
      var offset = 0;
      var total;

      $.when($.ajax({
        url: 'https://api.spotify.com/v1/me/tracks?offset='+offset+'&limit=20',
        headers: {
          'Authorization': 'Bearer ' + access_token
        },
        success: function(response) {
          songs = response;
          total = songs.total;
          for(offset = 0; offset <= total + 20; offset += 20){
            (function(offset){
              $.ajax({
                url: 'https://api.spotify.com/v1/me/tracks?offset='+offset+'&limit=20',
                headers: {
                  'Authorization': 'Bearer ' + access_token
                },
                success: function(response) {
                  songs = response;
                  getArtists(songs, artists);
                }
              });
            })(offset);
          }
        }
      }));

      $.ajax({
        url: 'https://api.spotify.com/v1/me',
        headers: {
          'Authorization': 'Bearer ' + access_token
        },
        success: function(response) {
          if(response.display_name != null) {
            document.getElementById('name').innerHTML = "Hello, " + response.display_name;
          }
        }
      });

      $('#loggedin').show();

    } else {
        // render initial screen
      $('#login').show();
      $('#loggedin').hide();
    }
  }
})();
