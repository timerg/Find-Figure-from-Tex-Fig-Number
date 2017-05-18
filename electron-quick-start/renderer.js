const fs = require('fs');
const readline = require('readline');
const {ipcRenderer} = require('electron')
// self define
const myRl = require('./LIB/myReadLine')
const myEF = require('./LIB/myEveryFiles.js')
let globalpath
let dirPath
let data
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
    let CONTINUE = true
    if(fs.existsSync(lofpath)){
        let reader = new myRl.FileLineReader(lofpath)
        while(CONTINUE){
            let input = reader.nextLine()
            CONTINUE = reader.hasNextLine()
            if(input.match("{".concat(figure.number, "}"))){
                figure.exist = true
                let caption = input.match(/ignorespaces.*relax/g)[0]
                figure.caption = caption.replace('ignorespaces ', '').replace('\\relax', '').replace(/\s/g, '').replace(/Fig.*\\hbox\{\}/g, '')
                CONTINUE = false
            }
        }
        if(!figure.exist){
            printFail("No such figure exist or the .lof file is wrong!")
        }
    } else {
        printFail(".lof file is not loaded!")
    }
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
// function checkFunc_loop(reader){
//     let CONTINUE = true
//     let source_temp
//     while(CONTINUE){
//         let input = reader.nextLine()
//         CONTINUE = reader.hasNextLine()
//         if(input.match("\\includegraphics")){
//             source_temp = input.match(/\{.*\}/)
//         }
//         if(input.match("\caption")){
//             let caption_temp = input.replace('\\caption\{', '').replace(/\}$/, '').replace(/\s/g, '').replace(/Fig\.\\ref\{.*\}/g, '')
//             // Some figure don't have caption
//             if(caption_temp){
//                 if(figure.caption !== null && figure.caption.includes(caption_temp)){
//                     figure.source = source_temp[0]
//                     printResult()
//                     CONTINUE = false
//                 }
//             } else {
//                 if(!figure.caption){
//                     img.src = "../".concat(source_temp[0].replace('{', '').replace('}', ''));
//                     figure.source = source_temp[0]
//                     printResult()
//                     CONTINUE = false
//                 }
//             }
//
//         }
//
//     }
// }


function checkFunc(reader) {
    createYesNo()
    document.getElementById('yes').addEventListener('click', () => {
        removeYesNo()
    })
    document.getElementById('no').addEventListener('click', () => {
        figure.source = null
        removeYesNo()
    })
}

// function parseFigTex(filePath) {
//     var reader = new myRl.FileLineReader(filePath)
//
//     return checkFunc(reader)
// }


function dataRender(files) {
    myEF.myEveryFiles(files, (file) => {
        return searchCaption(file)
    })
}

////// Check the directory(or file) is valid
function checkDir(path){
    // console.log("do check");
    fs.readdir(path, (err, files) => {
        if(err !== null){
            if(!fs.existsSync(path)){
                path = 'null'
                dirValid.textContent = "Invalid"
            } else {
                // path is a file
                if(!path.content.includes(".tex")){
                    dirValid.textContent = "Valid (Not a .tex file)"
                } else {
                    dirValid.textContent = "Valid (file)"
                }
                data = [path]
            }
        }
        else{
            if(path.charAt(path.content.length - 1) !== "/"){
                dirValid.textContent = "Invalid (maybe need a '/')"
                path = null
            } else{
                dirValid.textContent = "Valid (directory)"
                data = files
            }
        }
    })
}

////// Process render
getData.addEventListener('input', function() {
    // console.log("input");
    dirPath = getData.value
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
            searchFile()
            dataRender(data)
        }
    }
}, false)
// console.log(document.getElementById('imgsrc'));
