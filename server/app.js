// @ts-check

const port = 5757;

const express = require('express')
const path = require('path')
const cors = require('cors')

const app = express()

const REACT_BUILD_PATH = '../client/build'

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, REACT_BUILD_PATH)))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'))
})

app.post('/api/addTag', (req, res) => {
  const { id, tag, imageSrcs } = req.body;

  // Validate the input
  if (typeof id !== 'string' || typeof tag !== 'string' || !Array.isArray(imageSrcs)) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  // Process the input (For now, just log it)
  console.log('ID:', id);
  console.log('Tag:', tag);
  console.log('Image Srcs:', imageSrcs);

  // Here you would add your logic to handle the data
  // For example, save it to a database

  // Send a success response
  res.status(200).json({ message: 'Tag added successfully' });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})