module.exports = (mockConfigData) => {
  const getConfigMock = jasmine.createSpy('get config');

  getConfigMock.and.returnValue(mockConfigData);

  const configMock = {
    create: () => {
      return {
        get: getConfigMock
      };
    }
  };

  return configMock;
};
