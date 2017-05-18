const fs = require('fs');
const readline = require('readline');
const {ipcRenderer} = require('electron')
// self define
const myRl = require('./LIB/myReadLine')
const myEF = require('./LIB/myEveryFiles.js')
let globalpath
let dirPath = {
    content: null,
    type: null
};
// html element
const img = document.getElementById("myImg")
const imgBlock = document.getElementById('imgBlock');
const imgsrc = document.getElementById("imgsrc")
const yesnoBlock = document.getElementById('yesNoBlock');
const dirvalid = document.getElementById("dirValid")
const getData = document.getElementById('getData')
const datalist = document.getElementById("data_fdlist")
const lofBox = document.getElementById('lofBox')
const button_find = document.getElementById("button_find")
const getFignumber = document.getElementById("getFignumber")

let lofpath
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
        ipcRenderer.on('path', (event, path) => {
            globalpath = path;
            getData.value = globalpath.concat("data/")
            lofpath = globalpath.concat("main.lof")
            if(!fs.existsSync(lofpath)){
                // console.log("No .lof file");
                createLOFzone()
            }
            let mEvent = document.createEvent('Event')
            mEvent.initEvent('input')
            getData.dispatchEvent(mEvent)
        })
    }
})



// Drop and select lof
function handleFileSelect(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    var files = evt.dataTransfer.files; // FileList object.
    lofpath = files[0].path
    if(fs.existsSync(lofpath))
        modifyLOFzone("Your .lof is '".concat(lofpath, "'"))
    else
        modifyLOFzone("UNCAUGHT ERROR: This file doesn't exist ")
    // console.log(files);
    // console.log(lofpath);
}

function handleDragOver(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

function createLOFzone(){
    let drop_zone = document.createElement("div")
    drop_zone.id = "drop_zone"
    drop_zone.appendChild(document.createTextNode(`Need '.lof' file.
                                        Drag the file here or Click to Open`))
    lofBox.appendChild(drop_zone)
    // Drop LOF
    drop_zone.addEventListener('dragover', handleDragOver, false);
    drop_zone.addEventListener('drop', handleFileSelect, false);
    // Select LOF
    drop_zone.addEventListener('click', (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        ipcRenderer.send('open-file-dialog')
    }, false)

    ipcRenderer.on('selected-directory', function (event, path) {
        lofpath = path[0]
        if(fs.existsSync(lofpath)){
            modifyLOFzone("Your .lof is '".concat(lofpath, "'"))
        } else{
            modifyLOFzone("UNCAUGHT ERROR: This file doesn't exist ")
        }
    })

}

function modifyLOFzone(string){
    document.getElementById('drop_zone').textContent = string
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

//// Search input fignumber in lof
function searchFile() {
    let success = null
    let CONTINUE = true
    if(fs.existsSync(lofpath)){
        success = false
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
    }
    return success
    // succes  = null if no loffilfe
            // = false if can't find the figure number usr gave
            // = true if the figure number found
}


//// Match figure cation and send output
////// Print the search result in window
function printFail(text){
    img.src = ''
    imgsrc.style.marginLeft = 10;
    // console.log(imgsrc.style.marginLeft)
    imgsrc.textContent = text
}
function printResult(){
    imgsrc.style.marginLeft = 332;
    imgsrc.textContent = "This figure is at '".concat(figure.source.replace('\{', '').replace('\}', '')).replace(/\//g, ' / ').concat("'")
    if(!figure.source.includes(".eps")){
        img.src = globalpath.concat(figure.source.replace('{', '').replace('}', ''))
    } else{
        img.src = "Img/EPSerror.jpeg"
    }
}
function resultClear(){
    imgsrc.textContent=''
    img.src=''
}

////// create decsion block for figure with no caption
function createYesNo(){
    var yesDiv = document.createElement('div')
    yesDiv.id =  'yes'
    yesDiv.textContent = "Right figure?"
    var noDiv = document.createElement('div')
    noDiv.id =  'no'
    noDiv.textContent = ("Wrong figure?")
    yesnoBlock.appendChild(yesDiv)
    yesnoBlock.appendChild(noDiv)
}

function removeYesNo(){
    if(yesnoBlock.childNodes[0]){
        yesnoBlock.removeChild(document.getElementById('yes'))
        yesnoBlock.removeChild(document.getElementById('no'))
    }
}


////// use caption to search

// Return true if
    // meet a potential target Fig with no caption (need check)
    // meet the EOF
// Return false if
    // meet the target (no need for check)
function checkFunc_loop(reader){       // Check a file, may stop when met the target or end when met EOF
    let CONTINUE = true
    let source_temp
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
                if(figure.caption !== null && figure.caption.includes(caption_temp)){
                    figure.source = source_temp[0]
                    printResult()
                    CONTINUE = false
                    state = 0        // No need to search more & No need for check
                    return state
                }
            } else {
                if(!figure.caption){
                    img.src = "../".concat(source_temp[0].replace('{', '').replace('}', ''));
                    figure.source = source_temp[0]
                    printResult()
                    CONTINUE = false
                    state = 3      // Need to search more & Need to be check
                    return state
                }
            }

        }

    }
    // printFail("UNCAUGHT ERROR: Can't find the figure")
    return 1
}


