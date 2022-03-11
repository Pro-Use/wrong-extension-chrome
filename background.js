var popups = [];
var queue = [];

// Clear Window cache + create alarms on install
chrome.runtime.onInstalled.addListener(function () {
    chrome.storage.local.set({paused: false});
    create_alarms(true);
    update_icon_text();
});

// Clear Window cache + create alarms on restart
chrome.runtime.onStartup.addListener(function () {
    chrome.storage.local.get(['paused'], function(result) {
        if (result.paused === false) {
            create_alarms(true);
            update_icon_text();
        }
    });
});

// Update alarms on system idle update
chrome.idle.onStateChanged.addListener(function() {
    chrome.storage.local.get(['paused'], function(result) {
        if (result.paused === false) {
            create_alarms(true); 
        }
    });
});

// Popup comms
 chrome.extension.onConnect.addListener(function(port) {
      port.onMessage.addListener(async function(msg) {
           console.log("message recieved: " + msg);
           if (msg === "ctrl-link") {
                arebyteWindow();          
           } else if (msg === 'pause_toggle'){
               pause_toggle();
           } else if (msg === 'next_popup'){
               var next_popup = await nextPopup();
               console.log(next_popup);
               chrome.storage.local.get([next_popup], function(result) {
                   console.log(result[next_popup]);
                   popupWindow(result[next_popup]);
                });
           } else if (msg === 'refresh'){
               create_alarms(true);
           } else {
               manual_popup = JSON.parse(msg);
               openWindow(manual_popup.dims, manual_popup.fullscreen, manual_popup.url)
           }
      });
 });
 //update window ID store
 
 function updateStorage() {
    if (!queue.length || updateStorage.running) {
        return;
    }
    updateStorage.running = true;
    chrome.storage.local.get('window_ids', data => {
        data.window_ids = [].concat(data.window_ids, queue);
        queue = [];
        chrome.storage.local.set(data, () => {
          updateStorage.running = false;
          if (queue.length) updateStorage();
        });
    });
}

// Close all

function closeAll() {
    chrome.storage.local.get('window_ids', data => {
        console.log(data.window_ids);
        chrome.windows.getAll(windows => {
           windows.forEach((window) => {
               if (data.window_ids.includes(window.id)){
                   console.log(window.id);
                   chrome.windows.remove(window.id);
               }
           });  
        });
    });
}
 
 
 //Pause
function pause_toggle() {
    chrome.storage.local.get(['paused'], function(result) {
        paused = result.paused;
        if (paused === null || paused === false) {
            chrome.storage.local.set({paused: true});
            chrome.browserAction.setBadgeText({text:""});
            console.log("Paused");
        } else {
            chrome.storage.local.set({paused: false});
            create_alarms();
            update_icon_text();
            console.log("Unpaused");
            
        }
    });
    
 }
 
 //Popup functions
 
 function nextPopup() {
    return new Promise((resolve, reject) => {
        try {
          chrome.alarms.getAll(function (alarms) {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else {
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
                next_popup_name = 'nextPopup';
                alarms.every(function(alarm) {
                    if (alarm.scheduledTime === next_alarm_time) {
                        next_popup_name = alarm.name;
                        return false;
                    } else {
                        return true;
                    }
                });
                resolve(next_popup_name);
            }
          });
        } catch (error) {
            reject (error);
        };
    });
 }
 
 function openWindow(dims, fullscreen, url) {
    optionsDictionary = {url: url, type: "popup"};
    if (fullscreen) {
        optionsDictionary.state = "fullscreen";
    } else {
        optionsDictionary.left = parseInt(dims[0]);
        optionsDictionary.top = parseInt(dims[1]);
        optionsDictionary.width = parseInt(dims[2]);
        optionsDictionary.height = parseInt(dims[3]);

    }
    return new Promise((resolve, reject) => {
        try {
          chrome.windows.create(optionsDictionary, function (newWindow) {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else {
              let new_id = newWindow.id;
              console.log(newWindow);
              resolve(new_id);
            }
          });
        } catch (error) {
            reject (error);
        };
    });
}

popupWindow = async (popup_json) => {
    infoWindow(popup_json);
    let fullscreen = popup_json.fullscreen === "true";
    if (fullscreen) {
       var dims = []; 
    } else {
        height = parseInt(popup_json.height);
        width = parseInt(popup_json.width);
        console.log(popup_json.position);
        const pos_arr = popup_json.position.split("-");
        console.log(pos_arr);
//                vertical
        if (pos_arr[0] === "top"){
            var top = 0;
        } else if (pos_arr[0] === "mid") {
            vPosition = (window.screen.availHeight) ? (window.screen.availHeight-height)/2 : 0;
            var top = vPosition;
        } else if (pos_arr[0] === "bottom"){
            vPosition = window.screen.availHeight-height;
            var top = vPosition;
        }
//                horizontal
        if (pos_arr[1] === "left") {
            var left = 0;
        } else if (pos_arr[1] === "center") {
            hPosition = (window.screen.availWidth) ? (window.screen.availWidth-width)/2 : 0;
            var left = hPosition;
        } else if (pos_arr[1] === "right"){
            hPosition = window.screen.availWidth-width;
            var left = hPosition;
        }
        console.log(width, height, top, left);
        var dims = [
            left,
            top,
            width,
            height
        ];

    };
    var id = await openWindow(dims, fullscreen, popup_json.url);
    queue.push(id);
    updateStorage();
    console.log("opened window with id:"+id);
};

