import commands from '../commands';
import Command, { CommandHelp, CommandValidate, CommandOption } from '../../../Command';
import * as sinon from 'sinon';
import appInsights from '../../../appInsights';
import auth, { Site } from '../SpoAuth';
const storageEntityListCommand: Command = require('./storageentity-list');
import * as assert from 'assert';
import * as request from 'request-promise-native';
import Utils from '../../../Utils';

describe(commands.STORAGEENTITY_LIST, () => {
  let vorpal: Vorpal;
  let log: string[];
  let cmdInstance: any;
  let trackEvent: any;
  let telemetry: any;

  before(() => {
    sinon.stub(auth, 'getAccessToken').callsFake(() => { return Promise.resolve('ABC'); });
    trackEvent = sinon.stub(appInsights, 'trackEvent').callsFake((t) => {
      telemetry = t;
    });
  });

  beforeEach(() => {
    vorpal = require('../../../vorpal-init');
    log = [];
    cmdInstance = {
      log: (msg: string) => {
        log.push(msg);
      }
    };
    auth.site = new Site();
    telemetry = null;
  });

  afterEach(() => {
    Utils.restore([
      vorpal.find,
      request.get
    ]);
  });

  after(() => {
    Utils.restore([
      appInsights.trackEvent,
      auth.getAccessToken
    ]);
  });

  it('has correct name', () => {
    assert.equal(storageEntityListCommand.name.startsWith(commands.STORAGEENTITY_LIST), true);
  });

  it('has a description', () => {
    assert.notEqual(storageEntityListCommand.description, null);
  });

  it('calls telemetry', (done) => {
    cmdInstance.action = storageEntityListCommand.action;
    cmdInstance.action({ options: {}, appCatalogUrl: 'https://contoso-admin.sharepoint.com' }, () => {
      try {
        assert(trackEvent.called);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('logs correct telemetry event', (done) => {
    cmdInstance.action = storageEntityListCommand.action;
    cmdInstance.action({ options: {}, appCatalogUrl: 'https://contoso-admin.sharepoint.com' }, () => {
      try {
        assert.equal(telemetry.name, commands.STORAGEENTITY_LIST);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('aborts when not connected to a SharePoint site', (done) => {
    auth.site = new Site();
    auth.site.connected = false;
    cmdInstance.action = storageEntityListCommand.action;
    cmdInstance.action({ options: { verbose: true }, appCatalogUrl: 'https://contoso.sharepoint.com/sites/appcatalog' }, () => {
      let returnsCorrectValue: boolean = false;
      log.forEach(l => {
        if (l && l.indexOf('Connect to a SharePoint Online site first') > -1) {
          returnsCorrectValue = true;
        }
      });
      try {
        assert(returnsCorrectValue);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('retrieves the list of configured tenant properties', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url.indexOf(`/_api/web/AllProperties?$select=storageentitiesindex`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0) {
          return Promise.resolve({
            storageentitiesindex: JSON.stringify({
              'Property1': {
                Value: 'dolor1'
              },
              'Property2': {
                Comment: 'Lorem2',
                Description: 'ipsum2',
                Value: 'dolor2'
              }
            })
          });
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    cmdInstance.action = storageEntityListCommand.action;
    cmdInstance.action({ options: { verbose: true, appCatalogUrl: 'https://contoso.sharepoint.com/sites/appcatalog' }}, () => {
      let correctKey1: boolean = false;
      let correctValue1: boolean = false;
      let correctDescription1: boolean = false;
      let correctComment1: boolean = false;
      let correctKey2: boolean = false;
      let correctValue2: boolean = false;
      let correctDescription2: boolean = false;
      let correctComment2: boolean = false;

      log.forEach(l => {
        if (!l || typeof l !== 'string') {
          return;
        }

        if (l.indexOf('Key:') > -1 && l.indexOf('Property1') > -1) {
          correctKey1 = true;
        }

        if (l.indexOf('Description:') > -1 && l.indexOf('not set') > -1) {
          correctDescription1 = true;
        }

        if (l.indexOf('Comment:') > -1 && l.indexOf('not set') > -1) {
          correctComment1 = true;
        }

        if (l.indexOf('Value:') > -1 && l.indexOf('dolor1') > -1) {
          correctValue1 = true;
        }

        if (l.indexOf('Key:') > -1 && l.indexOf('Property2') > -1) {
          correctKey2 = true;
        }

        if (l.indexOf('Description:') > -1 && l.indexOf('ipsum2') > -1) {
          correctDescription2 = true;
        }

        if (l.indexOf('Comment:') > -1 && l.indexOf('Lorem2') > -1) {
          correctComment2 = true;
        }

        if (l.indexOf('Value:') > -1 && l.indexOf('dolor2') > -1) {
          correctValue2 = true;
        }
      });
      try {
        assert(correctKey1, 'Incorrect property1 name');
        assert(correctValue1, 'Incorrect property1 value');
        assert(correctDescription1, 'Incorrect property1 description');
        assert(correctComment1, 'Incorrect property1 comment');
        assert(correctKey2, 'Incorrect property2 name');
        assert(correctValue2, 'Incorrect property2 value');
        assert(correctDescription2, 'Incorrect property2 description');
        assert(correctComment2, 'Incorrect property2 comment');
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('doesn\'t fail if no tenant properties have been configured', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url.indexOf(`/_api/web/AllProperties?$select=storageentitiesindex`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0) {
          return Promise.resolve({ storageentitiesindex: '' });
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    cmdInstance.action = storageEntityListCommand.action;
    cmdInstance.action({ options: { verbose: false, appCatalogUrl: 'https://contoso.sharepoint.com/sites/appcatalog' }}, () => {
      let correctResponse: boolean = false;
      log.forEach(l => {
        if (!l || typeof l !== 'string') {
          return;
        }

        if (l.indexOf('No tenant properties found') > -1) {
          correctResponse = true;
        }
      });
      try {
        assert(correctResponse);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('doesn\'t fail if tenant properties web property value is empty', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url.indexOf(`/_api/web/AllProperties?$select=storageentitiesindex`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0) {
          return Promise.resolve({});
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    cmdInstance.action = storageEntityListCommand.action;
    cmdInstance.action({ options: { verbose: true, appCatalogUrl: 'https://contoso.sharepoint.com/sites/appcatalog' }}, () => {
      let correctResponse: boolean = false;
      log.forEach(l => {
        if (!l || typeof l !== 'string') {
          return;
        }

        if (l.indexOf('No tenant properties found') > -1) {
          correctResponse = true;
        }
      });
      try {
        assert(correctResponse, 'Incorrect response');
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('doesn\'t fail if tenant properties web property value is empty JSON object', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url.indexOf(`/_api/web/AllProperties?$select=storageentitiesindex`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0) {
            return Promise.resolve({ storageentitiesindex: JSON.stringify({}) });
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    cmdInstance.action = storageEntityListCommand.action;
    cmdInstance.action({ options: { verbose: true, appCatalogUrl: 'https://contoso.sharepoint.com/sites/appcatalog' }}, () => {
      let correctResponse: boolean = false;
      log.forEach(l => {
        if (!l || typeof l !== 'string') {
          return;
        }

        if (l.indexOf('No tenant properties found') > -1) {
          correctResponse = true;
        }
      });
      try {
        assert(correctResponse, 'Incorrect response');
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('doesn\'t fail if tenant properties web property value is invalid JSON', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url.indexOf(`/_api/web/AllProperties?$select=storageentitiesindex`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0) {
            return Promise.resolve({ storageentitiesindex: 'a' });
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    cmdInstance.action = storageEntityListCommand.action;
    cmdInstance.action({ options: { verbose: true, appCatalogUrl: 'https://contoso.sharepoint.com/sites/appcatalog' }}, () => {
      let correctResponse: boolean = false;
      log.forEach(l => {
        if (!l || typeof l !== 'string') {
          return;
        }

        if (l.indexOf('Error:') > -1) {
          correctResponse = true;
        }
      });
      try {
        assert(correctResponse, 'Incorrect response');
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('supports verbose mode', () => {
    const options = (storageEntityListCommand.options() as CommandOption[]);
    let containsVerboseOption = false;
    options.forEach(o => {
      if (o.option === '--verbose') {
        containsVerboseOption = true;
      }
    });
    assert(containsVerboseOption);
  });

  it('requires app catalog URL', () => {
    const options = (storageEntityListCommand.options() as CommandOption[]);
    let requiresAppCatalogUrl = false;
    options.forEach(o => {
      if (o.option.indexOf('<appCatalogUrl>') > -1) {
        requiresAppCatalogUrl = true;
      }
    });
    assert(requiresAppCatalogUrl);
  });

  it('doesn\'t fail if the parent doesn\'t define options', () => {
    sinon.stub(Command.prototype, 'options').callsFake(() => { return undefined; });
    const options = (storageEntityListCommand.options() as CommandOption[]);
    Utils.restore(Command.prototype.options);
    assert(options.length > 0);
  });

  it('accepts valid SharePoint Online app catalog URL', () => {
    const actual = (storageEntityListCommand.validate() as CommandValidate)({ options: { appCatalogUrl: 'https://contoso.sharepoint.com/sites/appcatalog' }});
    assert(actual);
  });

  it('rejects invalid SharePoint Online URL', () => {
    const url = 'https://contoso.com';
    const actual = (storageEntityListCommand.validate() as CommandValidate)({ options: { appCatalogUrl: url }});
    assert.equal(actual, `${url} is not a valid SharePoint Online app catalog URL`);
  });

  it('rejects invalid SharePoint Online app catalog URL', () => {
    const url = 'https://contoso.sharepoint.com';
    const actual = (storageEntityListCommand.validate() as CommandValidate)({ options: { appCatalogUrl: url }});
    assert.equal(actual, `${url} is not a valid SharePoint Online app catalog URL`);
  });

  it('fails validation when no SharePoint Online app catalog URL specified', () => {
    const actual = (storageEntityListCommand.validate() as CommandValidate)({ options: { }});
    assert.equal(actual, 'Missing required option appCatalogUrl');
  });

  it('has help referring to the right command', () => {
    const _helpLog: string[] = [];
    const helpLog = (msg: string) => { _helpLog.push(msg); }
    const cmd: any = {
      helpInformation: () => { }
    };
    const find = sinon.stub(vorpal, 'find').callsFake(() => cmd);
    (storageEntityListCommand.help() as CommandHelp)({}, helpLog);
    assert(find.calledWith(commands.STORAGEENTITY_LIST));
  });

  it('has help with examples', () => {
    const _log: string[] = [];
    const log = (msg: string) => { _log.push(msg); }
    const cmd: any = {
      helpInformation: () => { }
    };
    sinon.stub(vorpal, 'find').callsFake(() => cmd);
    (storageEntityListCommand.help() as CommandHelp)({}, log);
    let containsExamples: boolean = false;
    _log.forEach(l => {
      if (l && l.indexOf('Examples:') > -1) {
        containsExamples = true;
      }
    });
    Utils.restore(vorpal.find);
    assert(containsExamples);
  });

  it('correctly handles lack of valid access token', (done) => {
    Utils.restore(auth.getAccessToken);
    sinon.stub(auth, 'getAccessToken').callsFake(() => { return Promise.reject(new Error('Error getting access token')); });
    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    cmdInstance.action = storageEntityListCommand.action;
    cmdInstance.action({ options: { verbose: true, appCatalogUrl: 'https://contoso-admin.sharepoint.com' }}, () => {
      let containsError = false;
      log.forEach(l => {
        if (l &&
          typeof l === 'string' &&
          l.indexOf('Error getting access token') > -1) {
          containsError = true;
        }
      });
      try {
        assert(containsError);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });
});