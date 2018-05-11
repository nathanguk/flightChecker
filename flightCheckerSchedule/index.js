module.exports = function (context, flightCheckerTimer) {

    var azure = require('azure-storage');
    var request = require('request');

    // Create Table service connection./.
    var tableSvc = azure.createTableService();

    tableSvc.createTableIfNotExists('flightCheckerChecks', function(error) {
        if(!error) { 
          // Table created or exists
          context.log("Create table 'flightCheckerChecks' or already exists");
        }
    });


    checkQuery(function (error, result){
        if(!error){
            context.log("Result")
            context.log(JSON.stringify(result));

            var checks = result.entries;   
            checks.forEach(function(check) { 
                context.log(check.RowKey._);
            });

            context.done();
        }else{
            context.log("Error: " + error);
            context.done();
        };
    });

    //var timeStamp = new Date().toISOString();
    
    //if(flightCheckerTimer.isPastDue)
    //{
    //    context.log('JavaScript is running late!');
    //}
    //context.log('JavaScript timer trigger function ran!:', timeStamp);   
    
    //context.done();



    //Query Days and Destinations to Check
    function checkQuery(callback) {
        var table = "flightCheckerChecks";
        var partitionKey = "CHECKS";
        var query = new azure.TableQuery().where('PartitionKey eq ?', partitionKey);

        tableSvc.queryEntities(table,query, null, function(error, result, response){
            if(!error){
                //context.log("Query checks table result: " + result);
                callback(null, result);
            }
            else{
                // Call the callback and pass in the error
                //context.log("Query checks table error: " + error);
                callback(error, null);
            }
        });
    };

};