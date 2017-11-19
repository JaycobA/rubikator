const request = require('request-promise-native');
const configReader = require('./ymlHerokuConfig');
const _ = require('lodash');
const Q = require('q');
const logger = require('./logger');

const graphiteDataSource = (function () {

  const graphiteConfig = configReader.create('graphite').get();

  function getGraphiteData() {
    const queryPromises = [];

    _.each(graphiteConfig.environments, (environment) => {
      _.each(environment.queries, (queryId) => {
        query = _.find(graphiteConfig.queries, { id: queryId });
        queryPromises.push(getGraphiteResult(environment, query));
      });
    });

    return Q.all(queryPromises).then((queryResults) => {
      const result = {};
      _.each(_.filter(queryResults), (queryResult) => {
        _.set(result, `${queryResult.environment}.${queryResult.query}.hits`, queryResult.hits);
        _.set(result, `${queryResult.environment}.${queryResult.query}.label`, queryResult.label);
      });
      return result;
    });
  }

  function getGraphiteResult(environment, query) {
    const url = `${environment.url}?target=${query.query}&format=json&from=${query.from}`;
    return request({ uri: url, json: true })
      .then((result) => {
        return {
          environment: environment.id,
          query: query.id,
          label: query.description,
          hits: _.last(result[0].datapoints)[0]
        };
      })
      .catch((error) => {
        logger.error(`Unable to get data from graphite at ${url}:`, error);
        return null;
      });
  }

  return {
    getGraphiteData: getGraphiteData
  };
})();

exports.getGraphiteData = graphiteDataSource.getGraphiteData;
