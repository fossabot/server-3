// import {clean_data} from "../src/database_manager"

const clean_data = require('../src/database_manager').clean_data
// import * as express from "express"
const express = require('express')


const parser = require("body-parser")

const app = express()

app.use(parser)

// bugsnag integration only enable if we are in production
// import * as bugsnag from "bugsnag"
const bugsnag = require('bugsnag')
if (app.settings.env !== "development"){
    bugsnag.register(require("./global_keys.json").bugsnag_key)
    app.use(bugsnag.requestHandler);
    app.use(bugsnag.errorHandler);
}


//var csv is the CSV file with headers
function csvJSON(csv){
    var lines=csv.split("\n");

    var result = [];

    var headers=lines[0].split(",");
    headers = headers.map((header)=>{
        header = header.replace(/'/g, "")
        header = header.replace(/\r/g, "")
        return header.replace(/"/g, "")
    })
    for(var i=1;i<lines.length;i++){

        let obj = {};
        let currentline=lines[i].split(",");

        for(var j=0;j<headers.length;j++){
            obj[headers[j]] = currentline[j];
        }
         // Convert to floats and ints
        obj.Temperature = Number(obj.Temperature)
        obj.Humidity = Number(obj.Humidity)
        obj.CO2 = Number(obj.CO2.slice(0, -1))
        obj.Dust1 = Number(obj.Dust1)
        obj.Dust2_5 = Number(obj.Dust2_5)
        obj.Dust10 = Number(obj.Dust10)
        result.push(obj);

    }
    
    return result; //JavaScript object
    // return JSON.stringify(result); //JSON
}

// import * as multer from "multer"
const multer = require('multer')
const helmet = require("helmet")
const compress = require("compression")
// export var app = express()

// Enable GZIP compression for improved performance
app.use(compress())

// Fix headers to make things more secure
app.use(helmet())


var prev_PM10 = 0.0;
var prev_PM2_5= 0.0;
var result;
var socket = require("net").Socket
// var socket = new Socket();

function prep_data(pm10, pm2_5){
    pm10 = pm10 / 1000;
    pm2_5 = pm2_5 / 1000;
            
    var result = {"PM10": pm10, "PM2_5": pm2_5, "PM10_diff": pm10 - prev_PM10, "PM2_5_diff": pm2_5 - prev_PM2_5};
    prev_PM10 = pm10;
    prev_PM2_5 = pm2_5;
    return result;
}

const net = require('net');

// const client = new net.Socket();
// import * as http from "http"
// import * as request from "request"
const http = require('http')
const request = require('request')

const upload = multer()
const json2csv = require('json2csv');

function data_valid(data){
    let i = 0

    while(data[i] === null){
        i++
    }
    if(i == data.length ){
        return false
    }else{
        return true
    }
}

app.post("/clean", (req, resp)=>{
    
    // adust the original file name to include _clean at the end
    // const file_name = req.file.originalname.substr(0, req.file.originalname.length - 4) + "_clean.csv"
    // let file_text = req.file.buffer.toString("utf8")

    // let data = csvJSON(file_text)
    
    //! file donwload works just make python integration now
    //! male tjat seperate function that gets called directly from the other server
    
    // Change this to send individual items instead so move below logic into this map and have it
    // be the final result that gets turned into csv and sent back

    // will need to change source as well to stream result???
    // so javascript on client streams invidual entries and progresses progress bar 


    let input = JSON.parse(req.body)

    let prepped = prep_data(input.Dust10, input.Dust2_5)

    // let prepped = data.map((item)=>{
        // return prep_data(item.Dust10,item.Dust2_5)
    // })

    // let prepped_wrapped = {"data": prepped}
 
    request.post({url:'http://localhost:9999/', body: JSON.stringify(prepped), json:true}, (error, response, body)=>{
    

        // move this logic to client client spawns file or move to seperate route

        // needs to append to existing data so that Co2 etc will be in downloaded file
        if(error === null){
            if(data_valid(body)){
               
                // resp.set({'Content-Disposition': 'attachment; filename="' + file_name + '"'})
                // resp.send(json2csv(body));
                input["Dust10"] = body["PM10"]
                input["Dust2_5"] = body["PM2_5"]
                resp.send(JSON.stringify(input))
            }
            else{
                resp.send("File contains no salvagable values, please contact the developer Ryan, Mikael or Yu Wang")
            }
        }else{
            resp.send("Server error, please contact the developer and try again later :)")
            bugsnag.notify(Error(JSON.stringify(error)))
        }
    })

})

// app.post("/clean", upload.single("file"), (req, resp)=>{
    
//     // adust the original file name to include _clean at the end
//     const file_name = req.file.originalname.substr(0, req.file.originalname.length - 4) + "_clean.csv"
//     let file_text = req.file.buffer.toString("utf8")

//     let data = csvJSON(file_text)
    
//     //! file donwload works just make python integration now
//     //! male tjat seperate function that gets called directly from the other server
    
//     // Change this to send individual items instead so move below logic into this map and have it
//     // be the final result that gets turned into csv and sent back

//     // will need to change source as well to stream result???
//     // so javascript on client streams invidual entries and progresses progress bar 
//     // make tool a bit prettier with css
//     let prepped = data.map((item)=>{
//         return prep_data(item.Dust10,item.Dust2_5)
//     })

//     let prepped_wrapped = {"data": prepped}
 
//     request.post({url:'http://localhost:9999/', body: JSON.stringify(prepped_wrapped), json:true}, (error, response, body)=>{
  
//         if(error === null){
//             if(data_valid(body)){
               
//                 resp.set({'Content-Disposition': 'attachment; filename="' + file_name + '"'})
//                 resp.send(json2csv(body));
//             }
//             else{
//                 resp.send("File contains no salvagable values, please contact the developer Ryan, Mikael or Yu Wang")
//             }
//         }else{
//             resp.send("Server error, please contact the developer and try again later :)")
//             bugsnag.notify(Error(JSON.stringify(error)))
//         }
//     })

// })



app.listen(82, ()=>{
    console.log("Dust cleaner started")
})

