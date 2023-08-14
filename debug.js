//Background comms
 var port = chrome.runtime.connect({
      name: "RTC_Comms"
 });
 // Heartbeat command to keep background alive
setInterval( () => { port.postMessage("keep_alive") }, 10000)

// const base_url = "https://plugin.arebyte.com/";
const base_url = "https://dev.10pm.studio/arebyte-ext/"
// const base_url = "http://localhost/wrong/"

// get existing storage

const get_info = async () => {
  let result = await chrome.storage.local.get(['lastUpdate', 'paused', 'selfUpdated', 'project', 'history'])
  console.log('result', result)
  // get popups
  let project_url
  if (result.project && result.project.slug && result.project.day){
      project_url = base_url+'invites.json?project='+result.project.slug+'&day='+result.project.day
  } else  {
      project_url = base_url+'invites.json'
  }
  let response = await fetch(project_url, {mode: 'cors'})
  if (response.status !== 200) {
    console.log('Looks like there was a problem. Status Code: ' +
      response.status);
    return;
  }
  // Examine the text in the response
  let data = await response.json()
  console.log(data)
  if (result.project && result.project.slug){

    let projectCell = document.getElementById('project-cell')
    projectCell.innerHTML = result.project.slug + ' '

    let clear = document.getElementById('clear-button')
    clear.addEventListener('click', async (e) =>{
      e.preventDefault()
      port.postMessage('unload')
      location.reload()
    })
    
    document.getElementById('days-cell').innerHTML = data.days

    document.getElementById('cur-days-cell').innerHTML = result.project.day

    document.getElementById("new-day").setAttribute("max", data.days);

    let changeDay = document.getElementById("change-day");
    changeDay.addEventListener('click', async (e) => {
      e.preventDefault()
      let newDay = document.getElementById('new-day')
      console.log("Going to " + newDay.value)
      result.project.day = newDay.value
      if (newDay.value == 1){
        let new_ts = new Date().getTime()
        result.project.start = new_ts
      }
      console.log(result.project)
      await chrome.storage.local.set({project: result.project})
      port.postMessage('refresh')

    })
  }

  let displayInfo = await chrome.system.display.getInfo()
  document.getElementById('width-cell').innerHTML = displayInfo[0].bounds.width
  document.getElementById('height-cell').innerHTML = displayInfo[0].bounds.height

  let { history } = await chrome.storage.local.get('history')

  if (history && Array.isArray(history)){
    let history_str = history.join(', ')
    document.getElementById('history-cell').innerHTML = history_str
  }

  let clearHistory = document.getElementById('clear-history');
  clearHistory.addEventListener('click', async (e) => {
    e.preventDefault()
    await chrome.storage.local.remove('history')
    port.postMessage('refresh')
    document.getElementById('history-cell').innerHTML = ''
  })



}

get_info()