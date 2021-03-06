const fs = require('fs');
const readline = require('readline');
const {ipcRenderer} = require('electron')
const path = require('path');
const EventEmitter = require('events');
class MyEmitter extends EventEmitter {}

// html element
const img = document.getElementById("myImg")
const imgBlock = document.getElementById('imgBlock');
const imgsrc = document.getElementById("imgsrc")
const yesnoBlock = document.getElementById('yesNoBlock');
const dirvalid = document.getElementById("dirValid")
const getData = document.getElementById('getData')
const lofBox = document.getElementById('lofBox')
const button_find = document.getElementById("button_find")
const getFignumber = document.getElementById("getFignumber")


// Event Emitter
const emitter = new EventEmitter();
// const figureEmitter = new MyEmitter();
// const globalpathEmitter = new MyEmitter();

// let globalpath
let dirPath
let lofpath
let data

//


// ipc Process
// PreProcess: load .lof file
ipcRenderer.on('main-render', () => {
    ipcRenderer.on('cwd', (event, cwd) => {
        const lofPath = path.join(cwd, "main.lof");
        lofRender(lofPath)
        // DataPath
        const dataPath = path.join(cwd, "data")
        getData.value = dataPath
        emitter.emit('Default Data Path loaded', dataPath)
        // Print img
        emitter.on('need globalPath', (func) => {
            func(cwd)
        })
    });
});

function lofRender(lofPath, reOpen){
    if(reOpen){
        createLOFzone((p) => {
            getCaption(p)
        });
    } else {
        fs.stat(lofPath, (err, stats) => {
            if (err) {
                createLOFzone((p) => {
                    getCaption(p)
                });
            } else {
                getCaption(lofPath)
                // emitter.emit('lof', lofPath);
                // doSomething(lofPath)
            }
        })
    }
}

//// Drop and select lof
document.addEventListener('dragover', (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
}, false)
document.addEventListener('drop', (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
}, false)
function handleDragOver(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}
function modifyLOFzone(string){
    document.getElementById('drop_zone').textContent = string
}
function checkLOF(lofPath) {
    fs.stat(lofPath, (err, stats) => {
        if(err)
            modifyLOFzone("UNCAUGHT ERROR: This file doesn't exist ")
        else
            modifyLOFzone(`Your .lof is "${lofPath}"`);
    })
}

function createLOFzone(callback){
    let drop_zone = document.createElement("div")
    drop_zone.id = "drop_zone"
    drop_zone.appendChild(document.createTextNode(`Need '.lof' file.
                                        Drag the file here or Click to Open`))
    lofBox.appendChild(drop_zone)
    // Drop LOF
    drop_zone.addEventListener('dragover', handleDragOver, false);
    drop_zone.addEventListener('drop', (evt) => {
        evt.stopPropagation();
        evt.preventDefault();

        var files = evt.dataTransfer.files; // FileList object.
        let lofPath = files[0].path
        callback(lofPath)
        checkLOF(lofPath)
    }
    , false);
    // Select LOF
    drop_zone.addEventListener('click', (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        ipcRenderer.send('open-file-dialog')
    }, false)

    ipcRenderer.on('selected-directory', function (event, path) {
        callback(path[0]);
        checkLOF(path[0])
    })
}

function getCaption(lofPath) {
    let caption
    button_find.addEventListener("click", function(event) {
        checkFigNumFormat(getFignumber.value, (n) => {
            figNumber = n
        }, (c) => {
            figChar = c
        })
        console.log(`fig num in getCaption: ${figNumber}`);
        searchFile(lofPath, figNumber, (captionHold) => {
            caption = captionHold
            emitter.emit('getfiles', (f) => {
                mainRender(caption, f.slice(0, f.length), figChar)
            })
        })
    })
}

function checkFigNumFormat(inputString, figNum, figCh){
    let figNumber = inputString.match(/[0-9]*\.[0-9]*[a-z]?/gi)[0]
    console.log(`${figNumber}`);
    let figChar
    if(figNumber.charAt(figNumber.length - 1).match(/[a-z]/i)){
        figChar = figNumber.charAt(figNumber.length - 1)
        figNumber = figNumber.slice(0, figNumber.length - 1)
    }
    console.log(`${figNumber} and ${figChar} in checkFigNumFormat`);
    figNum(figNumber)
    figCh(figChar)
}

