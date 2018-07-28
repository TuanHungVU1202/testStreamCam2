var express = require('express');		//add comment de test github update
var app = express();
var pug = require('pug');
var exphbs  = require('express-handlebars');
var fetch = require('node-fetch');
var bodyParser = require('body-parser');

//var mongoConfig = require ('./mongoConfig');

var port = process.env.PORT || 2111;
app.listen(port, function() {
    console.log("App is running on port " + port);
});

//mongodb on mlab
var mongourl= 'mongodb://admin:admin123@ds139942.mlab.com:39942/mongotest-1';
//declare for mongodb
var MongoClient = require('mongodb').MongoClient;

//setup socket.io
const client = require('socket.io').listen(1202).sockets;

assert = require('assert');

const path = require('path');
app.set('view engine', 'handlebars');
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());


//Init variables for data from Sensor
var temperature = 21;
var humid = 11;
var gasDetection = "NO";
var humanDetection = "NO";
var securityStatus = "UNARMED";
var Power = 0;


/*  getDate, getMonth, getFullYear are defined methods
    Methods return number, eg. getDate returns day of the month from 1 to 31
    details at https://www.w3schools.com/jsref/jsref_obj_date.asp
    */
var d1 = new Date();
dateNow =  d1.getDate();
monthNow = d1.getMonth() + 1;	//return value from 0 so must plus 1
yearNow =  d1.getFullYear();
var dateFilter = dateNow;
var monthFilter = monthNow;
var yearFilter = yearNow;

var chartTime = [];
var chartPower = [];
var chartCount = 0;
//var chartTime2 = ["1:00","3:30","4:15","6:15","7:15","8:15"];

//https://stackoverflow.com/questions/7357734/how-do-i-get-the-time-of-day-in-javascript-node-js
//Login variables for webServer
var username = "vthung";
var password = "admin"; 
var loginFlag = false;

var checkChangedFlag = {};
checkChangedFlag.changedFlagStatus = "false";

//init states for devices
var deviceState = {};
/*
deviceState.device1 = "off";
deviceState.device2 = "off";
deviceState.device3 = "off";
deviceState.device4 = "off";
*/
deviceState.device1TimeOn = "00:00";
deviceState.device1TimeOff = "00:00";
deviceState.device2TimeOn = "00:00";
deviceState.device2TimeOff = "00:00";
deviceState.device3TimeOn = "00:00";
deviceState.device3TimeOff = "00:00";
deviceState.device4TimeOn = "00:00";
deviceState.device4TimeOff = "00:00";

//init scenes
var scenes = {};
scenes.iAmHome = "off";
scenes.goodmorning = "off";
scenes.goodnight = "off";
scenes.security = "off";



app.get('/', function (req, res) {
    //console.log(chartTime);
    res.redirect('/login');
});

app.get('/login', function (req, res) {
    loginFlag = false;
    res.render('login');
});

//LOGIN
app.post('/logincheck', function(req,res){
    if(req.body.username === username  && req.body.password === password){
        console.log("OK");
        loginFlag = true;
        res.redirect('/home');
    }
    else {
        console.log("Fail");
        res.redirect('/');
    }
});

app.get('/logincheckNodeMCU', function(req,res){
    if(req.query.username === username  && req.query.password === password){
        console.log("OK");
        loginFlag = true;
        res.redirect('/home');
    }
    else {
        console.log("Fail");
        res.redirect('/');
    }
});

