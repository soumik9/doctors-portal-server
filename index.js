//require files   // git push heroku main
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

// connect to mongo
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@doctors-portal.mmfug.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{

        //connect to mongodb collection
        await client.connect();
        const serviceCollection = client.db("doctors_portal").collection("services");
        
        // api homepage
        app.get('/' , (req, res) => {
            res.send('Doctors Portal Server Is Ready')
        })
      
        // get services
        app.get('/services' , async (req, res) => {
            const query = {};
            const curson = serviceCollection.find(query);
            const services = await curson.toArray();
            res.send(services);
          })
     
    }finally{

    }
}

run().catch(console.dir);

// port listening
app.listen(port, () => {
    console.log('Listening to port, ', port);
})