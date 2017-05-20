


function myEvery(files, usrFunc){
    // console.log(files);
    let l = files.length
    if(usrFunc(files[0]) && (files[1]) ){
        myEvery(files.slice(1, l), usrFunc)
    }
}

exports.myEvery = myEvery




