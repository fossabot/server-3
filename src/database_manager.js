const {send_json, send_csv} = require('./file_manager')
const {no_box, please_send_id} = require('./messages')

/**
 * Converts the presence nodejs buffer to a single bit 1 or 0 to represent booleans 
 */
function fix_format(data){

    if(data[0].Presence !== undefined){
        // for each text row
        for(let row=0; row<data.length; row++){
            data[row].Presence = String(data[row].Presence[0])
            data[row].Time_received = fix_timestamp(data[row].Time_received)
            data[row].Time_sent = fix_timestamp(data[row].Time_sent)
            
            // let clean_dust = clean_data(data[row].pm10, data[row].pm2_5)
            // data[row].pm10 = clean_dust.PM10
            // data[row].pm2_5 = clean_dust.PM2_5
        }
    }
   
   return data
}

// var dust_cleaner = require("../dust_cleaner/dustCleanerClient.js")


// below two timestampfunctions were retrieved from https://stackoverflow.com/a/5133807/6142189


function fix_timestamp(data){
    
    return data.getFullYear() + "-" + (data.getMonth() + 1) + "-" + data.getDate() + " " + data.getHours() + ":" + data.getMinutes() + ":" + data.getSeconds();

}

var connection = null

const {config_db, extract, has} = require('./lib')

function resolve_db(){

    if(connection === null){
        try{
            connection = config_db()
        }
        catch(error){
            console.error(error)
            console.error("DB not running or not accessible")
            connection = null
        }
        return connection
    }
    else{
        return connection
    }
    
}

// to stream use AND ROWNUM <= 3 AND ROWNUM > ....
// so that we only get x number of rows will have to calculate chunks

function get_box(id, resp, format){

    // check to make sure that they give a ID value, that it is a valid number and not the value all or a _ seperated list
    resolve_db()

    // check if it is a valid number if it is we carry on without issues
    if(isNaN(id) && id !== "all" ){
        id = String(id)
    }
    else if(id == null){
        resp.send(please_send_id)
        return
    }

    let query = 'SELECT * from box' + id

    // todo fix later
    // if(id !== "all"){ 
    //     id = String(id)
    //     if(id.indexOf('_') > -1){
    //         query += ' where Box_ID in (' + id.replace('_', ',') + ')'
    //     }else{
    //         query += ' where Box_ID = ' + id
    //     }
    // }

    connection.query(query, (err, results , fields)=>{ 
        if(results != null){
            if(results.length !== 0){
                if(format === 'json'){
                    send_json(results, resp)
                }else{
                    send_csv('skomobo.csv', fix_format(results), resp)
                }
            }
        }
        else{
            resp.send(no_box(id))
        }
    })
}

async function store(response, database_name, values){

    // restructure db to have seperate table for each box

    // list of boxes in database gets stored in box_info, if a box is not in that list
    // we insert it into said list and then create its table
    // if it does exist we insert the data into its correct table
    // each table should be like box1, box2, box3 etc to denote what ID it maps to

    // the box info table is used to track the meta data about each box

    if(!has(values, null)){

        box_exists(values["Box_ID"], (exists)=>{
            if(exists){
                // insert into new table now
                connection.query('INSERT INTO ' + database_name + ' set ?' , values)
                // tell the client everything is ok
                response.writeHead(200, {"Content-Type": "text/HTML"})
                response.end()
            }
            else{
                connection.query('CREATE TABLE ' + database_name + ' LIKE box_data')

                // insert into box2
    // select * from arduino where box_id = 2
    // something like this to migrate across old data first?
    // need a way to fix the primary key index and sort by time received maybe in migrate proc??
                // connection.query('')

                // copy this query structure to migrate data and index correctly 
                // create table box2 like box_data;
// alter table box2 auto_increment = 1;
// insert into box2(`Time_received`, `Box_ID`, `Time_sent`,  `Dust1`,  `Dust2_5`,  `Dust10`,  `Presence`,  `Temperature`,  `Humidity`,  `CO2`)
	// select `Time_received`, `Box_ID`, `Time_sent`,  `Dust1`,  `Dust2_5`,  `Dust10`,  `Presence`,  `Temperature`,  `Humidity`,  `CO2`
	// from arduino where box_id = "2";

                connection.query('INSERT INTO ' + database_name + ' set ?' , values)
                
                // update box metadata
                let box_meta =  {"ID": values["Box_ID"], "processor": "arduino"}
                connection.query('INSERT INTO box_info set ?' , box_meta)
                response.writeHead(200, {"Content-Type": "text/HTML"})
                response.end()
            }    
        })
    }
    else{
        response.writeHead(400, {"Content-Type": "text/HTML"})
        response.end()
    }
}

const {validate_data} = require('./validator')
function store_arduino(req, resp){
    resolve_db()

    let url = req.url.slice(1)
    
    validate_data(url, (data)=>{
        let values = extract(url)
        store(resp, "box" + values["Box_ID"], values)
    },()=>{
        resp.send("Invalid data")
    })
}

function get_connection(){
    return connection
}

function set_connection(value){
    connection = value
}

// make a get_data
function get_info(id, cols, callback){
    resolve_db()
    if(id != null){

        cols = cols.join(', ')
        connection.query("select " + cols + " from box_info where id = '" + String(id) + "'", (err, results , fields)=>{

            if(err != null){
                console.error(err)
            }
        
            if(results != null){
                if(results.length !== 0){
                    callback(true, results)
                }
                else{
                    callback(false)
                }
            }
            else{
                callback(false)
            }
            
        })
    }
}

function box_exists(id, callback){
    get_info(id, ['id'], (has_result)=>{
        callback(has_result)
    })
}

function box_processor(id, callback){
    get_info(id, ['processor'], (has_result, result)=>{
        has_result ?callback(has_result, result[0]['processor']): callback(has_result)
    })
}

function latest(id, format, resp){
    // check to make sure that they give a ID value, that it is a valid number and not the value all or a _ seperated list
    resolve_db()

    // check if it is a valid number if it is we carry on without issues
    if(isNaN(id) && id !== "all" ){
        id = String(id)
    }
    else if(id == null){
        resp.send(please_send_id)
        return
    }

    let query = 'SELECT * from box' + id + ' order by Time_received DESC limit 1'


    connection.query(query, (err, results , fields)=>{ 

        if(err != null){
            console.error(err)
        }

        if(results != null){
            if(results.length !== 0){
                if(format === 'json'){
                    send_json(results, resp)
                }else{
                    // finish this
                    let values = fix_format(results)[0]
                    console.log(values)
                    let msg = "box " + id + " received at</br>" + values["Time_received"]
                    + "</br></br><b>stats</b>:</br>temperature: " + values['Temperature']
                    +"</br>humidity: " + values["Humidity"] + "</br>CO2: " + values['CO2']
                    +"</br>presence: " + values["Presence"] + "</br></br>Dust: "
                    + "</br>Pm1: " + values["Dust1"] + "</br>Pm2.5: " + values["Dust2_5"]
                    + "</br>Pm10: " + values["Dust10"]

                    resp.send(msg)
                }
            }
        }
        else{
            resp.send(no_box(id))
        }
    })
}

const {export_functs} = require('./lib')

module.exports = export_functs(latest, box_processor,set_connection, get_connection, get_box, store_arduino, resolve_db, fix_format, fix_timestamp, box_exists)