// script.js
fetch('https://ba-api-eta.vercel.app/song') // Replace with your API endpoint
  .then(response => response.json())
  .then(data => {
    // Process the API response data
    displayArt(data)
    displaySong(data)
    console.log(data); // Example: Log the data to the console
  })
  .catch(error => {
    // Handle any errors that occurred during the request
    console.error('Error:', error);
  });

function millisToMinutesAndSeconds(millis) {
    var minutes = Math.floor(millis / 60000);
    var seconds = ((millis % 60000) / 1000).toFixed(0);
    return (
        seconds == 60 ?
        (minutes+1) + ":00" :
        minutes + ":" + (seconds < 10 ? "0" : "") + seconds
      );
}

function displayArt(data) {
    const imgContainer = document.getElementById('artwork');
    const art = data.cover;
    const id = data.id;
    const link=`https://open.spotify.com/track/${id}`

    if (id === undefined) {
        outputString = 'nothing, spotfiy is closed right now :('
    } else {
        outputString = `<a href="${link}"><img class="artwork" src="${art}" onerror="if (this.src != 'error.png') this.src = 'error.png';"></a>`
    }

    imgContainer.innerHTML = outputString;
}

function displaySong(data) {
    const dataContainer = document.getElementById('music');
    const title = data.title;
    const artist = data.artist;
    const url = data.url;
    const at = millisToMinutesAndSeconds(data.at);
    const id = data.id;
    const length = millisToMinutesAndSeconds(data.length);

    const link=`https://open.spotify.com/track/${id}`

    if (id === undefined) {
        outputString = ''
    } else {
        outputString = `<span class="songtitle"><a class="link" href="${link}">${title}</a></span><br><br>by <span class="songartist"><a class="link" href="${link}">${artist}</a></span><br><br>${at} / ${length}`; // Example string interpolation
    }
    dataContainer.innerHTML = outputString;
}