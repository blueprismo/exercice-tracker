'use strict'
const shortId = require('shortid')
const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const { json } = require('express')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//connection to dbase
let uri = process.env.MONGO_URI;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
// watch connection status
console.log(mongoose.connection.readyState);

//create schema
// --- person schema ---
const Schema = mongoose.Schema;
let exerciseSessionSchema = new mongoose.Schema({
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: String
})

let userSchema = new mongoose.Schema({
  username: {type: String, required: true},
  log: [exerciseSessionSchema]
})

let Session = mongoose.model('Session', exerciseSessionSchema)
let User = mongoose.model('User', userSchema)

app.post('/api/users', bodyParser.urlencoded({ extended: false }), (request, response) => {
  let newUser = new User({username: request.body.username})
  newUser.save((error, savedUser) => {
    if(!error){
      let responseObject = {}
      responseObject['username'] = savedUser.username
      responseObject['_id'] = savedUser.id
      response.json(responseObject)
    }
  })
})

app.get('/api/users', (request, response) => {
  
  User.find({}, (error, arrayOfUsers) => {
    if(!error){
      response.json(arrayOfUsers)
    }
  })
  
})

//post to /api/users/:id/exercises
//app.post('/api/users/:id/exercises'), bodyParser.urlencoded({ extended: false }) , (request, response) => {
//}

//app.post('/api/exercise/add', bodyParser.urlencoded({ extended: false }) , (request, response) => {
///api/users/:id/exercises  
app.post('/api/users/:id/exercises', bodyParser.urlencoded({ extended: false }) , (request, response) => {
  let id =request.params.id;

  let newSession = new Session({
    description: request.body.description,
    duration: parseInt(request.body.duration),
    date: request.body.date
  })
  
  if(newSession.date === ''){
    newSession.date = new Date().toISOString().substring(0, 10)
  }
  
  User.findByIdAndUpdate(
    //request.body.userId,
    id,
    {$push : {log: newSession}},
    {new: true},
    (error, updatedUser)=> {
      if(!error){
        let responseObject = {}
        responseObject['_id'] = updatedUser.id
        responseObject['username'] = updatedUser.username
        responseObject['date'] = new Date(newSession.date).toDateString()
        responseObject['description'] = newSession.description
        responseObject['duration'] = newSession.duration
        response.json(responseObject)
      } else {
        response.json(error);
      }
    }
  )
})

app.get('/api/users/:id/logs', (request, response) => {
  let id = request.params.id;
  //User.findById(request.query.userId, (error, result) => {
  User.findById(id, (error, result) => {  
    if(!error){
      let responseObject = result
      
      if(request.query.from || request.query.to){
        
        let fromDate = new Date(0)
        let toDate = new Date()
        
        if(request.query.from){
          fromDate = new Date(request.query.from)
        }
        
        if(request.query.to){
          toDate = new Date(request.query.to)
        }
        
        fromDate = fromDate.getTime()
        toDate = toDate.getTime()
        
        responseObject.log = responseObject.log.filter((session) => {
          let sessionDate = new Date(session.date).getTime()
          
          return sessionDate >= fromDate && sessionDate <= toDate
          
        })
        
      }
      
      if(request.query.limit){
        responseObject.log = responseObject.log.slice(0, request.query.limit)
      }
      
      responseObject = responseObject.toJSON()
      responseObject['count'] = result.log.length
      response.json(responseObject)
    }
  })
  
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
