// Get about text
    // let url = "https://dev.10pm.studio/arebyte-ext/info.json"
    let url = 'https://plugin.arebyte.com/info.json'
    fetch(url, {mode: 'cors'})
    .then(
      function(response) {
        if (response.status !== 200) {
          console.log('Looks like there was a problem. Status Code: ' +
            response.status);
          return;
        }
        // Examine the text in the response
        response.json().then(function(data) {
            about_div = document.getElementById('about-text');
            about_div.innerHTML = data.about;
        });
      }
    )
    .catch(function(err) {
      console.log('Fetch Error :-S', err);
    });

//Background comms
 var port = chrome.runtime.connect({
      name: "RTC_Comms"
 });

// Heartbeat command to keep background alive
setInterval( () => { port.postMessage("keep_alive") }, 10000)

buttons = document.querySelectorAll('.send');

buttons.forEach(function(currentBtn){
  currentBtn.onclick = () =>  {
      port.postMessage(currentBtn.id);
      window.close();
  };
});

//launch live || all artists
var trigger_counter = 0;
var refresh_counter = 0;
var debug_counter = 0;
var close_counter = 0;

var paused;

var container = document.querySelector(".container");

var body = document.querySelector("body");

const navButtons = document.querySelectorAll('.nav-link');

const backButtons = document.querySelectorAll('.back-button');

navButtons.forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      const targetId = event.target.href.split('#')[1];
      const targetElement = document.getElementById(targetId);
      targetElement.scrollTo(0,0);
      targetElement.classList.add('is-active');
      targetElement.addEventListener('transitionend', () => {
        targetElement.querySelector('.back-button').focus();
      });
      const targetIdName = `${targetId}--open`;
      document.body.classList.add(targetIdName);
    });
  });

  backButtons.forEach(button => {
    button.addEventListener('click', event => {
        event.preventDefault();
      const parentContainer = event.target.closest('.container');
      parentContainer.classList.remove('is-active');
      const containerId = parentContainer.id;
      document.body.classList.remove(`${containerId}--open`);
    });
  });


document.addEventListener('keydown', logKey);

function logKey(e) {
  if (e.code === "KeyN"){
      trigger_counter += 1;
      if (trigger_counter > 3) {
           port.postMessage("next_popup");
           trigger_counter = 0;
      }
  } else if (e.code === "KeyR"){
      refresh_counter += 1;
      if (refresh_counter > 3) {
           port.postMessage("refresh");
           window.close();
      }
  } else if (e.code === "KeyD"){
      debug_counter += 1;
      if (debug_counter > 3) {
           port.postMessage("debug");
           window.close();
      }
  } else if (e.code === "KeyC"){
      close_counter += 1;
      if (close_counter > 3) {
           port.postMessage("close_all");
           window.close();
      }
  }
}

// Start timer text
function startTimer(next_ts) {
    var x = setInterval(function() {
        // Get today's date and time
        var now = new Date().getTime();

        // Find the distance between now and the count down date
        var distance = next_ts - now;

        // Time calculations for days, hours, minutes and seconds
        var days = Math.floor(distance / (1000 * 60 * 60 * 24));
        var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        hours += (days * 24);
        var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.floor((distance % (1000 * 60)) / 1000);
        // Display the result in the element with id="demo"
        countdown_str = ('0' + hours).slice(-2) + ":" + ('0' + minutes).slice(-2) + ":" + ('0' + seconds).slice(-2);
        document.getElementById("timer").innerHTML = countdown_str;
        // If the count down is finished, write some text
        if (distance < 0) {
          clearInterval(x);
        }
    }, 1000);
}

//pause state
var pause_button = document.getElementById("pause");

chrome.storage.local.get(['paused'], function(result) {
    paused = result.paused;
    if (paused === null || paused === false) {
        pause_button.checked = true;
    } else {
        pause_button.checked = false;
    }
    checkStatus();
});



function checkStatus(){
    if(paused){
        container.classList.add("paused");
    }else{
        container.classList.remove("paused");
    }
}

pause_button.addEventListener( 'change', function() {
    port.postMessage("pause_toggle");
    if (pause_button.checked === true) {
        paused = false;
        checkStatus();
    } else {
        paused = true;
        checkStatus();
    }
});

// close all

const close_button = document.getElementById("close_all")

close_button.addEventListener('click', (e) => {
    e.preventDefault()
    port.postMessage("close_all");
})

// 

var set_title = document.getElementById('popup-set-title');
var title = document.getElementById('popup-title');
var time = document.getElementById('popup-time');
var day = document.getElementById('popup-day');
var next_ts = null;


chrome.alarms.getAll( function (alarms) {
    alarm_times = [];
    alarms.forEach(function(alarm) {
        if (alarm.name !== "refresh") {
            alarm_times.push(alarm.scheduledTime);
        }
    });
    alarm_times.sort(function(a, b){return a - b;});
    next_alarm_time = alarm_times[0];
    console.log(next_alarm_time);
    next_ts = next_alarm_time;
    next_popup_name = false;
    alarms.every(function(alarm) {
        if (alarm.scheduledTime === next_alarm_time) {
            next_popup_name = alarm.name;
            return false;
        } else {
            return true;
        }
    });
    if (next_popup_name) {
        chrome.storage.local.get([next_popup_name], function(result) {
                next_popup = result[next_popup_name];
                console.log(next_popup);
                set_title.innerHTML = next_popup.title;
                title.innerHTML = next_popup.popup_title;
                time.innerHTML = next_popup.time;
                day.innerHTML = next_popup.day;
                startTimer(next_ts);
        });
    } else {
        chrome.storage.local.get(['nextPopup'], function(result) {
            next_popup = result['nextPopup'];
            console.log(next_popup);
            if (! next_popup || next_popup === null) {
                set_title.innerHTML = "No popups currently scheduled...";
            } else {
                let next_time = next_popup.time.split(":");
                let next_date = new Date()
                next_date.setDate(next_date.getDate()+next_popup.diff)
                next_date.setHours(next_time[0])
                next_date.setMinutes(next_time[1])
                next_ts = next_date.getTime();
                console.log(next_popup.time);
                set_title.innerHTML = next_popup.title;
                title.innerHTML = next_popup.popup_title;
                time.innerHTML = next_popup.time;
                day.innerHTML = next_popup.day;
                startTimer(next_ts);
            }
        });
    }
});



