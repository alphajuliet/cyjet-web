// main.js
// AJ 2018-05-06 

var R, audiojs, Plyr;  // Prevent syntax warnings from missing definitions
var player;

const Cyjet = (() => {
    
  // -------------------
  const Info = {
    title: "cyjet : :",
    author: "AndrewJ",
    version: "0.1.6",
    date: "2018-08-05",
    info: "Cyjet music site",
    appendTitleTo: (tagName) => {
      $(tagName).append($(`<span class="title"><span id="cy">cy</span><span id="jet">jet</span> : :</span>`));
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
  
  // -------------------
  // Render the audio player

  const renderPlayerTo = (target) => {
    $(target).append($('<audio id="player"></audio>'));
    player = new Plyr('#player', { 'autoplay': false, 'muted': true });
    message('click on a track to play');
  };

  // -------------------
  // Get track data and apply a function to it
  // Use the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) to retrieve.
  // @@TODO: memoize it across multiple calls
  
  const withTrackDataDo = (fn) => {
    //const trackData = 'https://cdn.glitch.com/bb8fd41a-7273-407d-b0cc-93cf1c0fa0a0%2Ftracks.json?1532773145678';
    const trackData = 'https://alphajuliet.com/music/cyjet/tracks.json';
    fetch(trackData, { "mode": "cors" })
      .then(response => response.json())
      .then(json => { fn(json); });
  };
  
  // -------------------
  
  const isPublicTrack = (t) => (t.public == 'checked') || (t.public == true);

  // -------------------
  // Play a track through the player
  
  const playTrack = (t) => {

    // Resolve the location of the track
    var resolveTrackInfo = (track) => {
      let t = R.clone(track);
      const baseUri = 'https://alphajuliet.com/music/cyjet';
      t.uri = `${ baseUri }/${ t.year }/${ t.mp3_fname }`;
      return t;
    }
    
    if (player.playing == true || player.paused == true) {
      player.stop();
    }

    // Load a new source
    const track = resolveTrackInfo(t);
    console.log(track);
    message("loading track...");
    player.source = {
      type: 'audio',
      title: track.title,
      sources: [{
        src: track.uri,
        type: 'audio/mp3',
      }],
    };
    
    player.muted = true; // get around the Webkit autoplay issue
    player.play() // returns a Promise in some browsers
      .then(() => {
        player.muted = false;
        message(`${ track.title } by ${ track.artist }`);
        console.log(`Playing: ${ track.title } at ${ track.uri }`);
        // console.log(track);
      })
      .catch((err) => {
        message(`error :: cannot play ${ track.title } → ${err}`);
        console.log(`Error playing ${ track.title } → ${err}`);
      });
  };
  
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
  // Shuffle all tracks and play
  // @@TODO Unfinished
  
  const shuffleAllTracks = () => {
    
    // Fisher-Yates/Knuth algorithm
    const shuffle = (array) => {
      let currentIndex = array.length, temporaryValue, randomIndex;
      while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
      }
      return array;
    };
    
    // @@Todo
  }
  
  // -------------------
  // Render each track to the target
  // This is a reducing function! (target → track → target)
  // renderTrack :: jQuery -> Object -> jQuery
  
  const renderTrack = R.curry((target, track) => {
    //if ((track.public == 'checked') || (track.public == true)) {
      $(target).append(
        $(`<span class="track-title" title="Original artist: ${ track.artist }">${ track.title }</span>`)
          .click(() => playTrack(track)));
    //}
    return target;
  });
  
  // Render all tracks by year. Also a reducing function.
  // renderByYear :: jQuery -> Object -> jQuery
  
  const renderByPropTo = R.curry((target, corpus) => {
    const sortByTitle = (a, b) => (a < b);
    const groupByProp = R.groupBy(R.prop('year'));

    R.forEachObjIndexed( (tracks, year) => {
      const container1 = $(`<div class="year"><span class="year-title">${ year } :&nbsp;:&nbsp;</span></div>`);  // Create a div for each year
      const container2 = $(`<div class="year-tracks"></div>`);
      
      R.reduce(renderTrack, container2, tracks); // ooh! FP lightblub moment.
      
      $(container1).append(container2);
      $(target).append(container1);
    }, groupByProp(R.compose(R.sortBy(R.prop('title')), 
                             R.filter(isPublicTrack))
                   (corpus)));
    return target;
  });
  
  // -------------------
  // List all the tracks to a target
  
  const renderCorpusTo = R.compose(withTrackDataDo, renderByPropTo);
        
  // -------------------
  // Render the playlist controls
  
  const renderControlsTo = (target) => {
    const container = $(target).append($('<div id="controls"></div>'));
    $(container).append($('<button>random track</button></div>'))
      .click(() => playRandomTrack());

    $(target).append(container);
    return target;
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