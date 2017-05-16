
var fs = require("fs");

exports.FileLineReader = function(filename, bufferSize) {

    if(!bufferSize) {
        bufferSize = 8192;
    }

    var currentPositionInFile = 0;
    var buffer = "";
    var fd = fs.openSync(filename, "r");


// return -1
// when EOF reached
// fills buffer with next 8192 or less bytes
    var fillBuffer = function(position) {
        var res = fs.readSync(fd, bufferSize, position, "ascii");      // var is the number of bytesRead

        buffer += res[0];
        if (res[1] == 0) {
            return -1;
        }
        return position + res[1];

    };

    currentPositionInFile = fillBuffer(0);

//public:
    this.hasNextLine = function() {
        while (buffer.indexOf("\n") == -1) {
            currentPositionInFile = fillBuffer(currentPositionInFile);
            if (currentPositionInFile == -1) {
                return false;
            }
        }

        if (buffer.indexOf("\n") > -1) {

            return true;
        }
        return false;
    };



}

exports.Test = function(filename){
    let buffer = Buffer.from("1234567890")
    let position = 0
    let fd = fs.openSync(filename, "r");
    fs.readSync(fd, buffer, 0, 7, 0)
    console.log(buffer);
    console.log(buffer.toString());
}
