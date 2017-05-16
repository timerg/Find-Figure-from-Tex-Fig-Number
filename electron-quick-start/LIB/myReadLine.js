// src: "http://blog.jaeckel.com/2010/03/i-tried-to-find-example-on-using-node.html"
// Module: FileLineReader
// Constructor: FileLineReader(filename, bufferSize = 8192)
// Methods: hasNextLine() -> boolean
//          nextLine() -> String
//
// Add: mark,


var fs = require("fs");


function stringer(number){
    let string = ""
    for(var i = 0; i < number; i++){
         string = string.concat("0")
    }
    return string
}

exports.FileLineReader = function(filename, bufferSize) {

    if(!bufferSize) {
        bufferSize = 8192;
    }

    var currentPositionInFile = 0;


    var mark
    var buffer = Buffer.from(stringer(bufferSize))
    var fd = fs.openSync(filename, "r");


// return -1
// when EOF reached
// fills buffer with next 8192 or less bytes
    var fillBuffer = function(position, marker, space) {
        resNum = fs.readSync(fd, buffer, marker, space, position);      // var is the number of bytesRead
        if (resNum == 0) {
            return -1
        }
        return position + resNum

    }

    // if the file < bufferSize, currentPositionInFile = -1
    currentPositionInFile = fillBuffer(0, mark, (bufferSize - mark + 1));

//public:
    this.hasNextLine = function() {
        while (buffer.indexOf(10) == -1) {
            currentPositionInFile = fillBuffer(currentPositionInFile, 0, bufferSize);
            if (currentPositionInFile == -1) {
                // the file don't contain '\n'
                return false;
            }
        }

        if (buffer.indexOf(10) > -1) {

            return true;
        }

        console.error("Exceptional problem. the index return ".concat(buffer.indexOf(10)));
        return false;
    };

    //public:
    this.nextLine = function() {
        var lineEnd = buffer.indexOf(10);
        var result = buffer.toString().substring(0, lineEnd);

        let remain = buffer.slice(lineEnd + 1, buffer[bufferSize])
        buffer.write(remain.toString(), 0)
        mark = bufferSize - lineEnd
        return result;
    };
    return this;
}

