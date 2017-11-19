const proxyquire = require('proxyquire');
const mockConfig = require('./support/mockConfig');
const mockRequestPromise = require('./support/mockRequestPromise');
const _ = require('lodash');

describe('graphiteReader', () => {

  let graphiteReader;
  let requestMock;
  let loggerMock;

  const mockConfigData = {
    queries: [{
      id: 'errors',
      description: 'ERRORS',
      query: 'any-error-query',
      from: 'any-error-from'
    }, {
      id: 'warnings',
      description: 'WARNINGS',
      query: 'any-warning-query',
      from: 'any-warning-from'
    }],
    environments: [{
      id: 'PROD',
      url: 'http://myprodgraphite.org/render',
      queries: ['errors', 'warnings']
    }, {
      id: 'DEV',
      url: 'http://mydevgraphite.org/render',
      queries: ['errors']
    }]
  };

  function graphiteResult(values) {
    return [{
      datapoints: _.map(values, (value) => {
        return [value, 'any-timestamp'];
      })
    }]
  }

  beforeEach(() => {
    requestMock = mockRequestPromise({
      '.*myprodgraphite.*error-query.*': graphiteResult([0, 1]),
      '.*myprodgraphite.*warning-query.*': graphiteResult([2, 3]),
      '.*mydevgraphite.*error-query.*': graphiteResult([4, 5]),
      '.*mydevgraphite.*warning-query.*': graphiteResult([6, 7]),
    });

    const configMock = mockConfig(mockConfigData);
    const loggerMock = jasmine.createSpyObj('logger', ['error']);

    graphiteReader = proxyquire('../server/graphiteReader', {
      'request-promise-native': requestMock,
      './ymlHerokuConfig': configMock,
      './logger': loggerMock
    });
  });

  it('should make requests based on configuration data', () => {
    function expectEndpointToHaveBeenCalled(uri, called) {
      let expectation = expect(requestMock)
      if(!called) {
        expectation = expectation.not;
      }
      expectation.toHaveBeenCalledWith({
        uri: uri,
        json: true
      });
    }

    graphiteReader.getGraphiteData();

    expectEndpointToHaveBeenCalled('http://myprodgraphite.org/render?target=any-error-query&format=json&from=any-error-from', true);
    expectEndpointToHaveBeenCalled('http://myprodgraphite.org/render?target=any-warning-query&format=json&from=any-warning-from', true);
    expectEndpointToHaveBeenCalled('http://mydevgraphite.org/render?target=any-error-query&format=json&from=any-error-from', true);
    expectEndpointToHaveBeenCalled('http://mydevgraphite.org/render?target=any-warning-query&format=json&from=any-warning-from', false);
  });

  it('should merge the result into an object keyed by environment and query', (done) => {
    const expectedResult = {
      'PROD': {
        errors: { hits: 1, label: 'ERRORS' },
        warnings: { hits: 3, label: 'WARNINGS' }
      },
      'DEV': {
        errors: { hits: 5, label: 'ERRORS' }
      }
    }

    graphiteReader.getGraphiteData().then((result) => {
      expect(result).toEqual(expectedResult);
      done();
    });
  });

  it('should continue gracefully if no results', (done) => {
    requestMock.and.returnValue(Promise.reject());
    graphiteReader.getGraphiteData().then((result) => {
      expect(result).toEqual({});
      done();
    });
  });
});