// If in the 'if' block
    // Return false if 'yes' is click
    // Return true if 'no' is click
// If not in the 'if' block
    // Return false if checkFunc_loop return false, that is
    // Return true if
function checkFunc(reader) {
    let stateNext = checkFunc_loop(reader)
    if(stateNext === 3){     // If file don't has caption and the search result need to be checked
        createYesNo()
        document.getElementById('yes').addEventListener('click', () => {
            removeYesNo()
            stateNext = 0
            return stateNext
        })
        document.getElementById('no').addEventListener('click', () => {
            figure.source = null
            removeYesNo()
            stateNext = checkFunc(reader)
            if(stateNext === 1){
                return true
            } else{

            }
            return stateNext
        })
    } else {
        return false
    }
}


// Retrun true if meet EOF and need to search more
function parseFigTex(filePath) {
    var reader = new myRl.FileLineReader(filePath)
    return checkFunc(reader)

}


// state:
//      0: togo is false, to check is false
//      1: to go is true, to check is false
//      2: to go is false, to check is true
//      3: to go is true, to check is true



function dirRender(path) {
    if(path.type){
        if(path.type === 'file'){
            parseFigTex(path.content)
        } else if (path.type === 'dir') {
            //
            fs.readdir(path.content, (err, files) => {
                // console.log(files);
                myEF.myEveryFiles(files, function(file) {
                    let state = parseFigTex(path.content.concat(file))
                    if(state === 3 | state === 1)
                        return true
                    else if(state === 0)
                        return false
                    else
                        console.error("ERROR: state error. state is ".concat(state));
                })
            })
            //
        }
    }else {
        console.error("uncaught dir read error");
    }

}

////// Check the directory(or file) is valid
function checkDir(path){
    // console.log("do check");
    fs.readdir(path.content, (err, files) => {
        if(err !== null){
            if(!fs.existsSync(path.content)){
                path.type = 'null'
                dirValid.textContent = "Invalid"
            } else {
                path.type = 'file'
                if(!path.content.includes(".tex")){
                    dirValid.textContent = "Valid (Not a .tex file)"
                } else {
                    dirValid.textContent = "Valid (file)"
                }
            }
        }
        else{
            if(path.content.charAt(path.content.length - 1) !== "/"){
                dirValid.textContent = "Invalid (maybe need a '/')"
                path.type = null
            } else{
                dirValid.textContent = "Valid (directory)"
                path.type = 'dir'
            }
        }
    })
}

////// Process render
getData.addEventListener('input', function() {
    // console.log("input");
    dirPath.content = getData.value
    checkDir(dirPath)
}, false);

button_find.addEventListener("click", function(event) {
    removeYesNo()
    figure.clear()
    resultClear()
    figure.number = getFignumber.value
    // Check input fig number format
    if(!figure.number){
        printFail("Empty figure name!");
    } else{
        let num = figure.number.match(/\d+\.\d+/g)
        if(!num) {
            printFail("Wrong input format");
        } else{
            figure.number = num[0]
            let success = searchFile()
            if(success === true){
                dirRender(dirPath)
            } else if(success === false){
                printFail("No such figure exist or the .lof file is wrong!")
            } else {
                printFail(".lof file is not loaded!")
            }
        }
    }
}, false)
// console.log(document.getElementById('imgsrc'));
