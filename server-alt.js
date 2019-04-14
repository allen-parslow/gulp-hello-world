const express = require('express');
const http = require('http');
const chalk = require('chalk');

const app = express();
const server = http.createServer(app);

console.log(chalk.gray.bgMagenta(`Starting alt server on port ${process.env.SERVER_PORT} ...`));

app.use(express.static('dist'));

server.listen(process.env.SERVER_PORT, 'localhost');
server.on('listening', () => {
    console.log(chalk.gray.bgMagenta(`Server started: ${server.address().address}:${server.address().port}`));
});
