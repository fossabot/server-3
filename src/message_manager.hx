package;

class message_manager {
    public static function no_box(resp, id){
        resp.send("No box with ID " + id)
    }

    public static function no_zip(resp){
        resp.send("This will send a zip file with both raspberry pi and arduino data in the near future")
    }

    public static function please_send_type(resp){
        resp.send("Please set board type by adding &type= to your URL. \n eg: http://seat-skomobo.massey.ac.nz/get?pass=8888888888&type=arduino")
    }

    public static function please_send_id(resp){
        resp.send("Please specify a box ID by adding <b>&id=yourID</b> to the end of your URL <br>
        EG: <b>http://seat-skomobo.massey.ac.nz/get?type=arduino&pass=8888888888&id=0</b><br>
        Please note using this example link only has dummy data");
    }
}