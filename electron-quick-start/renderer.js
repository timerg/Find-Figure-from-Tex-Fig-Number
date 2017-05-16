const fs = require('fs');
const readline = require('readline');
const {ipcRenderer} = require('electron')
const myRl = require('./LIB/myReadLine')
let dirPath = {
    content: null,
    type: null
};

let lofpath = "../main.lof"
let figure = {
    number: null,
    source: null,
    exist: false,
    caption: null,
    clear: function(){
        figure.number = null
        figure.source = null
        figure.exist = null
        figure.caption = null
    }
};



function searchFile() {
    const rl = readline.createInterface({       // Open readline interface
        input: fs.createReadStream(lofpath)
    });
    rl.on('line', (input) => {
        if(input.includes("figure")){
            console.log("include 'figure'");
            rl.pause()
        }
            console.log(input);
    });
    // console.log(figure);
}


// document.getElementById("button").addEventListener('click', (ev) => {
//     let CONTINUE = true
//     let reader = new myRl.FileLineReader(lofpath)
//     while(CONTINUE){
//         console.log(reader.nextLine())
//         CONTINUE = reader.hasNextLine()
//     }
// })


//// Drop and select lof
// Drop
function handleFileSelect(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    var files = evt.dataTransfer.files; // FileList object.
    lofpath = files[0].path
    console.log(files);
    console.log(lofpath);
}

function handleDragOver(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

function createLOFzone(){
    let newDiv = document.createElement("div")
    newDiv.id = "drop_zone"
    newDiv.appendChild(document.createTextNode(`Need '.lof' file.
                                        Drag the file here or Click to Open`))
    document.getElementById('lofBox').appendChild(newDiv)
    // Drop LOF
    newDiv.addEventListener('dragover', handleDragOver, false);
    newDiv.addEventListener('drop', handleFileSelect, false);
    // Select LOF
    document.getElementById('drop_zone').addEventListener('click', (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        ipcRenderer.send('open-file-dialog')
    }, false)

    ipcRenderer.on('selected-directory', function (event, path) {
        lofpath = path
    })

}

document.addEventListener('dragover', (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
}, false)
document.addEventListener('drop', (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
}, false)




//// ipc Process
ipcRenderer.on('main-render', (event, message) => {
    if(message === 'ready'){
        // Check lof
        if(!fs.existsSync(lofpath)){
            createLOFzone()
        }
        // send default Directory
        let mEvent = document.createEvent('Event')
        mEvent.initEvent('input')
        document.getElementById("DirectoryorFile").dispatchEvent(mEvent)
    }
})

//// Main Process
// Search input Fignumber in lof
function searchFile() {
    const rl = readline.createInterface({       // Open readline interface
        input: fs.createReadStream(lofpath)
    });
    rl.on('line', (input) => {
        if(input.match("{".concat(figure.number, "}"))){
            figure.exist = true
            let caption = input.match(/ignorespaces.*relax/g)[0]
            figure.caption = caption.replace('ignorespaces ', '').replace('\\relax', '').replace(/\s/g, '').replace(/Fig.*\\hbox\{\}/g, '')
        }
    });
    // console.log(figure);
}


// Match figure cation and send output

function createYesNo(){
    var yesDiv = document.createElement('div')
    yesDiv.id =  'yes'
    var noDiv = document.createElement('div')
    noDiv.id =  'no'
    imgBlock.insertBefore(yesDiv, myImg)
    imgBlock.insertBefore(noDiv, yesDiv)
}

function removeYesNo(){
    const imgBlock = document.getElementById('imgBlock');
    imgBlock.removeChild(document.getElementById('yes'))
    imgBlock.removeChild(document.getElementById('no'))
}

function parseFigTex(filePath) {
    const myImg = document.getElementById('myImg');
    const imgBlock = document.getElementById('imgBlock');
    const rl = readline.createInterface({       // Open readline interface
        input: fs.createReadStream(filePath)
    });
    let source_temp
    rl.on('line', (input) => {
        if(input.match("\\includegraphics")){
            source_temp = input.match(/\{.*\}/)
        }
        if(input.match("\caption")){
            let caption_temp = input.replace('\\caption\{', '').replace(/\}$/, '').replace(/\s/g, '').replace(/Fig\.\\ref\{.*\}/g, '')
            // Some figure don't have caption
            if(caption_temp){
                if(figure.caption.includes(caption_temp)){
                    rl.pause()
                    myImg.src = "../".concat(source_temp[0].replace('{', '').replace('}', ''));
                    figure.source = source_temp[0]
                }
            } else {
                if(!figure.caption){
                    rl.pause()
                    myImg.src = "../".concat(source_temp[0].replace('{', '').replace('}', ''));
                    figure.source = source_temp[0]
                }
            }
        }
    })
    // console.log(JSON.stringify(figure))
}

function dirRender(path) {
    if(path.type){
        if(path.type === 'file'){
            parseFigTex(path.content)
        } else if (path.type === 'dir') {
            fs.readdir(path.content, (err, files) => {
                files.every(function(file, index){
                    // console.log(file)
                    parseFigTex(path.content.concat(file))
                    // console.log(figure.source);
                    if(!figure.source){
                        // console.log(true);
                        return true
                    } else{
                        // console.log(false);
                        return false
                    }
                })
            })
        }
    }else {
        console.error("uncaught dir read error");
    }

}

// Check the directory(or file)
function checkDir(path){
    // console.log("do check");
    const dirvalid = document.getElementById("dirValid")
    fs.readdir(path.content, (err, files) => {
        if(err !== null){
            if(!fs.existsSync(path.content)){
                path.type = 'null'
                dirvalid.textContent = "Invalid"
            } else {
                path.type = 'file'
                if(!path.content.includes(".tex")){
                    dirvalid.textContent = "Valid (Not a .tex file)"
                } else {
                    dirvalid.textContent = "Valid (file)"
                }
            }
        }
        else{
            if(path.content.charAt(path.content.length - 1) !== "/"){
                dirvalid.textContent = "Invalid (maybe need a '/')"
                path.type = null
            } else{
                dirvalid.textContent = "Valid (directory)"
                path.type = 'dir'
            }
        }
    })
}

// Process render
document.getElementById("DirectoryorFile").addEventListener('input', function() {
    // console.log("input");
    dirPath.content = document.getElementById("DirectoryorFile").value
    checkDir(dirPath)
}, false);

document.getElementById("button").addEventListener("click", function(event) {
    figure.clear()
    console.log(dirPath);
    figure.number = document.getElementById('fileName').value
    // Check input fig number format
    if(!figure.number){
        console.log("Empty figure name!");
    } else{
        let num = figure.number.match(/\d+\.\d+/g)
        if(!num) {
            console.log("Wrong input format");
        } else{
            figure.number = num[0]
            searchFile()
            dirRender(dirPath)
            console.log(figure);
        }
    }
}, false);

