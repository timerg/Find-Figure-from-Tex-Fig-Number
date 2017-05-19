const fs = require('fs');
const readline = require('readline');
const {ipcRenderer} = require('electron')
const stream = require('stream');
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
};

function NotifyArray(items, aEmitter){
    this.content = items
    this.length = this.content.length
    this.map = function(func){
        this.content.map(func)
    }
    this.push = function(item){
        this.content.push(item)
        aEmitter.emit('push')
    }

}
// self define
const myRl = require('./LIB/myReadLine')
const myEF = require('./LIB/myEveryFiles.js')
let globalpath
let dirPath
let data
let lofpath
let objectFig = new Figure()
//



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
        const myEmitter = new MyEmitter();
        let captionArray = new NotifyArray([], myEmitter)
        myEmitter.on('push', () => {
            console.log(captionArray)
        })
        rl.on('line', (line) => {
            if(line.includes("\\numberline ".concat("{", objectFig.number, "}"))){
                objectFig.exist = true
                let caption = line.match(/ignorespaces.*relax/g)[0]
                let captionToWrite = (caption.replace('ignorespaces ', '').replace('\\relax', '').replace(/\s/g, '').replace(/Fig.*\\hbox\{\}/g, ''))
                captionArray.push(captionToWrite)
            }
        })

        if(captionArray.length > 1){
            console.error("ERROR: Repeated figure number appear in .lof file");
        } else {
            objectFig.caption = captionArray[0]
        }
        if(!objectFig.exist){
            objectFig.exist = false
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
    imgsrc.textContent = "This figure is at '".concat(objectFig.source.replace('\{', '').replace('\}', '')).replace(/\//g, ' / ').concat("'")
    if(!objectFig.source.includes(".eps")){
        img.src = globalpath.concat(objectFig.source.replace('{', '').replace('}', ''))
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
        return figs[0]
    } else {
        myEF.myEveryFiles(figs, checkFunc)
    }
}

function compareFigs(figA, figB){
    if (figA.source === figB.source &&
        figA.number === figB.number &&
        figA.caption === figB.caption &&
        figA.exist === figB.exist
    ){
        return true
    } else{
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
            ouput.push(Object.assign({}, objects[i]))
        }
    }
    return output
}

function searchCaption(file){
    // let buffer = stringer(100)      // If a line from the file has length > 100. Things get wrong (exceed length).
    // let bufferv = []
    // const Writable = require('stream').Writable
    // const myWritable = new Writable({
    //     write(buffer){},
    //     writev(bufferv){}
    // })
    const myEmitter = new MyEmitter();
    let queue = new NotifyArray([], myEmitter.on('event', () => {
      console.log(queue)
    }))

    const rl = readline.createInterface({
        input: fs.createReadStream(file),
        // output: myWritable
    });
    let subjectFigureHolder = new Figure()
    rl.on('line', (line) => {
        if(line.match("\\includegraphics")){
            subjectFigureHolder.exist = true
            subjectFigureHolder.source = line.match(/\{.*\}/)
        }
        if(line.match("\\input")){
            subjectFigureHolder.exist = true
            subjectFigureHolder.source = line.match(/\{.*\}/)
        }
        if(line.match("\caption") && (subjectFigureHolder.source)){
            subjectFigureHolder.caption = line.replace('\\caption\{', '').replace(/\}$/, '').replace(/\s/g, '').replace(/Fig\.\\ref\{.*\}/g, '')
            queue.push(copyFig(subjectFigureHolder))
            // console.log(queue);
            rl.write(subjectFigureHolder)
            subjectFigureHolder.clear()
        }
    })

    const compareFigtoObjF = function(subj){
        return compareFigs(objectFig, subj)
    }
    let compareResults = queue.map(compareFigtoObjF)
    let subjectFigure = returnSubjFig(extractArray(compareResults, compareFigtoObjF))
    if(subjectFigure){
        mergeFigs(subjectFigure, objectFig)
        return true
    } else {
        return false
    }
}


function dataRender(files) {
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
            searchFile()
            // searchFile(dataRender(data))
        } else{
            printFail("Wrong input format");
        }
    }
}, false)



// About array: stack, queue