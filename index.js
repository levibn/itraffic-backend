var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mysql = require('mysql');
var cron = require('node-cron');
var request = require('request');
var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "levibn123",
    database: "iTraffic"
  });
  
con.connect(function(err) {
    if (err) throw err;
    console.log("Connected to our DB!");
});
function getSpeeds(){
    con.query('SELECT *, trafficlights.id as t_id FROM nets JOIN trafficlights ON nets.id = net_id', function (err, result) {
        if (err) throw err;
        result.forEach(function(e) {
            origin = e.reference_range.split(";")[0];
            destin = e.reference_range.split(";")[1];
            var url = "https://maps.googleapis.com/maps/api/distancematrix/json?origins="+origin+"&departure_time="+parseInt(Date.now()/1000)+"&destinations="+destin+"&mode=driving&language=pt-BR&key=AIzaSyDChdp6-vn-FBRrcjnzHxKUdBeAdV-s3_w";
            console.log(url);
            request(url, function (error, response, body) {
                console.log('error:', error); // Print the error if one occurred
                body = JSON.parse(body);
                //console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
                //console.log('body:', body); // Print the HTML for the Google homepage.
                con.query('UPDATE trafficlights SET reference_speed = "'+(body.rows[0].elements[0].distance.value/parseFloat(body.rows[0].elements[0].duration_in_traffic.value)).toPrecision(1)+'" WHERE id = '+e.t_id, function(err, result){
                    e.reference_speed = (body.rows[0].elements[0].distance.value/body.rows[0].elements[0].duration_in_traffic.value).toPrecision(1);
                    io.emit('getNet_result', {data: [e]});
                });

            });
        }, this);
    });
}
cron.schedule('*/5 * * * *', getSpeeds);
app.get('/', function(req, res){
  res.sendFile('/home/levi/Documents/itraffic-viewer/index.html');
});
app.get('/chat', function(req, res){
    res.sendFile(__dirname + '/index.html');
});
app.get('/trafficlight.png', function(req, res){
    res.sendFile('/home/levi/Documents/itraffic-viewer/trafficlight.png');
});

app.get('/trafficlight-grey.png', function(req, res){
    res.sendFile('/home/levi/Documents/itraffic-viewer/trafficlight-grey.png');
});


io.on('connection', function(socket){
    ID = socket.id;
    console.log('a user connected', ID);
    socket.on('disconnect', function(){
      console.log('user disconnected');
    });
    socket.on('chat message', function(msg){
        console.log('message: ' + msg);
        io.emit('chat message', msg);
    });
    socket.on('getNet', function(netid){
        con.query('SELECT * FROM nets JOIN trafficlights ON nets.id = net_id WHERE net_id = ' + netid, function (err, result) {
            if (err) throw err;
            //console.log("Result: ", result);
            io.to(ID).emit('getNet_result', {data: result});
        });
    });
});/*
while(true){
}*/
http.listen(3000, function(){
  console.log('listening on *:3000');
});
    