const fs = require('fs');
const readline = require('readline');
const {ipcRenderer} = require('electron')
const stream = require('stream');
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
const datalist = document.getElementById("data_fdlist")
const lofBox = document.getElementById('lofBox')
const button_find = document.getElementById("button_find")
const getFignumber = document.getElementById("getFignumber")

// DataType
function Figure(number, source , exist, caption){
    this.number = number;
    this.source = source;
    this.exist = exist;
    this.caption = caption;
    this.clear = function(){
        this.number = undefined
        this.source = undefined
        this.exist = undefined
        this.caption = undefined
    }
}


// Event Emitter
const emitter = new EventEmitter();
const dataEmitter = new MyEmitter();
const queueEmitter = new MyEmitter();
// const figureEmitter = new MyEmitter();
// const globalpathEmitter = new MyEmitter();

// self define
const myRl = require('./LIB/myReadLine')
const myEF = require('./LIB/myEveryFiles.js')
// let globalpath
let dirPath
let lofpath
let data
let objectFig = new Figure()
//


// ipc Process
// PreProcess: load .lof file
ipcRenderer.on('main-render', () => {
    ipcRenderer.on('cwd', (event, cwd) => {
        const lofPath = path.join(cwd, "main.lof");
        fs.stat(lofPath, (err, stats) => {
            if (err) {
                createLOFzone((p) => {
                    // doSomething(p)
                    lofListeningBeSearch(p)
                });
            } else {
                lofListeningBeSearch(lofPath)
                // emitter.emit('lof', lofPath);
                // doSomething(lofPath)
            }
        })
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

function lofListeningBeSearch(lofPath) {
    button_find.addEventListener("click", function(event) {
        searchFile(lofPath)
    });
}

// PreProcess: DataPath and caption find

function searchFile(lofPath) {
    const rl = readline.createInterface({
        input: fs.createReadStream(lofPath),
    });
    let captionArray = []
    rl.on('line', (line) => {
        // console.log(line);
        if(line.includes(`\\numberline \{${getFignumber.value}\}`)){
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
            printFail("No such figure exist or the .lof file is wrong!")
        } else {
            emitter.emit('fig caption get!!', captionArray[0]);
        }
    })
}


 // Check validation of data
function checkDataPath (path){
    fs.stat(path, (err, stats) => {
        if(err){
            dirValid.textContent = "Invalid"
        } else {
            if(stats.isDirectory()){
                dirValid.textContent = "Valid (directory)"
            } else if(stats.isFile()) {
                if(path.includes(".tex")){
                    dirValid.textContent = "Valid (Not a .tex file)"
                } else {
                    dirValid.textContent = "Valid (file)"
                }
            }
            emitter.emit('DataPath get!!', path)
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

emitter.on('DataPath get!!', (files) => {
    emitter.on('fig caption get!!', (caption) => {
        dataRender(files, caption)
    })
})


// Searching figure
function dataRender(files) {
    console.log(objectFig);
    myEF.myEveryFiles(files, (file) => {
        return (!searchCaption(dirPath.concat(file)))
    })
}

function dataRender(files, caption){
    myEF.myEveryFiles(files, (file) => {
        const rl = readline.createInterface({
            input: fs.createReadStream(file),
        });
        let queue = []
        queueEmitter.on('shift', () => {
            printResult(queue[0])
            queue.shift()
        })
        let source_temp
    // Assume \caption always come after \includegraphics or \input
            // rl emit 'Meet a Figure' when meet a "\includegraphics" or "\input".
                // Save its source to source_temp (it replace the content in source_temp)
        // To prevent a non-figure \caption match target
            // rl emit 'Figure not match!!' when \caption doesn't match target
                // Remove source_temp
            // rl emit 'Match Figure get!!' when a \caption matches target
                // copy and push source_temp to queue
    //
        dataEmitter.on('Meet a Figure', (source) => {
            source_temp = source
        })
        dataEmitter.on('Figure not match!!', () => {
            source_temp = null
        })
        dataEmitter.on('Match Figure get!!', () => {
            queue.push(source_temp.repeat(1))
            printResult(queue[0])
            queueEmitter.emit('push!', queue)
        })

        rl.on('line', (line) => {
            searchCaption(line, caption)
        })

        rl.on('close', () => {
            dataEmitter.on('Figure found', () => {
                return false
            })
            dataEmitter.on('Figure not found', () => {
                return true
            })
        })
    })
}

queueEmitter.on('push!', (queue) => {
    if(queue.length > 1){
        createYesNo()
    }
})
// function processPlMatches(queue){
//     printResult(queue.shift())
//     if (queue.length !== 0){
//         createYesNo(queue)
//             // processPlMatches(queue)
//     }
//     dataEmitter.emit('')
// }

function searchCaption(line, targetCaption){
    if(line.match(/\\includegraphics/g)){
        let source = line.match(/\{.*\}/)[0]
        dataEmitter.emit('Meet a Figure', source)
    }
    if(line.match(/\\input/g)){
        subjectFigureHolder.source = line.match(/\{.*\}/)[0]
        dataEmitter.emit('Meet a Figure', source)
    }
    if(line.match("\caption")){
        caption = line.replace('\\caption\{', '').replace(/\}$/, '').replace(/\s/g, '').replace(/Fig\.\\ref\{.*\}/g, '')
        if(caption === targetCaption){
            dataEmitter.emit('Match Figure get!!')
        } else {
            dataEmitter.emit('Figure not match!!')
        }
    }

    // rl.on('close', () => {
    //     function compareFigtoObjF(subj){
    //         return compareFigsCaption(objectFig, subj)
    //     }
    //     // console.log(objectFig);
    //     // console.log(queue);
    //     let compareResults = queue.map(compareFigtoObjF)
    //     let subjectFigure = returnSubjFig(extractArray(compareResults, subjectFigureHolder))
    //     if(subjectFigure){
    //         objectFig = mergeFigs(subjectFigure, objectFig)
    //
    //         return true
    //     } else {
    //         return false
    //     }
    // })
}


////// Print the search result in window
function printFail(text){
    img.src = ''
    imgsrc.style.marginLeft = 10;
    // console.log(imgsrc.style.marginLeft)
    imgsrc.textContent = text
}
function printResult(source){
    imgsrc.style.marginLeft = 332;
    source = source.replace('\{', '').replace('\}', '').replace(/\//g, ' / ')
    imgsrc.textContent = `This figure is at "${source}".`
    if(!source.includes(".eps")){
        emitter.emit('need globalPath', (cwd) => {
            img.src = path.join(cwd, source.replace('{', '').replace('}', ''))
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
function createYesNo(){
    var yesDiv = document.createElement('div')
    yesDiv.id =  'yes'
    yesDiv.textContent = "Right figure?"
    var noDiv = document.createElement('div')
    noDiv.id =  'no'
    noDiv.textContent = ("Wrong figure?")
    yesnoBlock.appendChild(yesDiv)
    yesnoBlock.appendChild(noDiv)
    yesDiv.addEventListener('click', () => {
        dataEmitter.emit('Figure found')
    })
    noDiv.addEventListener('click', () => {
        queueEmitter.emit('shift')
    })
}

function removeYesNo(){
    if(yesnoBlock.childNodes[0]){
        yesnoBlock.removeChild(document.getElementById('yes'))
        yesnoBlock.removeChild(document.getElementById('no'))
    }
}

function checkFunc(fig) {
    // createYesNo()
    // document.getElementById('yes').addEventListener('click', () => {
    //     removeYesNo()
    // })
    // document.getElementById('no').addEventListener('click', () => {
    //     objectFig.source = undefined
    //     removeYesNo()
    // })
}

function returnSubjFig(figs){
    // if(figs.length === 1){
    //     console.log("only one matching figs");
    //     return figs[0]
    // } else {
    //     // console.log("Multiple matching figs");
    //     myEF.myEveryFiles(figs, checkFunc)
    // }
}

function compareFigsCaption(figA, figB){
    // console.log(figA.caption);
    // console.log(figB.caption);
    if (figA.caption === figB.caption
    ){
        console.log("[compareFigs]: fig match");
        return true
    } else{
        console.log("[compareFigs]: fig not match");
        return false
    }
}

function mergeFigs(figB, figA){
    // figA has higher priority
    return Object.assign({}, figB, figA)
}

function copyFig(fig){
    return Object.assign({}, fig)
}

function extractArray(bools, objects){
    let l = bools.length
    let output = []
    for(var i = 0; i < l; i++){
        if(bools[i]){
            output.push(Object.assign({}, objects[i]))
        }
    }
    return output
}

// function searchCaption(file){
//     let queue = []
//     const rl = readline.createInterface({
//         input: fs.createReadStream(file),
//         // output: myWritable
//     });
//     let subjectFigureHolder = new Figure()
//     rl.on('line', (line) => {
//         if(line.match(/\\includegraphics/g)){
//             subjectFigureHolder.exist = true
//             subjectFigureHolder.source = line.match(/\{.*\}/)[0]
//         }
//         if(line.match(/\\input/g)){
//             subjectFigureHolder.exist = true
//             subjectFigureHolder.source = line.match(/\{.*\}/)[0]
//         }
//         if(line.match("\caption") && (subjectFigureHolder.source)){
//             subjectFigureHolder.caption = line.replace('\\caption\{', '').replace(/\}$/, '').replace(/\s/g, '').replace(/Fig\.\\ref\{.*\}/g, '')
//             queue.push(copyFig(subjectFigureHolder))
//             // console.log(queue);
//             subjectFigureHolder.clear()
//         }
//     })
//
//     rl.on('close', () => {
//         function compareFigtoObjF(subj){
//             return compareFigsCaption(objectFig, subj)
//         }
//         // console.log(objectFig);
//         // console.log(queue);
//         let compareResults = queue.map(compareFigtoObjF)
//         let subjectFigure = returnSubjFig(extractArray(compareResults, subjectFigureHolder))
//         if(subjectFigure){
//             objectFig = mergeFigs(subjectFigure, objectFig)
//
//             return true
//         } else {
//             return false
//         }
//     })
// }


// function dataRender(files) {
//     console.log(objectFig);
//     myEF.myEveryFiles(files, (file) => {
//         return (!searchCaption(dirPath.concat(file)))
//     })
// }

////// Check the directory(or file) is valid



// button_find.addEventListener("click", function(event) {
//     removeYesNo()
//     objectFig.clear()
//     resultClear()
//     let num = getFignumber.value
//     // Check input fig number format
//     if(!num){
//         printFail("Empty figure name!");
//     } else{
//         fignumber = num.match(/\d+\.\d+/g)
//         if(num.match(/\d+\.\d+/g)) {
//             objectFig.number = fignumber[0]
//             // searchFile()
//             searchFile()
//             dataRender(data)
//         } else{
//             printFail("Wrong input format");
//         }
//     }
// }, false)



