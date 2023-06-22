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
        outputString = 'nothing, spotfiy is closed right now, come back later :)'
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
        outputString = `<span class="songtitle"><a class="link" href="${link}">${title}</a></span><br><br>by <span class="songartist"><a class="link" href="${link}">${artist}</a></span><br><br><div id="elapsed"></div>`; // Example string interpolation
    }
    dataContainer.innerHTML = outputString;
}

window.addEventListener('DOMContentLoaded', (event) => {
    
    function fetchData() {
        return fetch('https://ba-api-eta.vercel.app/song') // Replace with your API endpoint
        .then(response => response.json())
        .catch(error => {
            // Handle any errors that occurred during the request
            console.error('Error:', error);
            return error;
        });
    }

        /// Fetch the data and use it within the event listener
    fetchData().then(data => {
        displayArt(data)
        displaySong(data)
        let at = data.at; // Replace with the actual property from the API response
        let length = data.length;
        let lengthMin = millisToMinutesAndSeconds(data.length); // Replace with the actual property from the API response

        
        // Update the elapsed time every second
        function updateElapsedTime() {
            at += 1000

            // Check if the elapsed time has exceeded the length
            if (at >= length) {
                // Reset the elapsed time and re-fetch the data
                at = 0;
                fetchData().then(newData => {
                    at = newData.at;
                    length = newData.length;
                    lengthMin = millisToMinutesAndSeconds(newData.length);
                    displayArt(newData)
                    displaySong(newData)
                });
            }


            const elapsedSeconds = Math.floor(at / 1000);
            // Calculate the minutes and seconds
            const elapsedMinutes = Math.floor(elapsedSeconds / 60);
            const formattedTime = elapsedMinutes.toString().padStart(2, '0') + ':' + (elapsedSeconds % 60).toString().padStart(2, '0') + ' / ' + lengthMin;

            // Update the HTML element with the elapsed time
            document.getElementById('elapsed').textContent = formattedTime;
            }

        // Call the updateElapsedTime function every second
        setInterval(updateElapsedTime, 1000);
    });
  });