//HOME
app.get('/home', function (req, res) {
    if(loginFlag === true){ 
        MongoClient.connect(mongourl, function(err, db){
            chartCount = 0;
            chartTime = [];
            chartPower = [];
            assert.equal(null,err);
            var projection = {
            	"date" :1, 
            	"year" :1,
            	"month" :1, 
            	"time" :1, 
            	"P":1, 
            	"_id":0};
            var d = new Date();
            var cursor = db.collection('test2').find({
            	time: {$gt: '1.20'},
            	date: {$eq: d.getDate()},
            	month: {$eq: d.getMonth()+1},
            	year: {$eq: d.getFullYear()}
            });
            cursor.project(projection);
            cursor.forEach(
                function(doc) {
                    chartTime[chartCount] = doc.time;
                    chartPower[chartCount] = doc.P;
                    chartCount++;
                    console.log(doc.year);
                },
                function(err) {
                    assert.equal(err, null);
                    return db.close();
                }
            ); 
        });

        //render page with route /home
        res.render('home',{
            chartTime: chartTime,
            chartPower: chartPower,
            insideTemperature: temperature,
            insideHumidity: humid,
            gasDetection: gasDetection,
            humanDetection: humanDetection,
            securityStatus: securityStatus,

            letterInsideGasdetectionBox : (gasDetection === "YES") ? "red": "blue",
            letterInsideHumandetectionBox: (humanDetection === "YES") ? "red": "blue",
            letterInsideSecurityBox: (securityStatus === "ARMED") ? "blue": "red",
        });
        
    }
    else 
        res.redirect('/');
});

/*CONTROL
    Link with control.handlerbars, see device1ButtonColor and so on
    This should be the procedure in which Application server take data out from mongoDB and control devices
    by sending command directly back to NodeMCU

*/
app.get('/control', function (req, res) {
    if (loginFlag === true) {
        //declare connect mongo to use with app.post devices for control page
        MongoClient.connect(mongourl, function (err, db) {
            //config devices for floor1
            var floor1 = db.collection('floor1');

            //Check current device state from MongoDB to keep the website up to date
            //setInterval to run the inside function repeatedly with Interval = 10ms to keep website up-to-date as fast as possible
            setInterval(function () {
            var cursor1 = floor1.find(
                {_id: {$eq:"F1.1"}}
            );
            cursor1.forEach(
                function (doc) {
                    deviceState.device1 = doc.state;
                }
            );
            var cursor2 = floor1.find(
                {_id: {$eq:"F1.2"}}
            );
            cursor2.forEach(
                function (doc) {
                    deviceState.device2 = doc.state;
                }
            );
            var cursor3 = floor1.find(
                {_id: {$eq:"F1.3"}}
            );
            cursor3.forEach(
                function (doc) {
                    deviceState.device3 = doc.state;
                }
            );
            var cursor4 = floor1.find(
                {_id: {$eq:"F1.4"}}
            );
            cursor4.forEach(
                function (doc) {
                    deviceState.device4 = doc.state;
                }
            );
            },10);       //10 ms

            // Post state of devices to control them
            app.post('/device1', function (req, res) {
                deviceState.device1 = (deviceState.device1 === "on") ? "off" : "on";

                if (deviceState.device1 === "on") {
                    floor1.updateMany(
                        {"_id": "F1.1", state: "off"},
                        {$set: {state: "on"}}               //without $set mongoDB won't update state field
                    )
                }
                else {
                    floor1.updateMany(
                        {"_id": "F1.1", state: "on"},
                        {$set: {state: "off"}},
                    )
                }
                checkChangedFlag.changedFlagStatus = "true";
                //res.redirect('/control');
            });
            app.post('/device2', function (req, res) {
                deviceState.device2 = (deviceState.device2 === "on") ? "off" : "on";
                if (deviceState.device2 === "on") {
                    floor1.updateMany(
                        {"_id": "F1.2", state: "off"},
                        {$set: {state: "on"}}
                    )
                }
                else {
                    floor1.updateMany(
                        {"_id": "F1.2", state: "on"},
                        {$set: {state: "off"}},
                    )
                }
                checkChangedFlag.changedFlagStatus = "true";
                //res.redirect('/control');
            });
            app.post('/device3', function (req, res) {
                deviceState.device3 = (deviceState.device3 === "on") ? "off" : "on";
                if (deviceState.device3 === "on") {
                    floor1.updateMany(
                        {"_id": "F1.3", state: "off"},
                        {$set: {state: "on"}}
                    )
                }
                else {
                    floor1.updateMany(
                        {"_id": "F1.3", state: "on"},
                        {$set: {state: "off"}},
                    )
                }
                checkChangedFlag.changedFlagStatus = "true";
                //res.redirect('/control');
            });
            app.post('/device4', function (req, res) {
                deviceState.device4 = (deviceState.device4 === "on") ? "off" : "on";
                if (deviceState.device4 === "on") {
                    floor1.updateMany(
                        {"_id": "F1.4", state: "off"},
                        {$set: {state: "on"}}
                    )
                }
                else {
                    floor1.updateMany(
                        {"_id": "F1.4", state: "on"},
                        {$set: {state: "off"}},
                    )
                }
                checkChangedFlag.changedFlagStatus = "true";
                //res.redirect('/control');
            });


            res.render('control', {
                device1state: (deviceState.device1 === "on") ? 'ON' : 'OFF',
                device2state: (deviceState.device2 === "on") ? 'ON' : 'OFF',
                device3state: (deviceState.device3 === "on") ? 'ON' : 'OFF',
                device4state: (deviceState.device4 === "on") ? 'ON' : 'OFF',

                device1ButtonColor: (deviceState.device1 === "on") ? "blue" : "red",
                device2ButtonColor: (deviceState.device2 === "on") ? "blue" : "red",
                device3ButtonColor: (deviceState.device3 === "on") ? "blue" : "red",
                device4ButtonColor: (deviceState.device4 === "on") ? "blue" : "red",
            });
        });
    }
    else
        res.redirect('/');
});

