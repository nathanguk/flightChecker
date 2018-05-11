module.exports = function (context, flightCheckerTimer) {

    var azure = require('azure-storage');
    var request = require('request');

    // Get timestamp and print time
    var timeStamp = new Date().toISOString();
    context.log('JavaScript timer trigger function ran!:', timeStamp);

    // Create Queue service connection
    var queueService = azure.createQueueService();

    // Check if queues exist and create it if not
    queueService.createQueueIfNotExists('flightchecker', function(error) {
        if(!error) {
          // Queue created or exists
          context.log("Created queue 'flightchecker' or already exists");
        }
    });

    // Create Table service connection
    var tableSvc = azure.createTableService();
    
    // Check if tables exist and create it if not
    tableSvc.createTableIfNotExists('flightCheckerChecks', function(error) {
        if(!error) { 
          // Table created or exists
          context.log("Created table 'flightCheckerChecks' or already exists");
        }
    });


    // Check for queys to run.
    checkQuery(function (error, result){
        if(!error){
            var checks = result.entries;   
            checks.forEach(function(check) { 
                context.log("RowKey: " + check.RowKey._);
                var message = {
                    "departureAirport": check.departureAirport._ ,
                    "arrivalAirport": check.arrivalAirport._ ,
                    "departureDate": check.departureDate._ ,
                    "arrivalDate": check.arrivalDate._
                };         
                createMessage(JSON.stringify(message), function (error, result){
                    if(!error){
                        context.log("Created Message: " + result);
                    }else{
                        context.log("Error: " + error);
                    };
                });
            });
            context.done();
        }else{
            context.log("Error: " + error);
            context.done();
        };
    });


    //Create a new message and put in queue
    function createMessage(message, callback) {
        var queue = "flightchecker";
        queueService.createMessage(queue, message, function(error) {
            if(!error) {
                //context.log("Queue message result: " + result);
                callback(null, "result");
            }else{
                // Call the callback and pass in the error
                //context.log("Queue message error: " + error);
                callback(error, null);
            }
        });
    };


    //Query Days and Destinations to Check
    function checkQuery(callback) {
        var table = "flightCheckerChecks";
        var partitionKey = "CHECKS";
        var query = new azure.TableQuery().where('PartitionKey eq ?', partitionKey);

        tableSvc.queryEntities(table,query, null, function(error, result, response){
            if(!error){
                //context.log("Query checks table result: " + result);
                callback(null, result);
            }else{
                // Call the callback and pass in the error
                //context.log("Query checks table error: " + error);
                callback(error, null);
            }
        });
    };

};