// PreProcess: Caption finding
function searchFile(lofPath, figNumber, captionHolder) {
    const rl = readline.createInterface({
        input: fs.createReadStream(lofPath),
    });
    let captionArray = []
    rl.on('line', (line) => {
        // console.log(line);
        console.log(figNumber);
        if(line.includes(`\\numberline \{${figNumber}\}`)){
            let caption = line.match(/ignorespaces.*relax/g)[0]
            let captionToWrite = (caption.replace('ignorespaces ', '').replace('\\relax', '').replace(/\s/g, '').replace(/Fig.*\\hbox\{\}/g, ''))
            captionArray.push(captionToWrite)
        }
    })
    rl.on('close', () => {
        let l = captionArray.length
        if(l > 1){
            printFail("ERROR: Repeated figure number appear in .lof file");
        } else if (l === 0){
            resultClear()
            printFail("No such figure exist or the .lof file is wrong!")
        } else {
            captionHolder(captionArray[0])
        }
    })
}

// Get data Files for search
function checkDataPath (dataPath){
    fs.stat(dataPath, (err, stats) => {
        let files
        if(err){
            dirValid.textContent = "Invalid"
        } else {
            if(stats.isDirectory()){
                dirValid.textContent = "Valid (directory)"
                fs.readdir(dataPath, (err, files) => {
                    files = files.filter((fname) => {
                        if(fname.charAt(0) === '.'){
                            return false
                        } else {
                            return true
                        }
                    })
                    // files = files.filter((fname) => {
                    //     return (fname !== "test.tex")
                    // })
                    function joinDataPath(file){
                        return path.join(dataPath, file)
                    }
                    files = files.map(joinDataPath)
                    emitter.emit('FilesReady', files)
                })
            } else if(stats.isFile()) {
                if(dataPath.includes(".tex")){
                    dirValid.textContent = "Valid (Not a .tex file)"
                } else {
                    dirValid.textContent = "Valid (file)"
                }
                emitter.emit('FilesReady', files)
            }
        }
    })
}
emitter.on('Default Data Path loaded', function(path){
    checkDataPath(path)
})
getData.addEventListener('input', function() {
    // console.log("input");
    dirPath = getData.value
    checkDataPath(dirPath)      // emit 'DataPath get!!'
}, false);

emitter.on('FilesReady', (f) => {
    emitter.on('getfiles', (func) => {
        func(f)
    })
})

function mainRender(caption, files, figChar){
    let queue = []
    // Open queue
    const waitForSearch = () => {printFail("Wait for search")}
    const figNotFound = () => {
        console.log('figure not found');
        printFail("UNCAUGHT ERROR: No such figure exists")
    }
// Callbacks
// Push!
    const pushToQueue = (sources) => {
        queue.push(sources)
        if(queue.length === 0){console.error("Push Fail")}
    }

// No more files
    const callOutOfFile = () => {
        console.log("out of file");
        shiftFigure(queue, figChar)
    }

// Read next file
    const nextDataRender = (newFiles) => {
        dataRender(newFiles, caption, pushToQueue, callOutOfFile, nextDataRender)
    }

    dataRender(files, caption, pushToQueue, callOutOfFile, nextDataRender)

}



// Searching figure

function dataRender(files, caption, pushToQueue, callOutOfFile, nextDataRender){
    if(files.length === 0){
        callOutOfFile()
    } else {
        let file = files.shift()
        // console.log(file);
        const rl = readline.createInterface({
            input: fs.createReadStream(file)
        })

        let sources = []
        rl.on('line', (line) => {
            searchCaption(line, caption, () => {    // meetFig
                sources.push('head')
            }, (source) => {                        // takeSource
                sources.push(source)
            }, () => {                              // pushSoureces
                if(sources[0] === 'head'){
                    console.log(sources);
                    sources.shift()
                    pushToQueue(sources)
                } else {
                    console.error(`Fig order is wrong in file for fig caption "${caption}"`);
                }
            }, () => {                              // endFig
                sources  = []
            }, () => {                              // checkEndFig
                if(sources.length !== 0){
                    console.error("UNCAUGHT ERROR: sources should be clean but not!");
                }
            })
        })
        rl.on('close', () =>  {
            nextDataRender(files)
            // console.log(`file "${file}" close`);
        })
    }
}

