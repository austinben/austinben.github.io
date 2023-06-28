// script.js

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
        outputString = 'spotify is closed at the moment...'
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
        outputString = `<span class="songtitle"><a class="link" href="${link}">${title}</a></span><br><br>by <span class="songartist"><a class="link" href="${link}">${artist}</a></span><br><br><div id="elapsed"></div><br><div id="pause"></div>`; // Example string interpolation
    }
    dataContainer.innerHTML = outputString;
}

window.addEventListener('DOMContentLoaded', (event) => {
    
    function fetchData() {
        return fetch('https://ba-api-eta.vercel.app/song') // Replace with your API endpoint
        .then(response => response.json());
    }

        /// Fetch the data and use it within the event listener
    fetchData().then(data => {
        displayArt(data)
        displaySong(data)
        let at = data.at; // Replace with the actual property from the API response
        let length = data.length;
        let lengthMin = millisToMinutesAndSeconds(data.length); // Replace with the actual property from the API response
        let paused = data.paused
        updateElapsedTime()

        
        // Update the elapsed time every second
        function updateElapsedTime() {

            if (paused === false) {
                at += 1000
            }

            if (paused === true) {
                document.getElementById('pause').textContent = '[paused]';
            } else {
                document.getElementById('pause').textContent = '';
            }

            // Check if the elapsed time has exceeded the length
            if (at >= length) {
                // Reset the elapsed time and re-fetch the data
                at = 0;
                fetchData().then(newData => {
                    at = newData.at;
                    length = newData.length;
                    lengthMin = millisToMinutesAndSeconds(newData.length);
                    paused = newData.paused;
                    displayArt(newData)
                    displaySong(newData)
                });
            }

            let formattedTime = '';

            // Update the HTML element with the elapsed time
            if (length === undefined) {
                formattedTime = '';
            } else {
                const elapsedSeconds = Math.floor(at / 1000);
                // Calculate the minutes and seconds
                const elapsedMinutes = Math.floor(elapsedSeconds / 60);
                formattedTime = elapsedMinutes.toString().padStart(1, '0') + ':' + (elapsedSeconds % 60).toString().padStart(2, '0') + ' / ' + lengthMin;
            }

            document.getElementById('elapsed').textContent = formattedTime;
        
            }

            setInterval(updateElapsedTime, 1000);
    })
    .catch(error => {
        // Handle error from re-fetching data
        console.log('Error:', error);
    });
  });