infoWindow = async (popup_json) => {
    let width = 450;
    let height = window.screen.availHeight;
    let dims = [
      window.screen.availWidth - width,
      0,
      width,
      height
    ];
    let id = await openWindow(dims, false, popup_json.info_url);
    queue.push(id);
    updateStorage();
};

prWindow = async (artist) => {
    let width = 800;
    let height = window.screen.availHeight - 100;
    let dims = [
      (window.screen.availWidth - width) / 2,
      (window.screen.availHeight - height) / 2,
      width,
      height
    ];
    url = "/popups/info/press_release_window.html";
    if (artist) url += "#" + artist;
    let id = await openWindow(dims, false, url);
    queue.push(id);
    updateStorage();
};

arebyteWindow = async() => {
    let width = window.screen.availWidth - 100;
    let height = window.screen.availHeight - 100;
    let dims = [
      (window.screen.availWidth - width) / 2,
      (window.screen.availHeight - height) / 2,
      width,
      height
    ];
    let url = "https://www.arebyte.com/real-time-constraints";
    let id = await openWindow(dims, false, url);
    queue.push(id);
    updateStorage();
};


var create_alarms = (force=false) => {
    // works
    console.log("force=" + force);
    fetch('https://plugin.arebyte.com/invites.json', {mode: 'cors'})
    .then(
      function(response) {
        if (response.status !== 200) {
          console.log('Looks like there was a problem. Status Code: ' +
            response.status);
          return;
        }
        // Examine the text in the response
        response.json().then(function(data) {
          chrome.storage.local.get(['lastUpdate', 'paused', 'selfUpdated'], function(result) {
            var today = new Date().getDay();
            console.log(result['selfUpdated']);
            // has popup data changed or are alarms from yesterday?
            if(result['lastUpdate'] !== data.lastUpdate || result['selfUpdated'] !== today || force) {
                chrome.storage.local.clear();
                chrome.storage.local.set({paused: result['paused']});
                chrome.storage.local.set({lastUpdate: data.lastUpdate});
                chrome.storage.local.set({nextPopup: data.next_popup});
                chrome.storage.local.set({selfUpdated: today});
                chrome.alarms.clearAll();
                data.popups.forEach(function(popupSet){
                    popupSet.forEach(function(popup){
                       let sdict = {};
                       sdict[popup.id] = popup;
                       chrome.storage.local.set(sdict);
                       let time = popup.time.split(":");
                       let hour = time[0];
                       let min = time[1];
                       create_alarm(hour, min, popup.id);

                    });
                });
                // create refresh alarm
                let alarm_info = {
                    delayInMinutes:5,
                    periodInMinutes:5
                };
                chrome.alarms.create('refresh', alarm_info);
                // log
                chrome.alarms.getAll(function(alarms) {
                    alarms.forEach(function(alarm) {
                       alarm_time = new Date(alarm.scheduledTime);
                       console.log("Alarm: "+alarm.name+", Time: "+alarm_time); 
                    });
                });
                chrome.storage.local.get(function(storage){
                    console.log(storage);
                }); 
            };
          });
        });
      }
    )
    .catch(function(err) {
      console.log('Fetch Error :-S', err);
    });
 };


var create_alarm = (hour, min, id) => {
    let now = new Date();
    // Alarm today:
    now.setHours(hour,min,00);
//    now.setMinutes(now.getMinutes() + times[pos]); // For debug
    // As UTC timestamp:
    new_time = now.getTime();
    // Is it in the past? Add 1 day
    if (new_time > Date.now()) {
    // Is it less than a minute? Add a minute
        if ((new_time - Date.now()) < 60000 ) {
            new_time += 60000;
        }
//    console.log("Milliseconds till alarm " + (new_time - Date.now() ));
        let alarm_info = {
            when:new_time
        };
        chrome.alarms.create(id, alarm_info);
        console.log("creating alarm for "+id+" at "+new_time);
    };
    
};

chrome.alarms.onAlarm.addListener(function(alarm) {
    if (alarm.name == 'refresh') {
        console.log('refreshing');
        create_alarms();
    } else {
        chrome.storage.local.get('paused', function(result){
            console.log(result);
            if (result['paused'] === null || result['paused'] === false) {
                console.log("Triggered:"+alarm.name);
                alarm_offset = Date.now() - alarm.scheduledTime;
                console.log(alarm_offset);
                if (alarm_offset < 66000) {
                    chrome.storage.local.get([alarm.name], function(result) {
                        popupWindow(result[alarm.name]);
                    });
                    update_icon_text();
                    
                } else {
                    console.log("Missed " + alarm.name);
                    update_icon_text();
                }
            }
        });
    }
});

var update_icon_text = () => {
    // chrome.browserAction.setBadgeBackgroundColor({color:[0,0,0,1]});
    // chrome.browserAction.setBadgeText({text:hour.toString()+time_txt});
 };