function searchCaption(line, targetCaption, meetFig, takeSource, pushSoureces, endFig, checkEndFig){
    if(line.match(/\\begin\{figure\}/i)){
        meetFig()
    }
    if(line.match(/\\includegraphics/)){
        let source = line.match(/\{.*\}/)[0]
        // console.log(`A source ${source}`);
        takeSource(source)
    }
    if(line.match(/\\input/)){
        let source = line.match(/\{.*\}/)[0]
        takeSource(source)
    }
    if(line.match("\caption")){
        caption = line.replace('\\caption\{', '').replace(/\}$/, '').replace(/\s/g, '').replace(/Fig\.\\ref\{.*\}/g, '')
        if(caption !== ''){
            if(targetCaption.includes(caption)){
                pushSoureces()
                endFig()
            } else {
                endFig()
            }
        } else{
            if(targetCaption === ''){
                console.log("empty");
                pushSoureces()
                endFig()
            } else {
                endFig()
            }
        }
    }
    if(line.match(/\\end\{figure\}/i)){
        checkEndFig()
    }
}

function shiftFigure(queue, figChar){
    if(queue.length === 0){
        printFail(`No such figure exist or the data is wrong!`)
        console.log("All possible figure filtered by usr)")
    } else {
        console.log(queue, figChar);
        let charNum
        if(figChar){
            charNum = charToNum(figChar)
            if(charNum === -1){
                printFail("No such figure exists. (Wrong fig char: a, b, c ...). ")
            }
        } else {
            charNum = 1
        }
        outputFig = queue.shift()
        console.log(outputFig);
        let source = outputFig[charNum - 1]
        if(source){
            printResult(source)
            if(queue.length !== 0){
                createYesNo(queue, figChar)
            }
        }else {
            printFail("No such figure exists. (Wrong fig char: a, b, c ...). ")
        }
    }
}


////// Print the search result in window
function printFail(text){
    img.src = ''
    // console.log(imgsrc.style.marginLeft)
    imgsrc.textContent = text
}
function printResult(source){
    source = source.replace('\{', '').replace('\}', '')
    imgsrc.textContent = `This figure is at "${source.replace(/\//g, ' / ')}".`
    if(!source.includes(".eps")){
        emitter.emit('need globalPath', (cwd) => {
            console.log(source);
            img.src = path.join(cwd, source)
            console.log(img.src);
        })
    } else{
        img.src = "Img/EPSerror.jpeg"
    }
}

function resultClear(){
    imgsrc.textContent=''
    img.src=''
}

////// create decsion block for figure with no caption
function createYesNo(queue, figChar){
    if(!yesnoBlock.hasChildNodes()){
        imgsrc.style.marginTop = 100
        var yesDiv = document.createElement('div')
        yesDiv.id =  'yes'
        yesDiv.textContent = "Right figure?"
        var noDiv = document.createElement('div')
        noDiv.id =  'no'
        noDiv.textContent = ("Wrong figure?")
        yesnoBlock.appendChild(yesDiv)
        yesnoBlock.appendChild(noDiv)
        yesDiv.addEventListener('click', () => {
            removeYesNo()
        })
        noDiv.addEventListener('click', () => {
            shiftFigure(queue, figChar)
        })
        button_find.addEventListener('click', () => {
            removeYesNo()
        })
    }
}

function removeYesNo(){
    // resultClear()
    if(yesnoBlock.childNodes.length > 1){
        yesnoBlock.removeChild(document.getElementById('yes'))
        yesnoBlock.removeChild(document.getElementById('no'))
    }
}


function charToNum(char) {
    switch (char) {
        case 'a':
            return 1;
            break;
        case 'b':
            return 2;
            break;
        case 'c':
            return 3;
            break;
        case 'd':
            return 4;
            break;
        case 'e':
            return 5;
            break;
        case 'f':
            return 6;
            break;
        case 'A':
            return 1;
            break;
        case 'B':
            return 2;
            break;
        case 'C':
            return 3;
            break;
        case 'D':
            return 4;
            break;
        case 'E':
            return 5;
            break;
        case 'F':
            return 6;
            break;
        default: -1

    }
}
//
