'use strict';

const _ = require('lodash');
const Q = require('q');
const request = require('request');
const logger = require('./logger');
const configReader = require('./ymlHerokuConfig');
const giphyReader = require('./giphyReader');

const config = configReader.create('teamcity').get();
const ccTrayReader = require('gocd-api').getCcTrayInstance(config);

function getPropertiesForProject(projectId, suffix) {

  const defer = Q.defer();

  const url = `${config.host}${suffix}?locator=affectedProject:(id:${projectId})`;
  const requestOptions = {
    url: url,
    method: 'GET',
    json: true
  };

  logger.debug("calling", url);
  request(requestOptions, (error, response, body) => {
    if(error) {
      logger.error('ERROR', 'failed to get ' + requestOptions.url, error);
      defer.reject();
    } else {
      defer.resolve(body);
    }
  });

  return defer.promise;
}

function returnFailedBuild(buildEntry, error) {
  logger.error(`Build Request Error ${error}`);
  return {
    status: 'SUCCESS',
    name: `${buildEntry.name} (Teamcity Request Error)`
  };
}

function getBuild(id) {
  const defer = Q.defer();
  const url = `${config.host}buildTypes/id:${id}/builds/lookupLimit:1`;

  logger.debug("calling", url);
  request({
    url: url,
    method: 'GET',
    json: true
  }, (error, response, body) => {
    if(error) {
      logger.error(`ERROR failed to get ${url} ${error}`);
      defer.reject();
    } else {
      defer.resolve(body);
    }
  });

  return defer.promise;
}

function getBuilds(teamcityResult) {

  const types = teamcityResult;

  if(teamcityResult.buildType === undefined) {
    return Q.all([]);
  }

  const buildTypeEntries = [].concat(teamcityResult.buildType);
  const builds = _.compact(_.map(buildTypeEntries, entry => {
    if(entry.paused) return;
    return getBuild(entry.id).catch(_.curry(returnFailedBuild)(entry));
  }));
  return Q.all(builds)
    .catch(err => {
      logger.error(`Error ${err}`);
      throw err;
    });
}

function extractBuildInfo(build, projectName) {
  const user = build.lastChanges && build.lastChanges.change && build.lastChanges.change[0];
  const buildType = build.buildType || build;
  return {
    name: projectName + '</br> :: ' + buildType.name,
    info2: user && `Changes by ${user.username}`,
    relevantForDisplay: true
  };
}

function filterFailedJobs(builds, projectName) {
  return builds
    .filter(build => build.status === 'FAILURE') // TODO: build.build or just build?!
    .map(build => extractBuildInfo(build, projectName));
}

function jobsByStatus(projectInfo) {

  return getPropertiesForProject(projectInfo.id, 'buildTypes')
    .then(getBuilds)
    .then(allBuilds => {
      return [
        filterFailedJobs(allBuilds, projectInfo.name),
        allBuilds.map(build => extractBuildInfo(build, projectInfo.name))
      ];
    }).then(filteredJobs => {
      return { failed: filteredJobs[0], all: filteredJobs[1], projectId: projectInfo.id, name: projectInfo.name };
    });
}

function mapRelevantCctrayData(stages) {

  return _.filter(stages, function(entry) {
    var relevantForDisplay =
      entry.isBuilding && entry.isBuilding()
        || entry.activity === 'Building'
        || entry.isScheduled && entry.isScheduled();
    return relevantForDisplay;
  });

}

function getActivity() {
  const currentGiphys = giphyReader.getCache();
  const projects = config.projects;

  return Q.all(_.map(projects, jobsByStatus)).then(jobsInProjects => {

    return ccTrayReader.readActivity(_.map(jobsInProjects, 'name'), () => true)
    .then(activityFromCcTray => {
      var mapped = mapRelevantCctrayData(activityFromCcTray.activity.stages);

      const entries = jobsInProjects.map(jobs => {
        // TODO: Figure out TC data - what's the pipeline, what's the stage name?
        return {
          activity: mapped,
          history: {
            boxes: jobs.failed.map(job => {
              return { title: job.name, summary: { text: `${job.info2 || ''}`, result: 'failed' } };
            }),
            pipelineName: jobs.projectId,
            statistics: { timeSinceLastSuccess: {} }
          },
          pipeline: jobs.projectId,
          success: currentGiphys.success,
          fail: currentGiphys.fail,
          working: currentGiphys.working
        };
      });

      return {
        historyAndActivity: entries
      };

    });

  });

}

module.exports = {
  getActivity: getActivity
};
