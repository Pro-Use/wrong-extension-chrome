 console.log('content script loaded')

 var port = chrome.extension.connect();

const buttons = document.getElementsByTagName('input');
console.log(buttons);
for(let i=0;i<buttons.length;i++){
    buttons[i].setAttribute('data-trigger', 'plugin');
    buttons[i].addEventListener("click", function(){
        // info window
        let height = 400;
        let width = 400;
        let top = parseInt((screen.height) ? (screen.height-height)/2 : 0);
        let left = parseInt((screen.width) ? (screen.width-width)/2 : 0);
        popup_json = JSON.stringify({dims:[left,top,width,height], fullscreen:false, url:this.dataset.info});
        port.postMessage(popup_json);
        // popup
        height = parseInt(this.dataset.height);
        width = parseInt(this.dataset.width);
        const pos_arr = this.dataset.pos.split("-");
        console.log(pos_arr);
//                vertical
        if (pos_arr[0] === "top"){
            top = 0;
        } else if (pos_arr[0] === "mid") {
            top = (screen.height) ? (screen.height-height)/2 : 0;
        } else if (pos_arr[0] === "bottom"){
            top = screen.height-height;
        }
//                horizontal
        if (pos_arr[1] === "left") {
            left = 0;
        } else if (pos_arr[1] === "center") {
            left = (screen.width) ? (screen.width-width)/2 : 0;
        } else if (pos_arr[1] === "right"){
            left = screen.width-width;
        }
        msg = JSON.stringify({dims:[left,top,width,height], fullscreen:this.dataset.fullscreen, url:this.value});
        port.postMessage(msg);
    });
};