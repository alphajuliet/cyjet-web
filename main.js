// main.js
// created by Andrew 2018-05-06 

var R, audiojs, Plyr, ga;  // Prevent syntax warnings from missing definitions
var player;

//-------------------
// Make a chainable append

jQuery.fn.extend({
  append_: function (item) {
    this.append(item);
    return this;
  }
});

//-------------------
const Cyjet = (() => {
    
  const Info = {
    title: "cyjet",
    author: "AndrewJ",
    version: "0.1.13",
    date: "2020-02-29",
    info: "Cyjet music site",
    appendTitleTo: (tagName) => {
      $(tagName).append($(`<span class="title"><span id="cy">(cy</span><span id="jet">jet)</span></span>`));
      return tagName;
    },
    appendVersionDateTo: (tagName) => {
      $(tagName).append($(`<span>Version: ${Info.version}, ${Info.date}.</span>`));
      return tagName;
    }
  };

  const message = txt => {
    $('#message').html(txt); 
  }

  //-------------------
  // Render the audio player

  const renderPlayerTo = (target) => {
    $(target).append($('<audio id="player"></audio>'));
    player = new Plyr('#player', { 'autoplay': false, 'muted': true });
    player.on('ended', event => {
      message('click on a track to play');
    });
    message('click on a track to play');
  };

  //-------------------
  // Get track data and apply a function to it
  // Use the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) to retrieve.
  
  const withTrackDataDo = (fn) => {
    const trackData = 'https://s3-ap-southeast-2.amazonaws.com/alphajuliet-s3-mp3/cyjet/tracks.json'
    // const trackData = 'https://api.airtable.com/v0/appHZHDQXtw3tTsoh/Tracks'
    fetch(trackData, { 
      "mode": "cors", 
    })
      .then(response => response.json())
      .catch(err => console.error(err.message)) 
      .then(json => { fn(json); })
      .catch(err => console.error(err.message)) 
  }

  //-------------------
  const isPublicTrack = (t) => (t.public == 'checked') || (t.public == true);

  //-------------------
  // Collect analytics
  
  const logPlay = (track) => {
    ga('send', {
      hitType: 'event',
      eventCategory: 'Music',
      eventAction: 'play',
      eventLabel: track.title
    })
    console.log(`Event: play ${track.title}`)
  }
  
  const logShuffle = (ev) => {
    ga('send', {
      hitType: 'event',
      eventCategory: 'Music',
      eventAction: 'shuffle',
      eventLabel: ev
    })
    console.log(`Event: shuffle ${ev}`)
  }

  //-------------------
  // Play a track through the player
  
  const playTrack = (t) => {

    // Resolve the location of the track
    const resolveTrackInfo = (track) => {
      let t = R.clone(track)
      const baseUri = 'https://s3-ap-southeast-2.amazonaws.com/alphajuliet-s3-mp3/cyjet'
      t.uri = `${ baseUri }/${ t.year }/${ t.mp3_fname }`
      return t
    }
    
    if (player.playing == true || player.paused == true) {
      player.stop()
    }

    // Load a new source
    const track = resolveTrackInfo(t);
    message("loading track...");
    player.source = {
      type: 'audio',
      title: track.title,
      sources: [{
        src: track.uri,
        type: 'audio/mp3',
      }],
    }
    
    player.muted = true; // kinda get around the Webkit autoplay issue
    player.play()
      .then(() => {
        player.muted = false;
        message(`${ track.title } by ${ track.artist }`)
        logPlay(track)
      })
      .catch(err => {
        message(`error :: cannot play ${ track.title } → ${err}`)
        console.log(`Error playing ${ track.title } → ${err}`)
      });
  }
  
  // -------------------
  // Play a random track
  
  const playRandomTrack = () => {
    const randomNumber = (n) => Math.floor(Math.random() * n);
    const randomElement = (lst) => R.nth(randomNumber(R.length(lst)), lst);
    const playFn = R.compose(playTrack,
                             randomElement, 
                             R.filter(isPublicTrack));
    withTrackDataDo(playFn);
  };

  // -------------------
  // Shuffle play until stopped

  var randomPlay = false; // state

  const shufflePlay = () => {
    randomPlay = (randomPlay == true) ? false : true;

    if (randomPlay == true) {
      logShuffle('start');
      player.on('ended', playRandomTrack);
      playRandomTrack();
    }
    else {
      logShuffle('stop');
      player.on('ended', event => {
        message('click on a track to play');
      });
      player.stop();
      message('click on a track to play');
    }
  };

  // -------------------
  // Render each track to the target
  // This is a reducing function! (target → track → target)
  // renderTrack :: jQuery -> Object -> jQuery
  
  const renderTrack = R.curry((target, track) => {
    const class_rating = track.rating >= 1 ? "star" : ""
    return $(target).append_(
      $(`<span class="track-title ${class_rating}" title="Original artist: ${ track.artist }">${ track.title }</span>`)
        .click(() => playTrack(track)));
  });

  // Render all tracks by a nominated key. Also a reducing function.
  // renderByYear :: jQuery -> Object -> jQuery
  
  const renderByPropTo = R.curry((target, corpus) => {
    const groupByYear = R.groupBy(R.prop('year'));
    const sortByTitle = R.sortBy(R.prop('title'));

    R.forEachObjIndexed( (tracks, year) => {
      const container1 = $(`<div class="box"><span class="box-title">${ year }</span></div>`);
      const container2 = $(`<div class="box-tracks"></div>`);

      R.reduce(renderTrack, container2, tracks); // ooh! FP lightblub moment.

      $(container1).append(container2);
      $(target).append(container1);
    }, (R.compose(groupByYear, sortByTitle, R.filter(isPublicTrack)))(corpus));
    return target;
  });
  
  // -------------------
  // List all the tracks to a target
  
  const renderCorpusTo = R.compose(withTrackDataDo, renderByPropTo);
        
  // -------------------
  // Render the playlist controls
  
  const renderControlsTo = (target) => {
    const container = $(target).append($('<div id="controls"></div>'));

    const buttonShuffle = $('<button id="shuffle">shuffle play</button>')
      .click(() => {
        shufflePlay();
        $('#shuffle').toggleClass("buttonOn");
      });

    return $(target)
      .append_(container)
      .append_(buttonShuffle);
  }
  
  // -------------------
  // Initialise the page with content
  
  const initialise = () => {
    Info.appendTitleTo(".header");
    Info.appendVersionDateTo("#attribution");
    renderPlayerTo("#trackPlayer");
    renderCorpusTo("#trackList");
    renderControlsTo("#controls");
    console.log("Initialised.");
  };
  
  // Public data
  return Object.freeze({
    initialise: initialise
  });
  
})();

// The End
