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


// ipc Process
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

// Drop and select lof
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


// Main searching Process

//// Search input Fignumber in lof
function searchFile() {
    var success = false
    let CONTINUE = true
    let reader = new myRl.FileLineReader(lofpath)
    while(CONTINUE){
        let input = reader.nextLine()
        CONTINUE = reader.hasNextLine()
        if(input.match("{".concat(figure.number, "}"))){
            figure.exist = true
            let caption = input.match(/ignorespaces.*relax/g)[0]
            figure.caption = caption.replace('ignorespaces ', '').replace('\\relax', '').replace(/\s/g, '').replace(/Fig.*\\hbox\{\}/g, '')
            success = true
            CONTINUE = false
        }
    }
    return success
}


//// Match figure cation and send output
////// Print the search result in window
function printFail(text){
    const img = document.getElementById('myImg')
    const imgsrc = document.getElementById('imgsrc')
    imgsrc.style.marginLeft = 10;
    console.log(imgsrc.style.marginLeft)
    imgsrc.textContent = text
}
function printResult(){
    const imgsrc = document.getElementById('imgsrc')
    const img = document.getElementById('myImg')
    imgsrc.style.marginLeft = 332;
    imgsrc.textContent = "This figure is at '".concat(figure.source.replace('\{', '').replace('\}', '')).replace(/\//g, ' / ').concat("'")
    if(!figure.source.includes(".eps")){
        img.src = "../".concat(figure.source.replace('{', '').replace('}', ''))
    } else{
        img.src = "EPSerror.jpeg"
    }
}
function resultClear(){
    document.getElementById('imgsrc').textContent=''
    document.getElementById('myImg').src=''
}

////// create decsion block for figure with no caption
function createYesNo(){
    var yesno = document.getElementById('yesNo')
    var yesDiv = document.createElement('div')
    yesDiv.id =  'yes'
    yesDiv.textContent = "Right figure?"
    var noDiv = document.createElement('div')
    noDiv.id =  'no'
    noDiv.textContent = ("Wrong figure?")
    yesno.appendChild(yesDiv)
    yesno.appendChild(noDiv)
}

function removeYesNo(){
    const imgBlock = document.getElementById('yesNo');
    if(imgBlock.childNodes[0]){
        imgBlock.removeChild(document.getElementById('yes'))
        imgBlock.removeChild(document.getElementById('no'))
    }
}


////// use caption to search
function parseFigTex(filePath) {

    const imgBlock = document.getElementById('imgBlock');
    let source_temp
    var reader = new myRl.FileLineReader(filePath)
    checkFunc(reader)
}

function checkFunc(reader) {
    if(checkFunc_loop(reader)){     // If file don't has caption and the search result need to be checked
        createYesNo()
        document.getElementById('yes').addEventListener('click', () => {
            removeYesNo()
        })
        document.getElementById('no').addEventListener('click', () => {
            figure.source = null
            removeYesNo()
            checkFunc(reader)
        })
    }
}

function checkFunc_loop(reader, toCheck){
    let CONTINUE = true
    while(CONTINUE){
        let input = reader.nextLine()
        CONTINUE = reader.hasNextLine()
        if(input.match("\\includegraphics")){
            source_temp = input.match(/\{.*\}/)
        }
        if(input.match("\caption")){
            let caption_temp = input.replace('\\caption\{', '').replace(/\}$/, '').replace(/\s/g, '').replace(/Fig\.\\ref\{.*\}/g, '')
            // Some figure don't have caption
            if(caption_temp){
                if(figure.caption !== null & figure.caption.includes(caption_temp)){
                    figure.source = source_temp[0]
                    printResult()
                    CONTINUE = false
                    return false
                }
            } else {
                if(!figure.caption){
                    myImg.src = "../".concat(source_temp[0].replace('{', '').replace('}', ''));
                    figure.source = source_temp[0]
                    printResult()
                    CONTINUE = false
                    return true
                }
            }

        }

    }
}



function dirRender(path) {
    if(path.type){
        if(path.type === 'file'){
            parseFigTex(path.content)
        } else if (path.type === 'dir') {
            fs.readdir(path.content, (err, files) => {
                files.every(function(file, index){
                    // console.log(figure.caption)
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

////// Check the directory(or file) is valid
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

////// Process render
document.getElementById("DirectoryorFile").addEventListener('input', function() {
    // console.log("input");
    dirPath.content = document.getElementById("DirectoryorFile").value
    checkDir(dirPath)
}, false);

document.getElementById("button").addEventListener("click", function(event) {
    removeYesNo()
    figure.clear()
    resultClear()
    console.log(dirPath);
    figure.number = document.getElementById('fileName').value
    // Check input fig number format
    if(!figure.number){
        printFail("Empty figure name!");
    } else{
        let num = figure.number.match(/\d+\.\d+/g)
        if(!num) {
            printFail("Wrong input format");
        } else{
            figure.number = num[0]
            if(searchFile()){
                dirRender(dirPath)
            }else{
                printFail("No such figure exist!")
            }
        }
    }
}, false)

// console.log(document.getElementById('imgsrc'));