//Trang hẹn giờ
app.get('/submitTheTimeDevice1', function(req,res){
   deviceState.device1TimeOn = req.query.setTimeOn;
   deviceState.device1TimeOff = req.query.setTimeOff;
   checkChangedFlag.changedFlagStatus = "true";
   res.redirect('/control');
});
app.get('/submitTheTimeDevice2', function(req,res){
    deviceState.device2TimeOn = req.query.setTimeOn;
    deviceState.device2TimeOff = req.query.setTimeOff;
    checkChangedFlag.changedFlagStatus = "true";
    res.redirect('/control');
});
app.get('/submitTheTimeDevice3', function(req,res){
    deviceState.device3TimeOn = req.query.setTimeOn;
    deviceState.device3TimeOff = req.query.setTimeOff;
    checkChangedFlag.changedFlagStatus = "true";
    res.redirect('/control');
});
app.get('/submitTheTimeDevice4', function(req,res){
    deviceState.device4TimeOn = req.query.setTimeOn;
    deviceState.device4TimeOff = req.query.setTimeOff;
    checkChangedFlag.changedFlagStatus = "true";
    res.redirect('/control');
});


//SCENES
app.get('/scenesjson', function (req, res) {
    res.end(JSON.stringify(scenes));
});

app.get('/scenes', function (req, res) {
    if(loginFlag === true) {
        MongoClient.connect(mongourl, function (err, db) {
            //config devices for floor1
            var floor1 = db.collection('floor1');

            //Gui scenes
            app.post('/goodmorning', function (req, res) {
                scenes.goodmorning = (scenes.goodmorning === "on") ? "off" : "on";
                scenes.iAmHome = "off";
                scenes.goodnight = "off";
                scenes.security = "off";
                //updateMany for updating database
                //maybe need an IF statement in oder not to affect the global DB
                floor1.updateMany(
                    {"_id": "F1.1"},
                    {$set: {state: "on"}}
                );
                floor1.updateMany(
                    {"_id": "F1.2"},
                    {$set: {state: "on"}}
                );
                floor1.updateMany(
                    {"_id": "F1.3"},
                    {$set: {state: "off"}}
                );
                //deviceState for updating button control in Control page
                deviceState.device1 = "on";
                deviceState.device2 = "on";
                deviceState.device3 = "off";
                checkChangedFlag.changedFlagStatus = "true";
                res.redirect('/scenes');
            });
            app.post('/iamhome', function (req, res) {
                scenes.iAmHome = (scenes.iAmHome === "on") ? "off" : "on";
                scenes.goodmorning = "off";
                scenes.goodnight = "off";
                scenes.security = "off";
                floor1.updateMany(
                    {"_id": "F1.1"},
                    {$set: {state: "on"}}
                );
                floor1.updateMany(
                    {"_id": "F1.2"},
                    {$set: {state: "on"}}
                );
                floor1.updateMany(
                    {"_id": "F1.3"},
                    {$set: {state: "on"}}
                );
                deviceState.device1 = "on";
                deviceState.device2 = "on";
                deviceState.device3 = "on";
                checkChangedFlag.changedFlagStatus = "true";
                res.redirect('/scenes');
            });
            app.post('/goodnight', function (req, res) {
                scenes.goodnight = (scenes.goodnight === "on") ? "off" : "on";
                scenes.goodmorning = "off";
                scenes.iAmHome = "off";
                scenes.security = "off";
                floor1.updateMany(
                    {"_id": "F1.1"},
                    {$set: {state: "off"}}
                );
                floor1.updateMany(
                    {"_id": "F1.2"},
                    {$set: {state: "off"}}
                );
                floor1.updateMany(
                    {"_id": "F1.3"},
                    {$set: {state: "off"}}
                );
                deviceState.device1 = "off";
                deviceState.device2 = "off";
                deviceState.device3 = "off";
                checkChangedFlag.changedFlagStatus = "true";
                res.redirect('/scenes');
            });
            app.post('/security', function (req, res) {
                scenes.security = (scenes.security === "on") ? "off" : "on";
                scenes.goodmorning = "off";
                scenes.iAmHome = "off";
                scenes.goodnight = "off";
                res.redirect('/scenes');
            });
            res.render('scenes', {
                goodmorningColor: (scenes.goodmorning === "on") ? "blue" : "red",
                iAmHomeColor: (scenes.iAmHome === "on") ? "blue" : "red",
                goodnightColor: (scenes.goodnight === "on") ? "blue" : "red",
                securityColor: (scenes.security === "on") ? "blue" : "red",
            });
        });
    }
    else
        res.redirect('/');
});


