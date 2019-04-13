const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);

console.log('Starting server ...');

app.use(express.static('dist'));

server.listen(3000, 'localhost');

server.on('listening', () => {
    console.log(`Server started: ${server.address().address}:${server.address().port}`);
});
