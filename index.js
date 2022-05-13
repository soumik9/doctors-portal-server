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
        const bookingCollection = client.db("doctors_portal").collection("bookings");
         
        // api homepage
        app.get('/' , (req, res) => {
            res.send('Doctors Portal Server Is Ready')
        })
      
        // get services
        app.get('/services' , async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
          })


        // post booking
        app.post('/booking' , async (req, res) => {
            const booking = req.body;
            const query = {treatment: booking.treatment, date: booking.date, patientEmail: booking.patientEmail}

            const exists = await bookingCollection.findOne(query);

            if(exists){
                return res.send({success: false, booking: exists})
            }else{
                const result = await bookingCollection.insertOne(booking);
                return res.send({success: false, result});
            }
          })
     
    }finally{

    }
}

run().catch(console.dir);

// port listening
app.listen(port, () => {
    console.log('Listening to port, ', port);
})