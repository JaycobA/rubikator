
var Q = require('q');
var configReader = require('./ymlHerokuConfig');

var graphiteDataSource = (function () {

  var graphiteConfig = configReader.create('graphite').get();

  function readDataForClients() {
    return Q.resolve({
      test: [
        graphiteConfig["tuv"].value + ' box 1', // box 1
        graphiteConfig["tuv"].value + ' box 2'// box 1
      ],
      qa: [
        graphiteConfig["pro"].value
      ]
    });
  }

  return {
    readDataForClients: readDataForClients
  };

  // Add source to rubikator like this:
  //webSocketDataSource('graphite', require('./server/graphiteReader').readDataForClients, server, CHECK_FOR_CONFIG_FIRST);

})();

exports.readDataForClients = graphiteDataSource.readDataForClients;
