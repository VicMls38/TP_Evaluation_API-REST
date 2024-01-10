const express = require('express');
const jwt = require('jsonwebtoken');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const { Socket } = require('dgram');
const { randomInt } = require('crypto');
const { start } = require('repl');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const port = 3000;

const users = [
    {
        name: "victor",
        password: "test"
    },
    {
        name: "toto",
        password: "123"
    }
];

const rooms = {
    room1: {
        sockets: [],
        stopTimes: [0, 0],
        startTime: 0,
        objectif: 0,
        distanceObj: [0, 0]
    }
}

Object.keys(rooms).map(k => rooms[k])
Object.values(rooms)



["room3231", 'roomsdsdsd3231']

const secretKey = 'yourSecretKey';

app.use(express.json());
app.use(cors());


app.get('/', (req, res) => {
    res.send('hello world ! ');
});

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });


    socket.on('login', async (data) => {

        const { username, password } = data;
        const hashedPassword = await bcrypt.hash(password, 10)

        console.log('Mot de passe hashé : ' + hashedPassword)
    
        const valid = users.some((user) => user.name === username && user.password === password)

        if (valid) {
            const token = jwt.sign({ username }, secretKey, { expiresIn: '1h' });
            socket.emit('authResponse', { success: true, token });

            console.log("OK !!!!")

        } else {
            socket.emit('authResponse', { success: false, message: 'Authentication failed' });
        }
    });

    socket.on('SwitchPage', async (response) => {
        console.log("Reponse pour le switch depuis le 1er retour : " + response);
        if (response === 'good') {
            socket.emit('GoodSwitchPage', "good");
    
            socket.join("Room-1");
            io.to(socket.id).emit("Room-1", "Room-1");

            rooms.room1.sockets.push(socket.id)
    
            const socketsInRoom = await io.in('Room-1').allSockets();
            console.log('Socket IDs in Room-1:', socketsInRoom);
            const nbClients = socketsInRoom.size;
            io.to("Room-1").emit("nbJoueurs", nbClients);
            console.log(nbClients);
    
            if (nbClients === 2) {
                let decompte = 5;
                let objectif = Math.floor(Math.random() * (10 - 2 + 1)) + 2;
                rooms.room1.objectif = objectif
                console.log(objectif);
    
                io.to("Room-1").emit("setDecompte", decompte, objectif);
                setTimeout(() => {
                    io.to("Room-1").emit("Start");
                    rooms.room1.startTime = Date.now();
                }, (decompte + 1) * 1000);
            }
        }
    });


    socket.on('Stop', () => {
        let time_stop = Date.now();
        let indexPlayer = rooms.room1.sockets.indexOf(socket.id) 
        console.log("Index du socket dans le tableau : " + indexPlayer)
        rooms.room1.stopTimes[indexPlayer] = time_stop

        let temps_reel = (rooms.room1.stopTimes[indexPlayer] - rooms.room1.startTime) / 1000
        rooms.room1.stopTimes[indexPlayer] = temps_reel
        console.log("Temps réel : " + temps_reel)
        
        console.log("Le temps de départ = " + rooms.room1.startTime / 1000);
        console.log(temps_reel);

        io.to(socket.id).emit("Time_Stop", temps_reel);
        console.log(rooms.room1.stopTimes)

        let distance_Obj = Math.abs(temps_reel - rooms.room1.objectif)
        rooms.room1.distanceObj[indexPlayer] = distance_Obj

        console.log("Tab_objectifs : " + rooms.room1.distanceObj)
        const tousNonZero = rooms.room1.distanceObj.every(ecartObj => ecartObj !== 0);
        if(tousNonZero){
            if(rooms.room1.distanceObj[0] < rooms.room1.distanceObj[1]){
                if(indexPlayer == 0){
                    io.to(socket.id).emit("FinalResult", "WIN")
                }else{
                    io.to(socket.id).emit("FinalResult", "LOSE")
                }
            }else{
                io.to(socket.id).emit("FinalResult", "EGALITY")
            }
            
        }
    
        
    });


});

server.listen(port, () => {
    console.log('App listening at http://localhost:' + port);
});
