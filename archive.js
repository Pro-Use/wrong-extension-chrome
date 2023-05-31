const archiveContainer = document.getElementById('archiveContainer');
const projectContainer = document.getElementById('projectContainer');
let archiveData;

fetch('archive.json')
  .then(response => response.json())
  .then(data => {
    archiveData = data;
    buildArchive(data);
  })
  .catch(err => console.log(err))


  function buildArchive(jsonArray) {
    let index = 0;
    jsonArray.forEach(function(item) {
      var title = item.title;
      var curator = item.curator;
      var from = item.from;
      var img = item.img || "/placeholder.svg";
      from = from.replace(/-/g, '.');
      var to = item.to;
      to = to.replace(/-/g, '.');
      var element = document.createElement("div");
      element.innerHTML = `
      <a class="archive-item info-item red-shadow box" href="#project" data-index="${index}">
        <div class="archive-item--info-layer">
            <div class="archive-item--text">
                <h3 class="archive-item--title">${title}</h3>
                <p class="subhead">Curated by ${curator}</p>
                <p class="subhead">${from} – ${to}</p>
            </div>
            <button class="archive-item--cta">
                <span class="button-text">View Project</span> 
                <svg width="23" height="10" viewBox="0 0 23 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M23 5L15.5 0.669873V9.33013L23 5ZM16.25 4.25L0 4.25V5.75L16.25 5.75V4.25Z" fill="white"/>
                </svg>
            </button>
        </div>
        <img src="${img}" class="background-image" />
      </a>
      `;
      archiveContainer.appendChild(element);
      
      index++;
    });
  }

  archiveContainer.addEventListener('click', (e) => {
    e.preventDefault();
    if (e.target.classList.contains('archive-item')) {
        e.preventDefault();
        console.log(window.pageXOffset);
        let index = e.target.dataset.index;
        buildProjectPage(archiveData[index]);
        openProjectPage(e);
    }
  });

  function buildProjectPage(item) {
    var title = item.title;
      var curator = item.curator;
      var from = item.from;
      var img = item.img || "/placeholder.svg";
      var text = item.text;
      var popups = item.popups;
      from = from.replace(/-/g, '.');
      var to = item.to;
      to = to.replace(/-/g, '.');
      var element = document.createElement("div");
      element.innerHTML = `
        <img src="${img}" class="project-image" />
        <div class="project-main padding">
            <div class="project-info-box red-shadow box bg-white">
                <h3 class="archive-item--title">${title}</h3>
                <p class="subhead">Curated by ${curator}</p>
                <p class="subhead">${from} – ${to}</p>
                <details>
                    <summary> More Info </summary>
                    <div class="project-description">
                        ${text}
                    </div>
                </details>
            </div>
            <div class="project-popups">
                <h3 class="box-header">Works:</h3>
                <div id="popupContainer"></div>
            </div>
        </div>
      `;
      projectContainer.innerHTML = "";
      projectContainer.appendChild(element);
      for (let i = 0; i < popups.length; i++) {
        let popupTitle = popups[i].popup_title;
        let popupTime =  popups[i].popup_time || "HH:MM:SS";
        let popupDate = popups[i].popup_date || "DD.MM.YYYY";
        let button = document.createElement('button');
        button.classList.add('popup-button', 'box', 'bg-white');
        button.innerHTML = `
            <span class="button-title">${popupTitle}</span>
            <span class="button-times">${popupDate} – ${popupTime}</span>
            <svg width="60" height="66" viewBox="0 0 60 66" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M42 32L32 26.2265V37.7735L42 32ZM33 31L19 31V33H33V31Z" fill="#0000FF"/>
            </svg>

        `;
        document.getElementById('popupContainer').appendChild(button);
      }
  }

  function openProjectPage(event){
    const targetId = event.target.href.split('#')[1];
    const targetElement = document.getElementById(targetId);
    targetElement.addEventListener('transitionend', () => {
      targetElement.querySelector('.back-button').focus();
    });
    const targetIdName = `${targetId}--open`;
    document.body.classList.add(targetIdName);
  }