 console.log('content script loaded')

 var port = chrome.extension.connect();

const buttons = document.getElementsByTagName('input');
console.log(buttons);
for(let i=0;i<buttons.length;i++){
    buttons[i].setAttribute('data-trigger', 'plugin');
    buttons[i].addEventListener("click", function(){
        // info window
        let info_height = screen.height;
        let info_width = 450;
        let info_top = 0;
        let info_left = parseInt(screen.width-info_width);
        console.log({dims:[info_left,info_top,info_width,info_height], fullscreen:false, url:this.dataset.info});
        let popup_json = JSON.stringify({dims:[info_left,info_top,info_width,info_height], fullscreen:false, url:this.dataset.info});
        console.log(popup_json);
        port.postMessage(popup_json);
        // popup
        height = parseInt(this.dataset.height);
        width = parseInt(this.dataset.width);
        dims = []
        pos_arr = this.dataset.pos.split("-");
        console.log(pos_arr);
//                horizontal
        if (pos_arr[1] === "left") {
            left = 0;
        } else if (pos_arr[1] === "center") {
            left = parseInt((screen.width-width)/2);
        } else if (pos_arr[1] === "right"){
            left = screen.width-width;
        }
        console.log(left);
//                vertical
        if (pos_arr[0] === "top"){
             popup_top = 0;
        } else if (pos_arr[0] === "mid") {
             popup_top = screen.availHeight - height;
             popup_top = parseInt(popup_top / 2);
        } else if (pos_arr[0] === "bottom"){
             popup_top = screen.height-height;
        }
        dims.push(left, popup_top, width, height);
        msg = JSON.stringify({dims:dims, fullscreen:(this.dataset.fs == 'true'), url:this.value});
        console.log(msg);
        port.postMessage(msg);
    });
};