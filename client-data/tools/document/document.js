(function documents() { //Code isolation


// This isn't an HTML5 canvas, it's an old svg hack, (the code is _that_ old!)

var xlinkNS = "http://www.w3.org/1999/xlink";
var imgCount = 1;
var fileInput;
var MAX_DOCUMENT_WIDTH = 1800;
var MAX_DOCUMENT_HEIGHT = 1400;

function displaySize(width, height) {
    width = width || 300;
    height = height || 300;
    var scale = Math.min(1, MAX_DOCUMENT_WIDTH / width, MAX_DOCUMENT_HEIGHT / height);
    return {
        w: Math.round(width * scale),
        h: Math.round(height * scale)
    };
}

function onstart() {
    fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.click();
    fileInput.addEventListener("change", function(){
        var reader = new FileReader();
        reader.readAsDataURL(fileInput.files[0]);
      
        reader.onload = function (e) {
            var dataUrl = e.target.result;
            var image = new Image();
            image.onload = function () {
    
            var uid = Tools.generateUID("doc"); // doc for document
            var size = displaySize(this.width, this.height);
            // console.log(image.src.toString().length);
            
            var msg = {
                id: uid,
                fileId: uid,
                type:"doc",
                src: "",
                w: this.width || 300,
                h: this.height || 300,
                displayW: size.w,
                displayH: size.h,
                x: (100+document.documentElement.scrollLeft)/Tools.scale+10*imgCount,
                y: (100+document.documentElement.scrollTop)/Tools.scale + 10*imgCount
                //fileType: fileInput.files[0].type
            };
            Tools.boardAssets.rememberLocal(uid, dataUrl);
            draw(msg);
            Tools.send(msg,"Document");
            Tools.uploadBoardAsset(uid, dataUrl, function (src) {
                if (!src) {
                    console.error("Document image was not saved on the server.");
                    return;
                }
                Tools.boardAssets.rememberRemote(uid, src);
                var update = {
                    type: "update",
                    id: uid,
                    fileId: uid,
                    src: src,
                    nostamp: true
                };
                draw(update);
                Tools.send(update,"Document");
                imgCount++;
            });
            };
            image.src = dataUrl;
        };
       // Tools.change(Tools.prevToolName);
    });
}

function draw(msg) {
    //const file = self ? msg.data : new Blob([msg.data], { type: msg.fileType });
    //const fileURL = URL.createObjectURL(file);

   // fakeCanvas.style.background = `url("${fileURL}") 170px 0px no-repeat`;
    //fakeCanvas.style.backgroundSize = "400px 500px";
    Tools.boardAssets.rememberMessage(msg);
    if (msg.type === "update") {
        var existing = Tools.svg.getElementById(msg.id);
        if (!existing) return;
        if (msg.src !== undefined) {
            var updateSrc = Tools.boardAssets.srcForMessage(msg);
            existing.setAttribute("href", updateSrc);
            existing.setAttributeNS(xlinkNS, "href", updateSrc);
        }
        return;
    }
    var aspect = msg.w/msg.h
    var img = Tools.svg.getElementById(msg.id) || Tools.createSVGElement("image");
    img.id=msg.id;
    img.setAttribute("class", "layer-"+Tools.layer);
    img.setAttribute("data-plane", "document");
    img.setAttribute("data-lock-aspect", "1");
    img.setAttribute("data-protected", msg.protected !== undefined ? msg.protected : 1);
    var src = Tools.boardAssets.srcForMessage(msg);
    img.setAttribute("href", src);
    img.setAttributeNS(xlinkNS, "href", src);
    img.x.baseVal.value = msg['x'];
    img.y.baseVal.value = msg['y'];
    img.setAttribute("width", msg.displayW || 400*aspect);
    img.setAttribute("height", msg.displayH || 400);
    if(msg.transform)
			img.setAttribute("transform",msg.transform);
    if(msg.data !== undefined)
            img.setAttribute("data-lock", msg.data);
    else
            img.setAttribute("data-lock", 0);
    img.onmousedown = function (evt) {
        var activeTool = Tools.curTool && Tools.curTool.name;
        if(["Pencil", "Remove", "Rectangle", "Text", "Line"].indexOf(activeTool) !== -1)return;
        evt.preventDefault();
        evt.stopPropagation();
        if(evt.stopImmediatePropagation)evt.stopImmediatePropagation();
        if(Tools.activateTransformTarget)Tools.activateTransformTarget(img);
    };
    Tools.placeElement(img, "document");
    
}

Tools.add({
    "name": "Document",
    "icon": "🖼️",
    "shortcuts": {
        "changeTool":"7"
    },
    "draw": draw,
    "onstart": onstart,
    "oneTouch":true
});

})(); //End of code isolation
