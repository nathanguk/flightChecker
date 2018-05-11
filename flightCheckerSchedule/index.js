module.exports = function (context, flightCheckerTimer) {
    var timeStamp = new Date().toISOString();
    
    if(flightCheckerTimer.isPastDue)
    {
        context.log('JavaScript is running late!');
    }
    context.log('JavaScript timer trigger function ran!:', timeStamp);   
    
    context.done();
};