// src: "http://blog.jaeckel.com/2010/03/i-tried-to-find-example-on-using-node.html"
// Module: FileLineReader
// Constructor: FileLineReader(filename, bufferSize = 8192)
// Methods: hasNextLine() -> boolean
//          nextLine() -> String
//


var fs = require("fs");

exports.FileLineReader = function(filename, bufferSize) {

    if(!bufferSize) {
        bufferSize = 8192;
    }

    var currentPositionInFile = 0;
    let buffer = Buffer.from(new Array(8192)).toString()
    var fd = fs.openSync(filename, "r");


// return -1
// when EOF reached
// fills buffer with next 8192 or less bytes
    var fillBuffer = function(position) {
        resNum = fs.readSync(fd, buffer, 0, bufferSize, position);      // var is the number of bytesRead
        if (resNum == 0) {
            return -1
        }
        return position + resNum

    }

    // if the file < bufferSize, currentPositionInFile = -1
    currentPositionInFile = fillBuffer(0);

//public:
    this.hasNextLine = function() {
        while (buffer.indexOf("\n") == -1) {
            currentPositionInFile = fillBuffer(currentPositionInFile);
            if (currentPositionInFile == -1) {
                // the file don't contain '\n'
                return false;
            }
        }

        if (buffer.indexOf("\n") > -1) {

            return true;
        }

        console.error("Exceptional problem. the index return ".concat(buffer.indexOf("\n")));
        return false;
    };

    //public:
    this.nextLine = function() {
        var lineEnd = buffer.indexOf("\n");
        var result = buffer.substring(0, lineEnd);

        buffer = buffer.substring(result.length + 1, buffer.length);
        return result;
    };

    return this;
}

