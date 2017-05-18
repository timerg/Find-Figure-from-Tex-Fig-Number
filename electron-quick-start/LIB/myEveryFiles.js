


function myEveryFiles(files, usrFunc){
    console.log(files);
    let l = files.length
    if(usrFunc(files[0]) && (files[1]) ){
        myEveryFiles(files.slice(1, l), usrFunc)
    }
}

exports.myEveryFiles = myEveryFiles




