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
const { time } = require('console');

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
        distanceObj: [0, 0],
        restartClickCount: 0
    }
}


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
        console.log("TEST boolean : " + rooms.room1.distanceObj.every(ecartObj => ecartObj !== 0))
        const tousNonZero = rooms.room1.distanceObj.every(ecartObj => ecartObj !== 0);
        if (tousNonZero) {
            console.log("INDEXPLAYER : " + indexPlayer)
            console.log("TEST condition : " + rooms.room1.distanceObj[0] < rooms.room1.distanceObj[1])
        
            if (rooms.room1.distanceObj[0] !== rooms.room1.distanceObj[1]) {
                const winner = (rooms.room1.distanceObj[0] < rooms.room1.distanceObj[1]) ? 0 : 1;
                const result = (indexPlayer === winner) ? "WIN" : "LOSE";
                io.to(rooms.room1.sockets[0]).emit("FinalResult", (winner === 0) ? "WIN" : "LOSE");
                io.to(rooms.room1.sockets[1]).emit("FinalResult", (winner === 1) ? "WIN" : "LOSE");
                console.log(result);
            } else {
                io.to(rooms.room1.sockets[0]).emit("FinalResult", "EGALITY");
                io.to(rooms.room1.sockets[1]).emit("FinalResult", "EGALITY");
                console.log("EGALITY");
            }
        }
        
    });


    socket.on("Restart", () => {
        rooms.room1.sockets = [];
        rooms.room1.stopTimes = [0, 0];
        rooms.room1.startTime = 0;
        rooms.room1.objectif = 0;
        rooms.room1.distanceObj = [0, 0];
        // Incrémentez le compteur
        rooms.room1.restartClickCount++;
    
        // Vérifiez si les deux joueurs ont cliqué
        if (rooms.room1.restartClickCount === 2) {
            // Émettez un événement "Reload" après une pause de 3 secondes
            setTimeout(() => {
                console.log("Pause de 3 secondes terminée");
                io.emit("Reload");
                // Réinitialisez le compteur
                rooms.room1.restartClickCount = 0;
            }, 3000);
        }
        io.emit("PlayerReady", rooms.room1.restartClickCount);
    });

});

server.listen(port, () => {
    console.log('App listening at http://localhost:' + port);
});
