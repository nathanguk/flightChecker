module.exports = function (context, myTimer) {
    
    context.log("Start of function");

    var azure = require("azure-storage");
    var request = require("request");
    
    var keyVar = "apikey";
    context.log(keyVar);


    if (!process.env[keyVar]) {
        throw new Error("please set/export the following environment variable: " + keyVar );
    };

    //Parameters
    var apikey = process.env["apikey"];
    context.log(apikey);

    var apihost = "apigateway.ryanair.com";
    context.log(apihost);

    var departureAirport = "MAN";
    var arrivalAirport = "IBZ";

    var departureDate = "2018-06-08";
    var arrivalDate = "2018-06-10";

    context.log("test1");

    flightQuery();
    
    //flight query
    function flightQuery(){
        context.log("test2");
            ryanairQuery(departureAirport, arrivalAirport, departureDate, arrivalDate)
          
            .then(function(data){    
                // write to azure table
                context.log("data: " + JSON.stringify(data));
                //context.bindings.imageTableInfo = [];
                //context.bindings.imageTableInfo.push({
                //    PartitionKey: 'face',
                //    RowKey: context.bindingData.name,
                //    data: {
                //        "api" : "face",
                //        "imageUri" : imageUri,
                //        "thumbUri" : thumbUri,
                //        "faceAttributes" : data[0].faceAttributes
                //    }
                //})
            })

            .catch(function(err) {
                context.log(`Error: ${err}`);
                context.done(null, err);
            })

    };  
    
    //query ryanair
    function ryanairQuery(departureAirport, arrivalAirport, departureDate, arrivalDate) {
        var resourcePath = '/pub/v1/farefinder/3/roundTripFares'

        var queryParams = '?departureAirportIataCode=' + departureAirport + '&arrivalAirportIataCode=' + arrivalAirport + '&outboundDepartureDateFrom=' + departureDate
        queryParams = queryParams + '&outboundDepartureDateTo=' + departureDate + '&currency=GBP&language=en&market=en-gb&inboundDepartureDateFrom=' + arrivalDate + '&inboundDepartureDateTo=' 
        queryParams = queryParams + arrivalDate + '&apikey=' + apikey

        var options = { method: 'GET',
        url: 'http://'+ apihost + resourcePath + queryParams,
        headers: 
        { 
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/json' },
        encoding: null,
        json: true
        };

        request(options, function (error, response, body) {

            if (error){

              // Call the callback and pass in the error
              callback(error, null);
            }
            else {

              context.log("Status Code: " + response.statusCode);
              context.log(data);

              // Call the callback and pass in the body
              callback(null, body);
            }; 
        });
    };
};
