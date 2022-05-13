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

async function run() {
    try {

        //connect to mongodb collection
        await client.connect();
        const serviceCollection = client.db("doctors_portal").collection("services");
        const bookingCollection = client.db("doctors_portal").collection("bookings");

        // api homepage
        app.get('/', (req, res) => {
            res.send('Doctors Portal Server Is Ready')
        })

        // get services
        app.get('/services', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        })

        // get available slots
        app.get('/available', async (req, res) => {
            const date = req.query.date;
            const query = { date: date };

            // get all service
            const services = await serviceCollection.find().toArray();
            // get bookings of the day
            const bookings = await bookingCollection.find(query).toArray();

            services.forEach(service => {
                // get bookings by service in array
                const serviceBookings = bookings.filter(b => b.treatment === service.name);

                // getting all the booked slot in array
                const bookedSlots = serviceBookings.map(s => s.slot);

                //getting available slots array
                const available = service.slots.filter(s => !bookedSlots.includes(s));
                service.slots = available;
            })

            res.send(services);
        })

        // get bookings by email
        app.get('/booking', async (req, res) => {
            const patientEmail = req.query.patientEmail;
            const query = {patientEmail: patientEmail};
            const bookings = await bookingCollection.find(query).toArray();
            console.log(bookings);
            res.send(bookings);
        })

        // post booking
        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const query = { treatment: booking.treatment, date: booking.date, patientEmail: booking.patientEmail }

            const exists = await bookingCollection.findOne(query);

            if (exists) {
                return res.send({ success: false, booking: exists })
            } else {
                const result = await bookingCollection.insertOne(booking);
                return res.send({ success: true, result });
            }
        })

    } finally {

    }
}

run().catch(console.dir);

// port listening
app.listen(port, () => {
    console.log('Listening to port, ', port);
})