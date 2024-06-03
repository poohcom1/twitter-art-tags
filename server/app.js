// @ts-check

const port = 5757;

const express = require('express')
const path = require('path')
const app = express()

const REACT_BUILD_PATH = '../client/build'

app.use(express.static(path.join(__dirname, REACT_BUILD_PATH)))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'))
})

app.get('/api', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})