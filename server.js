const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);

console.log(`Starting server on port ${process.env.SERVER_PORT} ...`);

app.use(express.static('dist'));

server.listen(process.env.SERVER_PORT, 'localhost');
server.on('listening', () => {
    console.log(`Server started: ${server.address().address}:${server.address().port}`);
});
