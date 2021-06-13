// main.js
// AndrewJ, created 2018-05-06
//-------------------

// Declare to prevent warnings when using these pre-defined prefixes
var R, audiojs, Plyr, ga;

// Global pointer to the audio player
var player;

// Global state
var randomPlay = false;

//-------------------
// Utilities

// Make a chainable append
jQuery.fn.extend({
  append_: function (item) {
    this.append(item);
    return this;
  }
});

// Convert secs to a min/sec string
// sec_to_min_sec :: Integer -> String
const sec_to_min_sec = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = ('00' + Math.floor(seconds % 60)).slice(-2);
  return `${m}:${s}`;
};

//-------------------
// Main namespace

const Cyjet = (() => {

  const Info = {
    title: "cyjet",
    author: "AndrewJ",
    version: "0.1.18",
    date: "2021-06-14",
    info: "Cyjet music site",
    appendTitleTo: (tagName) => {
      $(tagName).append($(`<span class="title">cчjεt</span>`));
      return tagName;
    },
    appendVersionDateTo: (tagName) => {
      $(tagName).append($(`<span>Version: ${Info.version}, ${Info.date}.</span>`));
      return tagName;
    }
  };

  // Status message
  const setStatusMessage = txt => {
    $('#message').html(txt);
  };

  //-------------------
  // Get track data and apply a function to it

  const withTrackDataDo = (fn) => {
    const trackData = 'https://s3-ap-southeast-2.amazonaws.com/alphajuliet-s3-mp3/cyjet/tracks.json';
    fetch(trackData, {"mode": "cors"})
      .then(response => response.json())
      .catch(err => console.error(err.message))
      .then(json => { fn(json); })
      .catch(err => console.error(err.message)) ;
  };

  //-------------------
  // Collect analytics

  const logPlay = (track) => {
    ga('send', {
      hitType: 'event',
      eventCategory: 'Music',
      eventAction: 'play',
      eventLabel: track.title
    });
    console.log(`Event: play ${track.title}`);
  };

  const logShuffle = (ev) => {
    ga('send', {
      hitType: 'event',
      eventCategory: 'Music',
      eventAction: 'shuffle',
      eventLabel: ev
    });
    console.log(`Event: shuffle ${ev}`);
  };

  // ====================================================
  // Audio functions

  //-------------------
  // Play a track through the player

  const playTrack = (track) => {

    if (player.playing == true || player.paused == true) {
      player.stop();
    }

    // Load a new source
    setStatusMessage("loading track...");
    player.source = {
      type: 'audio',
      title: track.title,
      sources: [{
        src: track.link,
        type: 'audio/mp3',
      }],
    };

    // Play it
    player.play()
      .then(() => {
        player.muted = false;
        setStatusMessage(`${ track.title } by ${ track.artist } (${ track.year })`);
        logPlay(track);
      })
      .catch(err => {
        setStatusMessage(`error :: cannot play ${ track.title } → ${err}`);
        console.log(`Error playing ${ track.title } → ${err}`);
      });
  };

  //-------------------
  const isPublicTrack = (t) => (t.public == 'checked') || (t.public == true);

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

  const shufflePlay = () => {

    randomPlay = !randomPlay;

    if (randomPlay == true) {
      logShuffle('start');
      player.on('ended', playRandomTrack);
      playRandomTrack();
    }
    else {
      logShuffle('stop');
      player.on('ended', event => {
        setStatusMessage('click on a track to play');
      });
      player.stop();
      setStatusMessage('click on a track to play');
    }
  };

  // ====================================================
  // Rendering functions

  // -------------------
  // Render each track to the target
  // This is a reducing function: target → track → target
  // renderTrack :: jQuery -> Object -> jQuery

  const renderTrack = R.curry((target, track) => {

    const class_rating = track.rating >= 1 ? "star" : "";
    const title = `Original artist: ${ track.artist }\n${ track.bpm } bpm\n${ sec_to_min_sec(track.length) }`;
    return $(target).append_(
      $(`<span class="track-title ${class_rating}" title="${title}">${ track.title }</span>`)
        .click(() => playTrack(track)));
  });

  // -------------------
  // Render each year to the target
  // renderTrack :: jQuery -> [Object] -> String -> jQuery

  const renderYear = R.curry((target, tracks, year) => {

    // Create a box of rendered tracks
    const container1 = $(`<div class="box-tracks"></div>`);
    const tr = R.reduce(renderTrack, container1, tracks);

    // Create a year and add the rendered tracks
    const container2 = $(`<div class="box"><span class="box-title">${ year }</span></div>`);
    return $(target).append_(container2.append_(tr));
  });

  // -------------------
  // Render all public tracks by a nominated key. Also a reducing function.
  // renderByPropTo :: jQuery -> Object -> jQuery

  const renderByPropTo = R.curry((target, corpus) => {

    // Pipeline
    const groupByYear = R.groupBy(R.prop('year'));
    const sortByTitle = R.sortBy(R.prop('title'));
    const filterPublic = R.filter(isPublicTrack);
    const targetTracks = (R.compose(groupByYear,
                                    sortByTitle,
                                    filterPublic));

    // Show tracks in descending year order, sorted by ascending name
    const tr = targetTracks(corpus);
    return R.forEach(
      year => renderYear(target, R.prop(year, tr), year),
      R.reverse(R.keys(tr)));
  });

  //-------------------
  // Render all the tracks to a target

  const renderCorpusTo = R.compose(withTrackDataDo, renderByPropTo);

  // -------------------
  // Render the playlist controls

  const renderControlsTo = (target) => {
    const container = $(target).append($('<div id="controls"></div>'));

    const buttonShuffle = $('<button id="shuffle">shuffle play</button>')
      .click(() => {
        shufflePlay();
        $('#shuffle').toggleClass('buttonOn');
      });

    const buttonStarred = $('<button id="starred">best of</button>')
      .click(() => {
        $('.track-title').not('.star').toggle();
        $('#starred').toggleClass('buttonOn');
      });

    container.append(buttonShuffle);
    container.append(buttonStarred);
    return $(target)
      .append_(container);
  };

  // -------------------
  // Render the global audio player

  const renderPlayerTo = (target) => {
    $(target).append($('<audio id="player"></audio>'));
    player = new Plyr('#player', { 'autoplay': false, 'muted': true });
    player.on('ended', event => {
      setStatusMessage('click on a track to play');
    });
    setStatusMessage('click on a track to play');
  };

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
