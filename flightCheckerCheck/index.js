module.exports = function (context, flightCheckerQueueItem) {

    var azure = require('azure-storage');
    var request = require('request');

    // Create Table service connection./.
    var tableSvc = azure.createTableService();

    tableSvc.createTableIfNotExists('flightCheckerResults', function(error) {
        if(!error) { 
          // Table created or exists
          context.log("Create table 'flightCheckerResults' or already exists");
        }
    });

    //Ryanair API Connection parameters
    var keyVar = "apikey";
    if (!process.env[keyVar]) {
        throw new Error("please set/export the following environment variable: " + keyVar );
    };
    var apikey = process.env["apikey"];
    var apihost = "apigateway.ryanair.com";

    // Set variables
    var departureAirport = flightCheckerQueueItem.departureAirport;
    var arrivalAirport = flightCheckerQueueItem.arrivalAirport;
    var departureDate = flightCheckerQueueItem.departureDate;
    var arrivalDate = flightCheckerQueueItem.arrivalDate;
    var debug = flightCheckerQueueItem.debug;

	// call flightQuery function
    if(debug){
        context.log("Debug Mode");
        context.done();
    } else {
        context.log("Live Mode");
        flightQuery();
    };
    
    //Flight query
    function flightQuery(){
        ryanairQuery(departureAirport, arrivalAirport, departureDate, arrivalDate, function (error, data){
            var ryanairdata = data; 
            var partitionKey = departureAirport + "_" + arrivalAirport;
            var date = new Date;
            var rowKey = departureDate + "_" + arrivalDate + "_" +date.toISOString();

            if(error){
                context.log("Error: " + error);
                context.done();
            } else {
                var fares = data.fares;
                
                fares.forEach(function(fare) { 
                    //Get Airport Geolocation Varibales
                    var outDepartureLongitide = "";
                    var outDepartureLatitude = "";
                    var inDepartureLongitide = ""; 
                    var inDepartureLatitude = "";
                    var outboundIataCode = fare.outbound.departureAirport.iataCode;
                    var inboundIataCode = fare.inbound.departureAirport.iataCode;

                    //Get Outbound Airport Geolocation
                    airportQuery(outboundIataCode, function (error, airportdata){
                        if(!error){
                            outDepartureLongitide = airportdata.Longitude._;
                            outDepartureLatitude = airportdata.Latitude._;

                            //Get Inbound Airport Geolocation
                            airportQuery(inboundIataCode, function (error, airportdata){
                                if(!error){
                                    inDepartureLongitide = airportdata.Longitude._;
                                    inDepartureLatitude = airportdata.Latitude._;

                                    //Write data to storage table
                                    context.log("Writing Data to Table");
                                    context.bindings.flightCheckerResults = [];
                                    context.bindings.flightCheckerResults.push({
                                        PartitionKey: partitionKey.toString(),
                                        rowKey: rowKey.toString(),
                                        currency: fare.summary.price.currencySymbol,
                                        costTotal: fare.summary.price.value,
                                        outDepartureDate: fare.outbound.departureDate,
                                        outDepartureAirport: fare.outbound.departureAirport.name,
                                        outDepartureIATA: fare.outbound.departureAirport.iataCode,
                                        outDepartureLongitide: outDepartureLongitide,
                                        outDepartureLatitude: outDepartureLatitude,
                                        outArrivalDate: fare.outbound.arrivalDate,
                                        outArrivalAirport: fare.outbound.arrivalAirport.name,
                                        outArrivalIATA: fare.outbound.arrivalAirport.iataCode,
                                        outCost: fare.outbound.price.value,
                                        inDepartureDate: fare.inbound.departureDate,
                                        inDepartureAirport: fare.inbound.departureAirport.name,
                                        inDepartureIATA: fare.inbound.departureAirport.iataCode,
                                        inDepartureLongitide: inDepartureLongitide,
                                        inDepartureLatitude: inDepartureLatitude,
                                        inArrivalDate: fare.inbound.arrivalDate,
                                        inArrivalAirport: fare.inbound.arrivalAirport.name,
                                        inArrivalIATA: fare.inbound.arrivalAirport.iataCode,                        
                                        inCost: fare.inbound.price.value
                                    });
                                    //Function completed
                                    context.log("Done");
                                    context.done();
                                };
                            });
                        };
                    });
                });
            };
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
            if (response.statusCode == 200){
                context.log("Ryanair API Success");
                context.log("Status Code: " + response.statusCode);
                //context.log(JSON.stringify(body));
                callback(null, body);
            }
            else {
                // Call the callback and pass in the error
                context.log("Ryanair API Error: " + error);
                context.log("Status Code: " + response.statusCode);
                callback(error, null);
            }; 
        });
    };

    //query Airport Geolocation
    function airportQuery(iataCode, callback) {
        var table = "flightCheckerAirports";
        var partitionKey = "AIRPORT";
        tableSvc.retrieveEntity(table, partitionKey, iataCode, function(error, result, response){
            if(!error){
                context.log("Airport Query Sucess: " + iataCode);
                callback(null, result);
            }
            else{
                // Call the callback and pass in the error
                context.log("Airport Query Error: " + iataCode + " : " +error);
                callback(error, null);
            }
        });
    };
};
