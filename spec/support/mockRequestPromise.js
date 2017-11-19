const _ = require('lodash');

module.exports = (uriResultMappings) => {
  let requestPromiseMock = jasmine.createSpy('resquestPromise mock');
  requestPromiseMock.and.callFake((options) => {
    _.each(_.keys(uriResultMappings), (key) => {
      if(options.uri.match(key) != null) {
        result = uriResultMappings[key];
      }
    });
    return Promise.resolve(result);
  });
  return requestPromiseMock;
}
