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
const loffileEmitter = new MyEmitter();
const dataEmitter = new MyEmitter();
const figureEmitter = new MyEmitter();
const globalpathEmitter = new MyEmitter();

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
ipcRenderer.on('main-render', () => {
    ipcRenderer.on('cwd', (event, cwd) => {
        const lofPath = path.join(cwd, 'main.lof');
        fs.stat(lofPath, (err, stats) => {
            if (err) {
                createLOFzone((p) => {
                    // doSomething(p)
                });
            } else {
                emitter.emit('lof', lofPath);
                // doSomething(lofPath)
            }
        })
    });
})


// ipc Process
ipcRenderer.on('main-render', (event, message) => {
    if(message === 'ready'){




        ipcRenderer.on('path', (event, path) => {
            globalpathEmitter.emit('got path!!', path);

            getData.value = path.concat("data/")
            lofpath = path.concat("main.lof")
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

function checkLOF(lofPath) {
    if(fs.existsSync(lofPath))
        modifyLOFzone(`Your .lof is "${lofPath}"`);
    else
        modifyLOFzone("UNCAUGHT ERROR: This file doesn't exist ")
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

function stringer(number){
    let string = ""
    for(var i = 0; i < number; i++){
         string = string.concat("0")
    }
    return string
}

//// Search input fignumber in lof
function searchFile() {
    if(fs.existsSync(lofpath)){
        const rl = readline.createInterface({
            input: fs.createReadStream(lofpath),
        });
        let captionArray = []
        rl.on('line', (line) => {
            if(line.includes("\\numberline ".concat("{", objectFig.number, "}"))){
                objectFig.exist = true
                let caption = line.match(/ignorespaces.*relax/g)[0]
                let captionToWrite = (caption.replace('ignorespaces ', '').replace('\\relax', '').replace(/\s/g, '').replace(/Fig.*\\hbox\{\}/g, ''))
                captionArray.push(captionToWrite)
            }
        })
        rl.on('close', () => {
            if(captionArray.length > 1){
                console.error("ERROR: Repeated figure number appear in .lof file");
            } else {
                objectFig.caption = captionArray[0]

            }
            if(objectFig.exist !== true){
                objectFig.exist = false
                printFail("No such figure exist or the .lof file is wrong!")
            }
        })
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
    imgsrc.textContent = "This figure is at '".concat(objectFig.source.replace('\{', '').replace('\}', '')).replace(/\//g, ' / ').concat("'")
    if(!objectFig.source.includes(".eps")){
        globalpathEmitter.on('got path!!', (path) => {
            img.src = path.concat(objectFig.source.replace('{', '').replace('}', ''))
        });
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
    if(figs.length === 1){
        console.log("only one matching figs");
        return figs[0]
    } else {
        // console.log("Multiple matching figs");
        myEF.myEveryFiles(figs, checkFunc)
    }
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

function searchCaption(file){
    let queue = []
    const rl = readline.createInterface({
        input: fs.createReadStream(file),
        // output: myWritable
    });
    let subjectFigureHolder = new Figure()
    rl.on('line', (line) => {
        if(line.match(/\\includegraphics/g)){
            subjectFigureHolder.exist = true
            subjectFigureHolder.source = line.match(/\{.*\}/)[0]
        }
        if(line.match(/\\input/g)){
            subjectFigureHolder.exist = true
            subjectFigureHolder.source = line.match(/\{.*\}/)[0]
        }
        if(line.match("\caption") && (subjectFigureHolder.source)){
            subjectFigureHolder.caption = line.replace('\\caption\{', '').replace(/\}$/, '').replace(/\s/g, '').replace(/Fig\.\\ref\{.*\}/g, '')
            queue.push(copyFig(subjectFigureHolder))
            // console.log(queue);
            subjectFigureHolder.clear()
        }
    })

    rl.on('close', () => {
        function compareFigtoObjF(subj){
            return compareFigsCaption(objectFig, subj)
        }
        // console.log(objectFig);
        // console.log(queue);
        let compareResults = queue.map(compareFigtoObjF)
        let subjectFigure = returnSubjFig(extractArray(compareResults, subjectFigureHolder))
        if(subjectFigure){
            objectFig = mergeFigs(subjectFigure, objectFig)

            return true
        } else {
            return false
        }
    })
}


function dataRender(files) {
    console.log(objectFig);
    myEF.myEveryFiles(files, (file) => {
        return (!searchCaption(dirPath.concat(file)))
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
            if(path.charAt(path.length - 1) !== "/"){
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
    objectFig.clear()
    resultClear()
    let num = getFignumber.value
    // Check input fig number format
    if(!num){
        printFail("Empty figure name!");
    } else{
        fignumber = num.match(/\d+\.\d+/g)
        if(num.match(/\d+\.\d+/g)) {
            objectFig.number = fignumber[0]
            // searchFile()
            searchFile()
            dataRender(data)
        } else{
            printFail("Wrong input format");
        }
    }
}, false)



// About array: stack, queue