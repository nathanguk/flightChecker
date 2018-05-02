module.exports = function (context, myTimer) {
    
    var azure = require('azure-storage');
    var request = require('request');
    
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

	// call flightQuery function
    flightQuery();
    
    //flight query
    function flightQuery(){
            ryanairQuery(departureAirport, arrivalAirport, departureDate, arrivalDate, function (error, data){
				if(error){
					context.log("Error: " + error);
				} else {
					context.log("Data: " + JSON.stringify(data));
				};
				//.then(function(data){    
                // write to azure table
                
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
            //})
            //.catch(function(err) {
            //    context.log(`Error: ${err}`);
            //    context.done(null, err);
            //})
			});
    };  
    
    //query ryanair
    function ryanairQuery(departureAirport, arrivalAirport, departureDate, arrivalDate, callback) {
        var resourcePath = '/pub/v1/farefinder/3/roundTripFares';
        var queryParams = '?departureAirportIataCode=' + departureAirport + '&arrivalAirportIataCode=' + arrivalAirport + '&outboundDepartureDateFrom=' + departureDate
        queryParams = queryParams + '&outboundDepartureDateTo=' + departureDate + '&currency=GBP&language=en&market=en-gb&inboundDepartureDateFrom=' + arrivalDate + '&inboundDepartureDateTo='
        queryParams = queryParams + arrivalDate + '&apikey=' + apikey
		

        var options = { 
			method: 'GET',
			url: 'http://'+ apihost + resourcePath + queryParams,
			body: {},
			headers: 
			{ 
				'Content-Type': 'application/json' 
			},
			encoding: null,
			json: true
        };

        request(options, function (error, response, body) {
            if (error){
              // Call the callback and pass in the error
			  context.log(error);
              callback(error, null);
            }
            else {
              context.log("Status Code: " + response.statusCode);
              //context.log(body);
              // Call the callback and pass in the body
              callback(null, body);
            }; 
        });
    };
};