//CHART
app.get('/chart', function (req, res) {
    if(loginFlag === true){
        MongoClient.connect(mongourl, function(err, db){
            assert.equal(null,err);
            chartCount = 0;
            chartTime = [];
            chartPower = [];
            var projection = {
                "date" :1, 
                "year" :1,
                "month" :1, 
                "time" :1, 
                "P":1, 
                "_id":0
            };
            var d = new Date();
            var cursor = db.collection('test2').find({
                date: {$eq: dateFilter},
                month: {$eq: monthFilter},
                year: {$eq: yearFilter}  
            });
            cursor.project(projection);
            cursor.forEach(
                function(doc) {
                    chartTime[chartCount] = doc.time;
                    chartPower[chartCount] = doc.P;
                    chartCount++;
                    console.log(doc.year);
                },
                function(err) {
                    assert.equal(err, null);
                    return db.close();
                }
            ); 
        });
        res.render('chart',{
            date: dateFilter,
            month: monthFilter,
            year: yearFilter,
            chartTime: chartTime,
            chartPower: chartPower
        });
    }
    else
        res.redirect('/');
});

//Filter wanted values in CHART page
app.get('/filterPower', function (req, res) {
    var a = req.query.chartChooseMonth + " " + req.query.chartChooseDate + " " + req.query.chartChooseYear;
    var b = new Date(a);
    dateFilter = b.getDate();
    monthFilter = b.getMonth()+1;
    yearFilter = b.getFullYear();
    res.redirect('/chart');
});


//CAMERA
app.get('/camera', function (req, res) {
    if(loginFlag === true){
        res.render('camera');
    }
    else
        res.redirect('/');

});


