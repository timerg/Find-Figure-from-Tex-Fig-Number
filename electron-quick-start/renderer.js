const fs = require('fs');
const readline = require('readline');

let dirPath
let lofpath = "../main.lof"
let figure = {
    number: null,
    source: null,
    exist: false,
    caption: null
};

// Function
function searchFile() {
    const rl = readline.createInterface({       // Open readline interface
        input: fs.createReadStream(lofpath)
    });
    rl.on('line', (input) => {
        if(input.match("{".concat(figure.number, "}"))){
            figure.exist = true
            let caption = input.match(/ignorespaces.*relax/g)[0]
            figure.caption = caption.replace('ignorespaces ', '').replace('\\relax', '').replace(/\s/g, '')
        }
    });
    // console.log(figure);
}

function parseFigTex(filePath) {
    const rl = readline.createInterface({       // Open readline interface
        input: fs.createReadStream(filePath)
    });
    let source_temp
    rl.on('line', (input) => {
        if(input.match("\\includegraphics")){
            source_temp = input.match(/\{.*\}/)
        }
        if(input.match("\caption")){
            let caption_temp = input.replace('\\caption\{', '').replace(/\}$/, '').replace(/\s/g, '')
            // Some figure don't have caption
            if(figure.caption){
                if(figure.caption.includes(caption_temp)){
                    figure.source = source_temp[0]
                    rl.close()
                }
            } else {
                if(!caption_temp){
                    figure.source = source_temp[0]
                    rl.close()
                }
            }
        }
    });
}

function dirRender(path) {
    // dirClean()
    fs.readdir(path, (err, files) => {
        if(err !== null){
            if(!fs.existsSync(path)){
                console.log("not directory or a file")
            }else{
                console.log("it is a file");
                parseFigTex(path)
            }
        }
        else{
            files.forEach(file => {
                parseFigTex(path.concat(file))
            })
        }
    })
}

document.getElementById("DirectoryorFile").addEventListener('keyup', function() {
    dirPath = document.getElementById("DirectoryorFile").value
}, false);

document.getElementById("button").addEventListener("click", function(event) {
    dirPath = document.getElementById("DirectoryorFile").value
    figure.number = document.getElementById('fileName').value
    if(!figure.number){
        console.log("Empty figure name!");
    }
    // else if (!figure.number.match()) {
    //
    // }
    else {
        searchFile()
        dirRender(dirPath)
        console.log(figure)
    }
}, false);

document.getElementById("Test").addEventListener("click", () => {

}, false);
