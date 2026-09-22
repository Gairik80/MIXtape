window.addEventListener('load', () => {
  const loadingScreen = document.getElementById('loadingScreen');
  setTimeout(() => {
    loadingScreen.classList.add('hidden');
  }, 1200); // small delay so it doesn't feel instant/jarring
});

// --- Place time ---
function updateClock() {
  const clockEl = document.getElementById('clock');
  if (!clockEl) return;

  const now = new Date();
  const options = {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  clockEl.textContent = now.toLocaleTimeString('en-US', options);
}

updateClock();
setInterval(updateClock, 1000);

// --- Sync play/pause active state to actual player state ---
function onPlayerStateChange(event) {
  const reels = document.querySelectorAll('.reel');

  if (event.data === YT.PlayerState.PLAYING) {
    reels.forEach(r => r.style.animationPlayState = 'running');
    setActiveButton(playBtn);
    startTimeUpdates();
  } else if (event.data === YT.PlayerState.PAUSED) {
    reels.forEach(r => r.style.animationPlayState = 'paused');
    setActiveButton(pauseBtn);
    stopTimeUpdates();
  } else if (event.data === YT.PlayerState.ENDED) {
    reels.forEach(r => r.style.animationPlayState = 'paused');
    stopTimeUpdates();
  }
}

// --- Mouse parallax for background -----------------------------------------------
const body = document.body;
let targetX = 0, targetY = 0;
let currentX = 0, currentY = 0;

document.addEventListener('mousemove', (e) => {
  // normalize mouse position to -1 → 1 range
  const x = (e.clientX / window.innerWidth - 0.5) * 2;
  const y = (e.clientY / window.innerHeight - 0.5) * 2;

  targetX = x;
  targetY = y;
});

function animateBackground() {
  // smooth easing toward the target position
  currentX += (targetX - currentX) * 0.05;
  currentY += (targetY - currentY) * 0.05;

  const moveX = currentX * 15; // max shift in px — tweak strength here
  const moveY = currentY * 15;

  body.style.backgroundPosition = `calc(50% + ${moveX}px) calc(50% + ${moveY}px)`;

  requestAnimationFrame(animateBackground);
}

animateBackground();


// --- SOURCE MODE -----------------------------------------------------------------
let sourceMode = 'local'; // 'local' or 'youtube'
let ytPlayer = null;
let ytReady = false;

const modeLocalBtn = document.getElementById('modeLocal');
const modeYouTubeBtn = document.getElementById('modeYouTube');

modeLocalBtn.addEventListener('click', () => setMode('local'));
modeYouTubeBtn.addEventListener('click', () => setMode('youtube'));

function setMode(mode) {
  sourceMode = mode;
  modeLocalBtn.classList.toggle('active', mode === 'local');
  modeYouTubeBtn.classList.toggle('active', mode === 'youtube');

  // pause whichever was playing before switching
  player.pause();
  if (ytPlayer && ytReady) ytPlayer.pauseVideo();

  if (mode === 'youtube' && !ytPlayer) {
    loadYouTubeAPI();
  }
}

// --- YOUTUBE SETUP ---
function loadYouTubeAPI(playlistId) {
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  document.body.appendChild(tag);

  window.onYouTubeIframeAPIReady = function () {
    ytPlayer = new YT.Player('youtube-player', {
      height: '1',
      width: '1',
      playerVars: {
        listType: 'playlist',
        list: playlistId
      },
      events: {
        onReady: () => { ytReady = true; },
        onStateChange: onYTStateChange,
        onError: onYTError
      }
    });
  };
}

async function fetchYouTubePlaylist(playlistId) {
  let allItems = [];
  let nextPageToken = '';

  do {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&pageToken=${nextPageToken}&key=${YT_API_KEY}`
    );
    const data = await res.json();
    allItems = allItems.concat(data.items);
    nextPageToken = data.nextPageToken || '';
  } while (nextPageToken);

  ytVideos = allItems.map(item => ({
    videoId: item.snippet.resourceId.videoId,
    title: item.snippet.title
  }));

  renderYouTubePlaylist();
}

function onYTError(event) {
  console.log('YouTube playback error code:', event.data);
  nextBtn.click();
}

function onYTStateChange(event) {
  const reels = document.querySelectorAll('.reel');
  if (event.data === YT.PlayerState.PLAYING) {
    reels.forEach(r => r.style.animationPlayState = 'running');
    setActiveButton(playBtn);
    nowPlaying.textContent = ytPlayer.getVideoData().title;
  } else if (event.data === YT.PlayerState.PAUSED) {
    reels.forEach(r => r.style.animationPlayState = 'paused');
    setActiveButton(pauseBtn);
  }
}




const ytLinkInput = document.getElementById('ytLinkInput');
const ytPlaylistUrlInput = document.getElementById('ytPlaylistUrl');
const loadYtPlaylistBtn = document.getElementById('loadYtPlaylistBtn');

function setMode(mode) {
  sourceMode = mode;
  modeLocalBtn.classList.toggle('active', mode === 'local');
  modeYouTubeBtn.classList.toggle('active', mode === 'youtube');

  player.pause();
  if (ytPlayer && ytReady) ytPlayer.pauseVideo();

  // Swap which input is visible
  chooseFolderBtn.classList.toggle('hidden', mode === 'youtube');
  ytLinkInput.classList.toggle('hidden', mode === 'local');

  if (mode === 'local') {
    renderPlaylist();
  }
}

// Extract a playlist ID from any pasted YouTube URL format
function extractPlaylistId(url) {
  const match = url.match(/[?&]list=([^&]+)/);
  return match ? match[1] : null;
}

loadYtPlaylistBtn.addEventListener('click', () => {
  const url = ytPlaylistUrlInput.value.trim();
  const playlistId = extractPlaylistId(url);

  if (!playlistId) {
    alert('Could not find a playlist ID in that link. Make sure it includes "?list=..."');
    return;
  }

  // loadYtPlaylistBtn.textContent = 'Loading...';

  if (!ytPlayer) {
    loadYouTubeAPI(playlistId); // pass the ID through so it's ready once the API loads
  } else {
    ytPlayer.loadPlaylist(playlistId);
  }

  // fetchYouTubePlaylist(playlistId).finally(() => {
  //   loadYtPlaylistBtn.textContent = 'Load';
  // });
});



// MUSIC FOLDER PLAYER JS -------------------------------------------------------------
const folderInput = document.getElementById('folderInput');
const chooseFolderBtn = document.getElementById('chooseFolderBtn');
const player = document.getElementById('player');
const nowPlaying = document.getElementById('nowPlaying');
const playlistEl = document.getElementById('sidebarplaylist');

let songs = [];
let currentIndex = 0;

chooseFolderBtn.addEventListener('click', () => folderInput.click());

folderInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files).filter(f => f.type.startsWith('audio/'));

  if (files.length === 0) {
    alert('No audio files found in that folder.');
    return;
  }
  // Extract folder name from the first file's relative path
  const folderName = files[0].webkitRelativePath.split('/')[0];
  chooseFolderBtn.textContent = `📁 ${folderName}`;

  songs = files.map(file => ({
  name: cleanSongName(file.name),
  url: URL.createObjectURL(file)
  }));

  renderPlaylist();
  loadSong(0);
});

// cleanSongName("Song Name 320kbps.mp3")        // "Song Name"
// cleanSongName("Track - (320 KBPS).mp3")       // "Track -"
// cleanSongName("My Song [128kbps].mp3")        // "My Song"
// cleanSongName("Artist - Title 192.mp3")       // "Artist - Title"

function cleanSongName(filename) {
  return filename
    .replace(/\.[^/.]+$/, '')                          // remove extension
    .replace(/\[?\(?\b\d{2,4}\s?kbps\b\)?\]?/gi, '')     // remove "320kbps", "(320 kbps)", "[128kbps]" etc
    .replace(/\[?\(?\b(320|256|192|128|64)\b\)?\]?/gi, '') // remove bare bitrate numbers left over
    .replace(/\s{2,}/g, ' ')                             // collapse leftover double spaces
    .trim();                                              // trim leading/trailing spaces/dashes
}

// function renderPlaylist() {
//   playlistEl.innerHTML = '';
//   songs.forEach((song, index) => {
//     const li = document.createElement('li');
//     li.addEventListener('click', () => loadSong(index));
//     playlistEl.appendChild(li);
//   });
// }

function loadSong(index) {
  currentIndex = index;
  const song = songs[currentIndex];
  player.src = song.url;
  player.play();
  nowPlaying.textContent = `${song.name}`;
}

player.addEventListener('ended', () => {
  currentIndex = (currentIndex + 1) % songs.length;
  loadSong(currentIndex);
});


// --- BUTTON CONTROLS ---

const allButtons = document.querySelectorAll('.Buttons button');
const playBtn = document.getElementById('play');
const pauseBtn = document.getElementById('pause');
const nextBtn = document.getElementById('next');
const prevBtn = document.getElementById('previous');

// --- Click sound (plays instantly on press) ---
const clickSound = new Audio('Audio/Button_press1.mp3');
clickSound.volume = 0.4;

function playClickSound() {
  clickSound.currentTime = 0;
  clickSound.play();
}

allButtons.forEach(btn => {
  btn.addEventListener('pointerdown', playClickSound);
});

// --- Active state helper ---
function setActiveButton(btn) {
  allButtons.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// --- Play ---
playBtn.addEventListener('click', () => {
  if (sourceMode === 'local') {
    player.play();
  } else if (ytReady) {
    ytPlayer.playVideo();
  }
});

// --- Pause ---
pauseBtn.addEventListener('click', () => {
  if (sourceMode === 'local') {
    player.pause();
  } else if (ytReady) {
    ytPlayer.pauseVideo();
  }
});

// --- Next (flashes active briefly, since it's a momentary action) ---
nextBtn.addEventListener('click', (e) => {
  if (sourceMode === 'local') {
    currentIndex = getNextIndex();
    loadSong(currentIndex);
  } else if (ytReady) {
    ytPlayer.nextVideo();
  }
  setActiveButton(e.currentTarget);
  setTimeout(() => e.currentTarget.classList.remove('active'), 200);
});

// --- Previous (same momentary flash) ---
prevBtn.addEventListener('click', (e) => {
  if (sourceMode === 'local') {
    currentIndex = getPrevIndex();
    loadSong(currentIndex);
  } else if (ytReady) {
    ytPlayer.previousVideo();
  }
  setActiveButton(e.currentTarget);
  setTimeout(() => e.currentTarget.classList.remove('active'), 200);
});

player.addEventListener('ended', () => {
  currentIndex = getNextIndex();
  loadSong(currentIndex);
});

// SHUFFLER -----------------------------------------------------------------------
const shuffleBtn = document.getElementById('shuffleBtn');
let shuffleMode = false;
let shuffledOrder = [];

shuffleBtn.addEventListener('click', () => {
  shuffleMode = !shuffleMode;
  shuffleBtn.classList.toggle('active', shuffleMode);

  if (shuffleMode) {
    shuffledOrder = generateShuffledOrder();
  }
});

function generateShuffledOrder() {
  const indices = songs.map((_, i) => i).filter(i => i !== currentIndex);
  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return [currentIndex, ...indices]; // current song stays first, rest shuffled
}

function getNextIndex() {
  if (!shuffleMode) {
    return (currentIndex + 1) % songs.length;
  }

  const posInShuffle = shuffledOrder.indexOf(currentIndex);
  const nextPos = (posInShuffle + 1) % shuffledOrder.length;

  // reshuffle once we've looped through everything
  if (nextPos === 0) {
    shuffledOrder = generateShuffledOrder();
    return shuffledOrder[0];
  }

  return shuffledOrder[nextPos];
}

function getPrevIndex() {
  if (!shuffleMode) {
    return (currentIndex - 1 + songs.length) % songs.length;
  }

  const posInShuffle = shuffledOrder.indexOf(currentIndex);
  const prevPos = (posInShuffle - 1 + shuffledOrder.length) % shuffledOrder.length;
  return shuffledOrder[prevPos];
}

// SIDEBAR JS------------------------------------------------------------------------

const playlistSidebar = document.getElementById('playlistSidebar');
const playlistToggle = document.getElementById('playlistToggle');
const closeSidebar = document.getElementById('closeSidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

playlistToggle.addEventListener('click', () => {
  playlistSidebar.classList.add('open');
  sidebarOverlay.classList.add('visible');
});

function closeSidebarFn() {
  playlistSidebar.classList.remove('open');
  sidebarOverlay.classList.remove('visible');
}

closeSidebar.addEventListener('click', closeSidebarFn);
sidebarOverlay.addEventListener('click', closeSidebarFn);

// Updated renderPlaylist — adds "active" highlight + instant play on click
function renderPlaylist() {
  playlistEl.innerHTML = '';
  songs.forEach((song, index) => {
    const li = document.createElement('li');
    li.textContent = song.name;
    if (index === currentIndex) li.classList.add('active');

    li.addEventListener('click', () => {
      loadSong(index);
      closeSidebarFn(); // optional — closes sidebar after picking a song
    });

    playlistEl.appendChild(li);
  });
}

// Updated loadSong — re-renders playlist so the active highlight follows the current song
function loadSong(index) {
  currentIndex = index;
  const song = songs[currentIndex];
  player.src = song.url;
  player.play();
  nowPlaying.textContent = `${song.name}`;
  renderPlaylist(); // refresh so .active class updates to the new song
}



const volumeSlider = document.getElementById('volumeSlider');
const volumeIcon = document.getElementById('volumeIcon');

// Set initial volume to match the slider's starting value
player.volume = volumeSlider.value / 100;

volumeSlider.addEventListener('input', () => {
  const vol = volumeSlider.value / 100;

  if (sourceMode === 'local') {
    player.volume = vol;
  } else if (ytReady) {
    ytPlayer.setVolume(volumeSlider.value); // YouTube API uses 0–100, not 0–1
  }

  updateVolumeIcon(vol);
});

function updateVolumeIcon(vol) {
  if (vol === 0) {
    volumeIcon.textContent = '';
  } else if (vol < 0.5) {
    volumeIcon.textContent = '';
  } else {
    volumeIcon.textContent = '';
  }
}

// Optional: click the icon to mute/unmute, remembering last volume
let lastVolume = player.volume;

volumeIcon.addEventListener('click', () => {
  if (player.volume > 0) {
    lastVolume = player.volume;
    player.volume = 0;
    volumeSlider.value = 0;
  } else {
    player.volume = lastVolume;
    volumeSlider.value = lastVolume * 100;
  }
  updateVolumeIcon(player.volume);
});
