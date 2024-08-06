var http = require('http');
var fs = require('fs');
var path = require('path');

let port = 8080;
if (process.argv.length > 2) {
    port = process.argv[2];
}

http.createServer(function (request, response) {
    console.log('Request - ' + request.url);

    var filePath = '.' + request.url.split('?')[0];
    if (filePath === './')
        filePath = './index.html';

    if (/\.\/p\/[A-Za-z]+\/[A-Za-z0-9]+/i.test(filePath)) {
        filePath = './p.html'
        //filePath = './p.staff.html' //for staff view.
    }

    var extname = path.extname(filePath);
    var contentType = 'text/html';
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.jpg':
            contentType = 'image/jpg';
            break;
        case '.svg':
            contentType = 'image/svg+xml';
            break;
        case '.wav':
            contentType = 'audio/wav';
            break;
    }

    fs.readFile(filePath, function(error, content) {
        if (error) {
            if(error.code === 'ENOENT'){
                fs.readFile(filePath+'.html', function(error, content) {
                    if (error) {
                        if(error.code === 'ENOENT'){
                            response.writeHead(200);
                            response.end("Sorry the file '" + filePath + "' could not be found on disk.", 'utf-8');
                        }
                        else {
                            response.writeHead(500);
                            response.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
                            response.end();
                        }
                    }
                    else {
                        response.writeHead(200, { 'Content-Type': contentType });
                        response.end(content, 'utf-8');
                    }
                });
            }
            else {
                response.writeHead(500);
                response.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
                response.end();
            }
        }
        else {
            response.writeHead(200, { 'Content-Type': contentType });
            response.end(content, 'utf-8');
        }
    });

}).listen(port);

console.log('Server running at http://127.0.0.1:'+port+'/');