
var GraphiteVisualiser = function(rubikVisualiser) {

  var MAX_COLUMNS = 1;

  var graphiteMetricsDiv = rubikVisualiser.createNewColumn();
  graphiteMetricsDiv.addClass('small');
  graphiteMetricsDiv.hide();

  function processNewDataGraphite(data) {
    if(data.warning) {
      return;
    }

    graphiteMetricsDiv.show();
    graphiteMetricsDiv.empty();
    $('<div class="category horizontal"><div>GRAPHITE METRICS</div></div>').appendTo(graphiteMetricsDiv);

    _.each(_.keys(data), function(envIdentifier) {

      function createGraphiteInfoBox(outerBox, environmentData, environmentDataKey) {
        const queryResult = environmentData[environmentDataKey];
        $('<div><span class="metric-description">' + queryResult.label + '</span></br>' +
          '<span class="metric">' + queryResult.hits + '</span></div>').appendTo(outerBox);
        outerBox.addClass('blue');
      }

      rubikVisualiser.createRowsOfBoxesForEnvironment(graphiteMetricsDiv, data, envIdentifier, createGraphiteInfoBox, MAX_COLUMNS);

    });

  }

  return {
    processNewData: processNewDataGraphite
  };
};