//CHAT page using NodeJs, MongoDB and Socket.io
app.get('/chat', function(req, res){
    if (loginFlag === true){
        res.render('chat');
        MongoClient.connect(mongourl, function (err, db) {
            if(err){
                throw err;
            }
            //res.render('chat');
            //var chats = db.collection('chats');
            //connect to socket.io. USE client.ONCE to avoid duplicate message on client site
            client.once('connection', function(socket){
                //socket.removeAllListeners();
                var chats = db.collection('chats');

                //create func to send status
                sendStatus = function(s){
                    socket.emit('status',s);
                };
                //access chats in mongoDB
                chats.find().limit(100).sort({_id:1}).toArray(function (err, res){
                    if(err){
                        throw err;
                    }
                    // Emit messages
                    socket.emit('output',res);
                });

                //handle input events
                socket.on('input', function (data) {
                  var name = data.name;
                  var message = data.message;

                  //check for name and message if they are blanked
                    if(name == '' || message == ''){
                        //send error status
                        sendStatus('Please enter at least one name or message');
                    }
                    else{
                        //insert message to mongodb or so called : send message
                        chats.insert({name: name, message: message}, function () {
                            client.emit('output', [data]);

                            //send status back
                            sendStatus({
                                message: 'Message sent',
                                clear: true
                            });
                        });
                    } //else bracket
                });

                // Handle clear
                socket.on('clear', function (data) {
                   //Remove all chats from collection of mongoDB
                   chats.remove({}, function () {
                       //emit cleared
                       socket.emit('cleared');
                   });
                });
            }); //bracket of client.on
        });     //bracket of mongo
        //res.render('chat');
    }
    else
        res.redirect('/');

});



/*
Read state SENT from System through INTERNET by nodeMCU. Then log deviceState to MongoDB
Problem maybe caused from here. LOOK here first if hardware does not interact with web app

 */
app.get('/readStateFromSystem', function (req, res) {
    MongoClient.connect(mongourl, function(err, db){
        var floor1 = db.collection('floor1');

        //Receive state from System by Internet
    if(req.query.device1){
        deviceState.device1 = req.query.device1;
        floor1.updateMany(
            {"_id": "F1.1"},
            {$set: {"_id": "F1.1", name: "Front Light", state: req.query.device1}}, //use req.query to GET device state from NodeMCU
            {upsert: true}
            );
    }
    if(req.query.device2){
        deviceState.device2 = req.query.device2;
        floor1.updateMany(
            {"_id": "F1.2"},
            {$set: {"_id": "F1.2", name: "Stair Light", state: req.query.device2}},
            {upsert: true}
            );
    }
    if(req.query.device3){
        deviceState.device3 = req.query.device3;
        floor1.updateMany(
            {"_id": "F1.3"},
            {$set: {"_id": "F1.3", name: "Air Cooler", state: req.query.device3}},
            {upsert: true}
            );
    }
    if(req.query.device4){
        deviceState.device4 = req.query.device4;
        floor1.updateMany(
            {"_id": "F1.4"},
            {$set: {"_id": "F1.4", name: "Power Tracker", state: req.query.device4}},
            {upsert: true}
            );
        }
    });
});


/* Read value from system and return JSON page to client
*/
app.get('/temp', function (req, res) {
    res.end(JSON.stringify(temperature));		//return JSON contains value of temperature for customer (return directly on website)
});
app.get('/humid', function (req, res) {		
    res.end(JSON.stringify(humid));				//return JSON contains value of humid for customer (return directly on website)
});
app.get('/gas', function (req, res) {
    res.end(JSON.stringify(gasDetection));
});


/*  route get from NodeMCU arduino code function sendDataFromSensorToInternet
    read value and save to mongoDB
    */

app.get('/readTempFromSystem', function (req, res) {
    temperature = req.query.temperature;					
});
app.get('/readHumidFromSystem', function (req, res) {
    humid = req.query.humid;
});
app.get('/readGasFromSystem', function (req, res) {
    gasDetection = req.query.gasDetection;
});
app.get('/readHumanFromSystem', function (req, res) {
    humanDetection = req.query.humanDetection;
});

// Read Power value from System by NodeMCU through Internet, then Log data into MongoDB
app.get('/readPowerFromSystem', function (req, res) {
    var d = new Date();
    Power = req.query.Power;
    MongoClient.connect(mongourl, function(err, db){
        assert.equal(null,err);
        db.collection('test2').insertOne({
        	"deviceID": "", 
        	"date": d.getDate(), 
        	"month": d.getMonth()+1, 
        	"year": d.getFullYear(), 
        	"time": d.getHours() + "." + d.getMinutes(), 
        	"P": req.query.Power
        })
    });
});

app.get('/Power', function (req, res) {
    res.end(JSON.stringify(Power));
});

//JSON page receive state from deviceState
app.get('/state', function (req, res) {
    res.end(JSON.stringify(deviceState));
});


