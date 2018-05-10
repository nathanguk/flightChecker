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
            var ryanairdata = data; 
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

                context.bindings.outputTable = [];
                
                for (var i = 0, len = numFares; i < len; i++) {
                    //Get Airport Geolocation Varibales
                    var outDepartureLongitide = "";
                    var outDepartureLatitude = "";
                    var inDepartureLongitide = ""; 
                    var inDepartureLatitude = "";
                    var outboundIataCode = data.fares[i].outbound.departureAirport.iataCode;
                    context.log("Outbound IATA Code: " + outboundIataCode);
                    var inboundIataCode = data.fares[i].inbound.departureAirport.iataCode;
                    context.log("Outbound IATA Code: " + inboundIataCode);

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
                                    //writeTable(ryanairdata, function (error, data){
                                    //    if(!error){
                                    //        context.log(data);                                              
                                    //    };
                                    //});
                                    context.log("P: " + partitionKey);
                                    context.log("R: " + rowKey)
                                    
                                    context.bindings.outputTable.push({
                                        PartitionKey: partitionKey,
                                        RowKey: rowKey,
                                        queryDate: date.toISOString()
                                    });
                                };
                            });
                        };
                    });
                };
                context.log("Done");
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

    //write output to table
    function writeTable(data, callback) {
        //Write data to storage table
        context.log("2");
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
            outDepartureLongitide: outDepartureLongitide,
            outDepartureLatitude: outDepartureLatitude,
            outArrivalDate: data.fares[i].outbound.arrivalDate,
            outArrivalAirport: data.fares[i].outbound.arrivalAirport.name,
            outArrivalIATA: data.fares[i].outbound.arrivalAirport.iataCode,
            outCost: data.fares[i].outbound.price.value,
            inDepartureDate: data.fares[i].inbound.departureDate,
            inDepartureAirport: data.fares[i].inbound.departureAirport.name,
            inDepartureIATA: data.fares[i].inbound.departureAirport.iataCode,
            inDepartureLongitide: inDepartureLongitide,
            inDepartureLatitude: inDepartureLatitude,
            inArrivalDate: data.fares[i].inbound.arrivalDate,
            inArrivalAirport: data.fares[i].inbound.arrivalAirport.name,
            inArrivalIATA: data.fares[i].inbound.arrivalAirport.iataCode,                        
            inCost: data.fares[i].inbound.price.value
        });
        callback(null, "Data saved to table");
    };
};
