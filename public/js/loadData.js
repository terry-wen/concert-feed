var access_token = $("#access_token").text();
var api_key = $("#tm_key").text();

var artists = [];
var concertList = [];

let callsMade = 0;
let callsCompleted = 0;

function convertDate(date) {
  let months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  let days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return days[date.getDay()]+", "+ months[date.getMonth()] +" "+ date.getDate();
}

function getEvents(artists) {
  for(i = 0; i < artists.length; i++) {
    let name = artists[i];
    $.ajax({
      url: "https://api.bandsintown.com/artists/"+name+"/events/search.json?api_version=2.0&callback=?&app_id=concertFeed&location=use_geoip&radius=100", 
      dataType: 'json',
      success: function(result, status, xhr) {
        if(typeof result !== 'undefined' && result.length > 0) {
          let date = new Date(result[0].datetime);
          let artistEntry = {
            name: name,
            venueName: result[0].venue.name,
            date: convertDate(date),
            location: result[0].venue.city + ", " + result[0].venue.region,
            url: result[0].facebook_rsvp_url,
            thumbUrl: result[0].artists[0].thumb_url
          };
          concertList.push(artistEntry);
          concertList.sort(function(a, b){return a.name.localeCompare(b.name)})
          let source = $("#entry-template").html();
          let template = Handlebars.compile(source);
          let html = template({
            concert: concertList
          });
          $("#concerts").html(html);
        }
      }
    });
  }
}

function getArtists(songs) {
  for(let song of songs.items) {
    for(let artist of song.track.artists) {
      if (artists.indexOf(artist.name) == -1 ) {
        artists.push(artist.name);
      }
    }
  }
  callsCompleted += 1;
}

if (access_token) {
  $.ajax({
    url: 'https://api.spotify.com/v1/me/tracks',
    headers: {
      'Authorization': 'Bearer ' + access_token
    },
    success: function(response) {
      for(let offset = 0; offset < response.total; offset += 50) {
        callsMade += 1;
        $.ajax({
          url: 'https://api.spotify.com/v1/me/tracks?offset='+offset+'&limit=50',
          headers: {
            'Authorization': 'Bearer ' + access_token
          },
          success: function(response) {
            getArtists(response);
            if (callsCompleted === callsMade) {
              getEvents(artists);
            }
          }
        });;
      }
    }
  });
}
