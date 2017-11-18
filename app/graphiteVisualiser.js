
var GraphiteVisualiser = function(rubikVisualiser) {

  var MAX_COLUMNS = 1;

  var sampleInfoDiv = rubikVisualiser.createNewColumn();
  sampleInfoDiv.addClass('small'); // add small or medium to indicate how wide the column for this is
  sampleInfoDiv.hide();

  // This will be called every time the 'sample' websocket receives data
  function processNewDataGraphite(data) {
    if(data.warning) {
      return;
    }

    sampleInfoDiv.show();
    sampleInfoDiv.empty();
    $('<div class="category horizontal"><div>SAMPLE INFO</div></div>').appendTo(sampleInfoDiv);

    // Example: What to do if your server data is organised by environment keys
    // { test: { ... }, qa: { ... }
    _.each(_.keys(data), function(envIdentifier) {

      function createGraphiteInfoBox(outerBox, environmentData, environmentDataKey) {
        var environmentValue = environmentData[environmentDataKey];
        $('<div>' + environmentValue + '</div>').appendTo(outerBox);
        outerBox.addClass('blue');
      }

      rubikVisualiser.createRowsOfBoxesForEnvironment(sampleInfoDiv, data, envIdentifier, createGraphiteInfoBox, MAX_COLUMNS);

    });

  }

  return {
    processNewData: processNewDataGraphite
  };
};
