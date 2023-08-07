
const tabCache = [];
const projectCache = {};
const historyCache = []
// const base_url = "https://plugin.arebyte.com/";
const base_url = "https://dev.10pm.studio/arebyte-ext/"
// const base_url = "http://localhost/wrong/"

// init local cache for when service worker reloads
const initTabCache = chrome.storage.local.get().then((items) => {
    if(tabCache.length == 0){
        console.log('tabCache is empty')
        Object.assign(tabCache, items.open_tabs);
    }
});

const initProjectCache = chrome.storage.local.get().then((items) => {
    console.log('projectCache is empty')
    if(Object.keys(projectCache).length === 0){
        Object.assign(projectCache, items.cur_project);
    }
});

const initHistoryCache = chrome.storage.local.get().then((items) => {
    if(historyCache.length === 0){
        Object.assign(historyCache, items.history);
    }
});

// Clear Window cache + create alarms on install
chrome.runtime.onInstalled.addListener(function () {
    // Assume no popups reopened on restart... not needed??
    // chrome.storage.local.set({'open_tabs':[]})
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
 chrome.runtime.onConnect.addListener(function(port) {
      port.onMessage.addListener(async function(msg) {
           console.log("message recieved: " + msg);
           if (msg === 'pause_toggle'){
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
           } else if (msg === 'close_all'){
               closeAll();
           } else if (msg === 'unload') {
                await chrome.alarms.clearAll()
                await chrome.storage.local.remove('project')
                // clear the local cache!
                Object.getOwnPropertyNames(projectCache).forEach(function (prop) {
                  delete projectCache[prop];
                });
                // console.log(projectCache)
                create_alarms(true, true);
           } else {
                let trigger = JSON.parse(msg);
                if (Object.keys(trigger).includes('slug')){
                    console.log('Loading: '+trigger.slug)
                    await store_project(trigger.slug, null, )
                    create_alarms(true);
                } else {
                    openWindow(trigger.dims, trigger.fullscreen, trigger.url)
                }
               
           }
      });
 });

// Close all

async function closeAll() {
    let tabs = await chrome.storage.local.get('open_tabs')
    console.log(tabs);
    let windows = await chrome.windows.getAll()
    windows.forEach((window) => {
        if (tabs && tabs.open_tabs.includes(window.id)){
           chrome.windows.remove(window.id);
        }
    });
    chrome.storage.local.set({'open_tabs': []})
}
 
 
 //Pause
function pause_toggle() {
    chrome.storage.local.get(['paused'], async function(result) {
        let paused = result.paused;
        let today = new Date()
        if (paused === null || paused === false) {
            chrome.storage.local.set({paused: today.getTime()});
            chrome.action.setBadgeText({text:"mute"});
            console.log("Paused");
        } else {
            // let diff = paused - let cur_ts = new Date().getTime();
            // let days = Math.floor(86400000 / diff)
            await chrome.storage.local.set({paused: false, selfUpdated: today.getDay()});
            chrome.action.setBadgeText({text:""});
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
                let alarm_times = [];
                alarms.forEach(function(alarm) {
                    if (alarm.name !== "refresh") {
                        alarm_times.push(alarm.scheduledTime);
                    }
                });
                alarm_times.sort(function(a, b){return a - b;});
                let next_alarm_time = alarm_times[0];
                console.log(next_alarm_time);
                let next_ts = next_alarm_time;
                let next_popup_name = 'nextPopup';
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
    let optionsDictionary = {url: url, type: "popup"};
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

const get_display = async () => {
    let displayInfo = await chrome.system.display.getInfo()
    let window_info = {
        'screen':{
            'availHeight': displayInfo[0].bounds.height,
            'availWidth': displayInfo[0].bounds.width
        }
    }
    return window_info
}

get_display()

const popupWindow = async (popup_json) => {
    infoWindow(popup_json);
    let fullscreen = popup_json.fullscreen === "true";
    if (fullscreen) {
       var dims = []; 
    } else {
        let window = await get_display()
        let height = parseInt(popup_json.height);
        let width = parseInt(popup_json.width);
        console.log(popup_json.position);
        const pos_arr = popup_json.position.split("-");
        console.log(pos_arr);
//                vertical
        if (pos_arr[0] === "top"){
            var top = 0;
        } else if (pos_arr[0] === "mid") {
            let vPosition = (window.screen.availHeight) ? (window.screen.availHeight-height)/2 : 0;
            var top = vPosition;
        } else if (pos_arr[0] === "bottom"){
            let vPosition = window.screen.availHeight-height;
            var top = vPosition;
        }
//                horizontal
        if (pos_arr[1] === "left") {
            var left = 0;
        } else if (pos_arr[1] === "center") {
            let hPosition = (window.screen.availWidth) ? (window.screen.availWidth-width)/2 : 0;
            var left = hPosition;
        } else if (pos_arr[1] === "right"){
            let hPosition = window.screen.availWidth-width;
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
    store_tab(id)
    console.log("opened window with id:"+id);
};

const infoWindow = async (popup_json) => {
    let window = await get_display()
    let width = 450;
    let height = window.screen.availHeight;
    let dims = [
      window.screen.availWidth - width,
      0,
      width,
      height
    ];
    let id = await openWindow(dims, false, popup_json.info_url);
    store_tab(id)
};

//Storage access

const store_tab = async (id) => {
    await initTabCache;
    tabCache.push(id)
    await chrome.storage.local.set({'open_tabs': tabCache})
    console.log(tabCache)
}

const store_project = async (slug=null, day=null) =>{
    await initProjectCache;
    if (slug) {
        projectCache.slug = slug
        let now = new Date()
        projectCache.start = now.getTime()
    }
    if (day) {
        if (!projectCache.day){
           projectCache.day = 1 
        } else {
            projectCache.day += day
            if (projectCache.day < 1){
               projectCache.day = 1 
            }
        }
    } else if (slug && !day) {
       projectCache.day = 1 
    }

    await chrome.storage.local.set({'project': projectCache})
    console.log(projectCache)
}

const store_history = async (slug) => {
    await initHistoryCache;
    historyCache.push(slug)
    chrome.storage.local.set({'history': historyCache})
    console.log(historyCache)
}
//

var create_alarms = async (force=false, refresh=false) => {  
    // get existing storage
    let result = await chrome.storage.local.get(['lastUpdate', 'paused', 'selfUpdated', 'project', 'history'])
    console.log('result', result)
    // get popups
    let project_url
    if (result.project && result.project.slug && result.project.day && !refresh){
        project_url = base_url+'invites.json?project='+result.project.slug+'&day='+result.project.day
    } else  {
        project_url = base_url+'invites.json'
    }
    console.log("force=" + force);
    let response = await fetch(project_url, {mode: 'cors'})
    if (response.status !== 200) {
      console.log('Looks like there was a problem. Status Code: ' +
        response.status);
      return;
    }
    // Examine the text in the response
    let data = await response.json()
    // Store project data if not there
    if (! result.project) { // This only triggers for auto-launched projects
        // return if project has been viewed before
        if (result.history && result.history.includes(data.project)){
            console.log('Project has been viewed before, not loading')
            return
        } else {
            store_project(data.project)
        }
        
    }
    var today = new Date().getDay();
    console.log(result['selfUpdated']);
    // has popup data changed or are alarms from yesterday?
    if(result['lastUpdate'] !== data.lastUpdate || result.selfUpdated !== today || force) {
        chrome.storage.local.clear();
        chrome.storage.local.set({paused: result.paused});
        chrome.storage.local.set({lastUpdate: data.lastUpdate});
        chrome.storage.local.set({nextPopup: data.next_popup});
        chrome.storage.local.set({history: result.history})
        await chrome.storage.local.set({project: result.project})
        // If new day add day to project storage
        if (result.selfUpdated && result.selfUpdated !== today) {
            //Check if it's the last day 
            if (result.project && (result.project.day + 1) > data.days){
                console.log('Last day...')
                await chrome.storage.local.remove('project');
                store_history(data.project)
            } else {
                store_project(null, 1)
            }
            await chrome.storage.local.set({selfUpdated: today});
        } else if (!result.selfUpdated){
            await chrome.storage.local.set({selfUpdated: today});
        }
        // Sort popups by time
        data.popups.sort((a, b) => a < b);
        // Is first popup before load time?
        let first_time = data.popups[0].time.split(":")
        let first_date = new Date()
        first_date.setHours(first_time[0], first_time[1], first_time[2])
        let first_ts = first_date.getTime()
        let { project } = await chrome.storage.local.get('project')
        let delay = 0
        // If so add one day
        if (project.start && project.start > first_ts){
            delay = 1
        }
        console.log('sorted popups', data.popups)
        // Create alarms and store popup info
        chrome.alarms.clearAll();
        data.popups.forEach( async function(popup){
           let sdict = {};
           sdict[popup.id] = popup;
           chrome.storage.local.set(sdict);
           let time = popup.time.split(":");
           let hour = time[0];
           let min = time[1];
           let secs = time[2]
           await create_alarm(hour, min, secs, delay, popup.id);
        });
        // log
        chrome.alarms.getAll(function(alarms) {
            console.log("popups remaining: " + alarms.length)
            alarms.forEach(function(alarm) {
               let alarm_time = new Date(alarm.scheduledTime);
               console.log("Alarm: "+alarm.name+", Time: "+alarm_time); 
            });
        });
        // create refresh alarm
        let alarm_info = {
            delayInMinutes:5,
            periodInMinutes:5
        };
        chrome.alarms.create('refresh', alarm_info);
        // log
        chrome.storage.local.get(function(storage){
            console.log(storage);
        }); 
    };

}


var create_alarm =  async (hour, min, secs, delay, id) => {
    let now = new Date();
    now.setDate(now.getDate() + delay)
    // Alarm today:
    now.setHours(hour,min,secs);
//    now.setMinutes(now.getMinutes() + times[pos]); // For debug
    // As UTC timestamp:
    let new_time = now.getTime();
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
        await chrome.alarms.create(id, alarm_info);
        // console.log("creating alarm for "+id+" at "+new_time);
    };
    
};

chrome.alarms.onAlarm.addListener(function(alarm) {
    if (alarm.name == 'refresh') {
        // Don't update if there's a popup in the next 2 minutes...
        chrome.alarms.getAll(function (alarms) {
            alarms.sort(function(a, b){return a.scheduledTime - b.scheduledTime;});
            console.log(alarms);
            let popup_alarms = alarms.filter(alarm => alarm.name != "refresh");
            let next_alarm = popup_alarms[0];
            // console.log(next_alarm_time);
            let now = new Date().getTime();
            if (next_alarm){
                console.log((next_alarm.scheduledTime - now))
            }
            if (next_alarm && (next_alarm.scheduledTime - now) < 270000) {
                console.log("Next popup in less than 4.5 mins")
            } else {
                console.log('refreshing');
                create_alarms();
            }
        });
    } else {
        chrome.storage.local.get('paused', function(result){
            console.log(result);
            if (result['paused'] === null || result['paused'] === false) {
                console.log("Triggered:"+alarm.name);
                let alarm_offset = Date.now() - alarm.scheduledTime;
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
