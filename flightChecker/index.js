module.exports = function (context, flightCheckerQueueItem) {
    //context.log(flightCheckerQueueItem);
    var azure = require('azure-storage');
    var request = require('request');

    // Create Table service connection./.
    var tableSvc = azure.createTableService();

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
    context.log("Departure Airport: " + departureAirport);
    context.log("Arrival Airport: " + arrivalAirport);
    context.log("Departure Date: " + departureDate);
    context.log("Arrival Date: " + arrivalDate);
    context.log("Debug Mode: " + debug);

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
            var partitionKey = departureAirport + arrivalAirport;
            var rowKey = departureDate + arrivalDate + Date.now();
            context.log("Partition Key: " + partitionKey);
            context.log("Row Key: " + rowKey);

            var date = new Date;
            context.log(date.toISOString());

            if(error){
                context.log("Error: " + error);
                context.done();
            } else {
                var numFares = Object.keys(data.fares).length;
                context.log("Number of fares: " + numFares);
                
                for (var i = 0, len = numFares; i < len; i++) {
                    context.bindings.outputTable = [];
                    context.bindings.outputTable.push({
                        PartitionKey: partitionKey,
                        RowKey: rowKey,
                        queryDate: date.toISOString(),
                        currency: data.fares[i].summary.price.currencySymbol,
                        costTotal: data.fares[i].summary.price.value,
                        outDepartureDate: data.fares[i].outbound.departureDate,
                        outDepartureAirport: data.fares[i].outbound.departureAirport.name,
                        outDepartureIATA: data.fares[i].outbound.departureAirport.iataCode,
                        outArrivalDate: data.fares[i].outbound.arrivalDate,
                        outArrivalAirport: data.fares[i].outbound.arrivalAirport.name,
                        outArrivalIATA: data.fares[i].outbound.arrivalAirport.iataCode,
                        outCost: data.fares[i].outbound.price.value,
                        inDepartureDate: data.fares[i].inbound.departureDate,
                        inDepartureAirport: data.fares[i].inbound.departureAirport.name,
                        inDepartureIATA: data.fares[i].inbound.departureAirport.iataCode,
                        inArrivalDate: data.fares[i].inbound.arrivalDate,
                        inArrivalAirport: data.fares[i].inbound.arrivalAirport.name,
                        inArrivalIATA: data.fares[i].inbound.arrivalAirport.iataCode,                        
                        inCost: data.fares[i].inbound.price.value
                    });
                };

                context.done();
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

                var iataCode = data.fares[i].outbound.departureAirport.iataCode;
                context.log("IATA Code: " + iataCode);
                //airportQuery();

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
    function airportQuery(callback) {
        var table = "flightCheckerAirports";
        var partitionKey = "AIRPORT";
        var iataCode = "IBZ";
        tableSvc.retrieveEntity(table, partitionKey, iataCode, function(error, result, response){
            if(!error){
                context.log("Airport Query Sucess");
                context.log(JSON.stringify(result));
                callback(null, result);
            }
            else{
                // Call the callback and pass in the error
                context.log("Airport Query Error: " + error);
                callback(error, null);
            }
        });
    };
};
