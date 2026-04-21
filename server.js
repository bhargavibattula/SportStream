import WebSocket from "ws";

const wss = new WebSocket.Server({ port: 8080 });


//Connect
wss.on('connection' , (socket , request) =>{
    console.log('a user connected');

    //On message
    socket.on('message' , (message) =>{
        console.log(`Received message ${message}`);
    })

    //On disconnect
    socket.on('close' , () =>{
        console.log('user disconnected');
    })
});