//reset update flag in NodeMCU
app.get('/checkChangedFlag', function(req,res){
    if(req.query.device === "NodeMCU"){
        checkChangedFlag.changedFlagStatus = "false";
    }
    res.end(JSON.stringify(checkChangedFlag));
});


/*
app.get('/process_get', function (req, res) {
   response = {
      first_name:req.query.first_name,
   };
   a = req.query.first_name;
   console.log(response);
   res.end(JSON.stringify(response));
});
*/







//var mongourl = 'mongodb://localhost:27017//video';
/*
// Fetch data
function FetchData(){
    fetch('http://192.168.122.26/mrbs_sourcecode/API/Demo/APIController.php')
        .then(function(res) {
            return res.json();
        }).then(function(json) {
            a = json.API[0].id;
            console.log(a);
        })

}
*/

//connect mongoDb using mLab
/*
MongoClient.connect(mongourl, function(err, db){
    assert.equal(null,err);
    console.log("Successfully connected to MongoDB");

//config devices for floor1
    var floor1 = db.collection('floor1');
    //below var device is useless but still keep it for clearer view of devices in DB
	var device = [
        {"_id": "F1.1", name: "Front Light", state: "off"},
        {"_id": "F1.2", name: "Stair Light", state: "off"},
        {"_id": "F1.3", name: "Air Cooler", state: "off"},
        {"_id": "F1.4", name: "Power Tracker", state: "off"}
    ];
//upsert: true means write new document if not yet exist. otherwise update fields
   	floor1.updateMany(
    	{"_id": "F1.1"},
    	{$set: {"_id": "F1.1", name: "Front Light", state: "off"}},
    	{upsert: true}
    );
	floor1.updateMany(
    	{"_id": "F1.2"},
    	{$set: {"_id": "F1.2", name: "Stair Light", state: "off"}},
    	{upsert: true}
    );
	floor1.updateMany(
    	{"_id": "F1.3"},
    	{$set: {"_id": "F1.3", name: "Air Cooler", state: "off"}},
    	{upsert: true}
    );
    	floor1.updateMany(
    	{"_id": "F1.4"},
    	{$set: {"_id": "F1.4", name: "Power Tracker", state: "off"}},
    	{upsert: true}
    );
/*
	projection allows to include or exclude fields in mongoDB query
	1 indicate including a field and 0 is excluding.
	=> include field "date", "year", "month", "time", "P"
	=> exclude field "_id"
	see https://stackoverflow.com/questions/19684757/mongodb-query-criterias-and-projections
	and http://mongodb.github.io/node-mongodb-native/2.2/tutorials/projections/
*/
/*    var projection = {
    	"date" :1,
    	"year" :1,
    	"month" :1,
    	"time" :1,
    	"P":1,
    	"_id":0
    	//if needed, add field "deviceID" by the following line
    	//"deviceID": 1,
    	};

    //db.collection('test2').insertOne({"deviceID": "D04", "date": d.getDate(), "month": d.getMonth(), "year": d.getFullYear(), "time": d.getHours() + "." + d.getMinutes(), "P": req.query.Power})
    var d = new Date();
    var cursor = db.collection('test2').find({
    	time: {$gt: '1.20'},			//select TIME where value of "time" is greater than "1.2"
    	date: {$eq: d.getDate()},		//select DATE where value of "date" equal to returned value from getDate method.
    	month: {$eq: d.getMonth()+1},
    	year: {$eq: d.getFullYear()}
    })

    //filtered data with needed field using projection
    cursor.project(projection)
    //for each document in the cursor, apply the function(doc)
    //use this to get the value to draw the chart
    cursor.forEach(
        function(doc) {
            chartTime[chartCount] = doc.time;	//read docs from field "time"
            chartPower[chartCount] = doc.P;		//read docs	from field "P"
            chartCount++;						//init chartCount=0
            console.log(doc.year);
        },
        function(err) {
            assert.equal(err, null);
            return db.close();
        }
    );  *
});

/*
app.get('/', function (req, res) {
    res.render('index', { title: 'Hey', message: 'Hello there!',info: a})
});
*/

