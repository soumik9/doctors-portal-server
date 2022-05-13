//require files
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
const uri = `mongodb+srv://${DB_USER}:${DB_PASSWORD}@doctors-portal.mmfug.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
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

        // api homepage
      

     
    }finally{

    }
}

run().catch(console.dir);

// port listening
app.listen(port, () => {
    console.log('Listening to port, ', port);
})