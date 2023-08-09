//Background comms
 var port = chrome.runtime.connect({
      name: "RTC_Comms"
 });
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
  if (result.project.slug){

    let projectCell = document.getElementById('project-cell')
    projectCell.innerHTML = result.project.slug

    let daysCell = document.getElementById('days-cell')
    daysCell.innerHTML = data.days

    let curDaysCell = document.getElementById('cur-days-cell')
    curDaysCell.innerHTML = result.project.day

    let newDay = document.getElementById("new-day");
    newDay.setAttribute("max", data.days);

    let changeDay = document.getElementById("change-day");
    changeDay.addEventListener('click', async (e) => {
      e.preventDefault()
      console.log("Going to " + newDay.value)
      result.project.day = newDay.value
      console.log(result.project)
      await chrome.storage.local.set({project: result.project})
      port.postMessage('refresh')

    })
  }
}

get_info()