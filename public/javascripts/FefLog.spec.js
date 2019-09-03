describe('FefLog with no config.', function() {
	var FefLog, Log;
	beforeEach(module('fef'));

	/*jshint camelcase: false */
	beforeEach(inject(function(_fefLog_, $log ) {
		Log = $log;
		FefLog = _fefLog_;
	}));

	it('test create a FefLog', function() {
		expect(!!FefLog).toBe(true);
	});

	it('test create a FefLog logger', function() {
		expect(!!FefLog.getLogger()).toBe(true);
	});

	it('test log is called and debug is not', function() {
		var fefLog = FefLog.getLogger();

		fefLog.debug('test debug');
		expect(Log.assertEmpty());

		fefLog.log('test log');
		expect(Log.log.logs).toEqual([['[fef] test log']]);
	});

	it('test info is called and debug is not', function() {
		var fefLog = FefLog.getLogger();

		fefLog.debug('test debug');
		expect(Log.assertEmpty());

		fefLog.info('test info');
		expect(Log.info.logs).toEqual([['[fef] test info']]);
	});

	it('test warn is called and debug is not', function() {
		var fefLog = FefLog.getLogger();

		fefLog.debug('test debug');
		expect(Log.assertEmpty());

		fefLog.warn('test warn');
		expect(Log.warn.logs).toEqual([['[fef] test warn']]);
	});

	it('test error is called and debug is not', function() {
		var fefLog = FefLog.getLogger();

		fefLog.debug('test debug');
		expect(Log.assertEmpty());

		fefLog.error('test error');
		expect(Log.error.logs).toEqual([['[fef] test error']]);
	});

	it('test error will not call http.', function() {
		jasmine.clock().install();
		jasmine.Ajax.install();

		var fefLog = FefLog.getLogger();

		fefLog.error('test error');

		var request = jasmine.Ajax.requests.mostRecent();
		expect(!!request).toBe(false);

		jasmine.clock().tick(251);

		request = jasmine.Ajax.requests.mostRecent();
		expect(!!request).toBe(false);

		jasmine.Ajax.uninstall();
		jasmine.clock().uninstall();
	});

	it('test error object is formatted', function() {
		var fefLog = FefLog.getLogger();
		var error = new Error('test error');
		fefLog.error(error);
		expect(Log.error.logs).toEqual([['[fef] ', error]]); // Error: test error
	});

	it('test named logger', function() {
		var fefLog = FefLog.getLogger('test1');
		fefLog.log('test log');
		expect(Log.log.logs).toEqual([['[fef:test1] test log']]);
	});

	it('test compound named logger', function() {
		var fefLog = FefLog.getLogger('test1', 'test2');
		fefLog.log('test log');
		expect(Log.log.logs).toEqual([['[fef:test1:test2] test log']]);
	});

	it('test two separate loggers do not affect each other', function() {
		var fefLog1 = FefLog.getLogger('log1');
		var fefLog2 = FefLog.getLogger('log2');

		fefLog1.log('log1 message #1');
		expect(Log.log.logs).toEqual([['[fef:log1] log1 message #1']]);

		fefLog2.log('log2 message #1');
		expect(Log.log.logs).toEqual([['[fef:log1] log1 message #1'], ['[fef:log2] log2 message #1']]);

		fefLog1.log('log1 message #2');
		expect(Log.log.logs).toEqual([
			['[fef:log1] log1 message #1'],
			['[fef:log2] log2 message #1'],
			['[fef:log1] log1 message #2']]);
	});

});

describe('FefLog with config.', function() {
	var FefLog, Log;
	beforeEach(module('fef'));

	/*jshint camelcase: false */
	beforeEach(inject(function(_fefLog_, $log ) {
		Log = $log;
		FefLog = _fefLog_;
	}));

	it('test named root logger', function() {
		FefLog.configure({rootname : 'jasmine'});

		var fefLog = FefLog.getLogger();

		fefLog.log('test log');
		expect(Log.log.logs).toEqual([['[jasmine] test log']]);
	});

	it('test named root and instance logger', function() {
		FefLog.configure({rootname : 'jasmine'});

		var fefLog = FefLog.getLogger('test1');

		fefLog.log('test log');
		expect(Log.log.logs).toEqual([['[jasmine:test1] test log']]);
	});

	it('test numeric threshold values', function() {
		var config = FefLog.configure();
		var defaultConsoleValue = config.consoleThreshold;
		var defaultHttpValue = config.httpThreshold;

		config = FefLog.configure({consoleThreshold : -1, httpThreshold : -1});
		expect(config.consoleThreshold).toBe(defaultConsoleValue);
		expect(config.httpThreshold).toBe(defaultHttpValue);

		config = FefLog.configure({consoleThreshold : 6, httpThreshold : 6});
		expect(config.consoleThreshold).toBe(defaultConsoleValue);

		var i;
		for (i = 0; i < 6; i++) {
			config = FefLog.configure({consoleThreshold : i, httpThreshold : i});
			expect(config.consoleThreshold).toBe(i);
			expect(config.httpThreshold).toBe(i);
		}
	});

	it('test invalid threshold values', function() {
		var config = FefLog.configure();
		var defaultConsoleValue = config.consoleThreshold;
		var defaultHttpValue = config.httpThreshold;

		config = FefLog.configure({consoleThreshold: undefined, httpThreshold : undefined});
		expect(config.consoleThreshold).toBe(defaultConsoleValue);
		expect(config.httpThreshold).toBe(defaultHttpValue);

		config = FefLog.configure({consoleThreshold: null, httpThreshold : null});
		expect(config.consoleThreshold).toBe(defaultConsoleValue);
		expect(config.httpThreshold).toBe(defaultHttpValue);

		config = FefLog.configure({consoleThreshold: true, httpThreshold : true});
		expect(config.consoleThreshold).toBe(defaultConsoleValue);
		expect(config.httpThreshold).toBe(defaultHttpValue);

		config = FefLog.configure({consoleThreshold: [], httpThreshold : []});
		expect(config.consoleThreshold).toBe(defaultConsoleValue);
		expect(config.httpThreshold).toBe(defaultHttpValue);
	});

	it('test string threshold values', function() {
		var config = FefLog.configure();
		var defaultConsoleValue = config.consoleThreshold;
		var defaultHttpValue = config.httpThreshold;

		config = FefLog.configure({consoleThreshold : ''});
		expect(config.consoleThreshold).toBe(defaultConsoleValue);
		expect(config.httpThreshold).toBe(defaultHttpValue);

		config = FefLog.configure({consoleThreshold : 'fef'});
		expect(config.consoleThreshold).toBe(defaultConsoleValue);
		expect(config.httpThreshold).toBe(defaultHttpValue);

		var levels = ['none', 'Error', 'warn', 'info', 'log', 'DEBUG']; // mixed case strings
		var i;
		for (i = 0; i < levels.length; i++) {
			config = FefLog.configure({consoleThreshold : levels[i],httpThreshold  : levels[i]});
			expect(config.consoleThreshold).toBe(i);
			expect(config.httpThreshold).toBe(i);
		}
	});

	it('test console timestamps', function() {
		jasmine.clock().install();

		FefLog.configure({consoleTimestamp: true});
		var fefLog = FefLog.getLogger();

		var baseTime = new Date(Date.UTC(2015, 2, 14, 9, 26, 53, 589));
		jasmine.clock().mockDate(baseTime);
		fefLog.log('test');
		expect(Log.log.logs).toEqual([['2015-03-14T09:26:53.589Z [fef] test']]);

		jasmine.clock().uninstall();
	});

	it('test log is still called when returned config is modified', function() {
		var config = FefLog.configure();
		config.consoleThreshold = 0;
		config.rootname = 'jasmine';

		var fefLog = FefLog.getLogger();

		fefLog.log('test log');
		expect(Log.log.logs).toEqual([['[fef] test log']]);
	});

	it('test invalid config overrides', function() {
		var config = FefLog.configure({
			rootname : 'jasmine',
			badProperty : 'evil'
		});

		expect(config.rootname).toEqual('jasmine');
		expect(config.badProperty).toBe(undefined);
	});

	it('test named config overrides', function() {
		var baseConfig = FefLog.configure({
			rootname : 'jasmine',
			consoleThreshold: 3,
			consoleTimestamp: false,
			httpThreshold: 3,
			httpPath: '/path'
		});

		var subConfig = FefLog.configure({
			rootname : 'jasmine1',
			consoleThreshold: 1,
			consoleTimestamp: true,
			httpThreshold: 1,
			httpPath: '/path1'
		}, 'test1');

		expect(subConfig.rootname).toEqual('jasmine');
		expect(subConfig.rootname).not.toEqual('jasmine1');

		expect(subConfig.consoleTimestamp).toBe(false);

		expect(subConfig.httpPath).toEqual('/path');
		expect(subConfig.httpPath).not.toEqual('/path1');

		expect(subConfig.consoleThreshold).toBe(1);
		expect(subConfig.httpThreshold).toBe(1);

		var fefLog = FefLog.getLogger();
		var fefLogTest1 = FefLog.getLogger('test1');

		fefLog.warn('test warn');
		fefLog.error('test error');
		fefLogTest1.warn('test warn');
		fefLogTest1.error('test error');

		expect(Log.warn.logs).toEqual([['[jasmine] test warn']]);
		expect(Log.error.logs).toEqual([['[jasmine] test error'],['[jasmine:test1] test error']]);
	});

});

describe('FefLog with http config.', function() {
	var FefLog, Log;
	beforeEach(module('fef'));

	/*jshint camelcase: false */
	beforeEach(inject(function(_fefLog_, $window, $rootScope, $log ) {
		Log = $log;
		FefLog = _fefLog_;

		jasmine.clock().install();
		jasmine.Ajax.install();
	}));

	afterEach(function() {
		jasmine.Ajax.uninstall();
		jasmine.clock().uninstall();
	});

	it('test debug will not call http', function() {
		var config = FefLog.configure({httpPath: '/test/log'});

		var fefLog = FefLog.getLogger();
		fefLog.debug('test debug');

		var request = jasmine.Ajax.requests.mostRecent();
		expect(!!request).toBe(false);

		jasmine.clock().tick(config.delay + 1);

		request = jasmine.Ajax.requests.mostRecent();
		expect(!!request).toBe(false);
	});

	it('test log will call http', function() {
		var config = FefLog.configure({httpThreshold: 5, httpPath: '/test/log'});

		var fefLog = FefLog.getLogger();
		fefLog.debug('test debug');

		var request = jasmine.Ajax.requests.mostRecent();
		expect(!!request).toBe(false);

		jasmine.clock().tick(config.delay + 1);

		request = jasmine.Ajax.requests.mostRecent();
		expect(request.url).toBe('/test/log');
		expect(request.method).toBe('POST');
		expect(request.requestHeaders['x-cobalt-pcid']).toBe(FefLog.pageguid());
	});

	it('test page will and debug will not call http', function() {
		var config = FefLog.configure({httpPath: '/test/log'});

		FefLog.pageguid(true);

		var fefLog = FefLog.getLogger();
		fefLog.debug('test debug');

		jasmine.clock().tick(config.delay + 1);

		var request = jasmine.Ajax.requests.mostRecent();
		var data = JSON.parse(request.params);

		expect(data.items.length).toBe(1);
		expect(data.items[0].level).toBe('page');
	});

	it('test page event data fields', function() {
		var baseTime = new Date(Date.UTC(2015, 2, 14, 9, 26, 53, 589));
		jasmine.clock().mockDate(baseTime);

		var config = FefLog.configure({rootname : 'jasmine', httpPath: '/test/log'});
		var rootguid = FefLog.pageguid(true);

		jasmine.clock().tick(config.delay + 1);

		var request = jasmine.Ajax.requests.mostRecent();
		var data = JSON.parse(request.params);
		var items = data.items;
		expect(data.items.length).toBe(1);

		/*
			 {
				 'root': 'a44b4fc27cb44e82ba72575f5eed7581',
				 'name': 'jasmine',
				 'timestamp': '2015-03-14T14:26:53.589Z',
				 'url': 'http://server/',
				 'level': 'page',
				 'pageName': 'UNKNOWN'
			 }
		 */
		var pageItem = items[0];
		expect(pageItem.root).toBe(rootguid);
		expect(pageItem.name).toBe('jasmine');
		expect(pageItem.timestamp).toEqual('2015-03-14T09:26:53.589Z');
		expect(pageItem.url).toBe('http://server/');
		expect(pageItem.level).toBe('page');
		expect(pageItem.pageName).toBe('UNKNOWN');
	});

	it('test page event name field', function() {
		var config = FefLog.configure({httpPath: '/test/log'});
		FefLog.pageguid('FEF');

		jasmine.clock().tick(config.delay + 1);

		var request = jasmine.Ajax.requests.mostRecent();
		var data = JSON.parse(request.params);
		var items = data.items;
		expect(data.items.length).toBe(1);

		var pageItem = items[0];
		expect(pageItem.level).toBe('page');
		expect(pageItem.pageName).toBe('FEF');
	});

	it('test page/all levels will call http', function() {
		var config = FefLog.configure({httpThreshold: 5, httpPath: '/test/log'});

		var rootguid = FefLog.pageguid(true);

		var fefLog = FefLog.getLogger('test1');
		fefLog.debug('test debug');
		fefLog.log('test log');
		fefLog.info('test info');
		fefLog.warn('test warn');
		fefLog.error('test error');

		jasmine.clock().tick(config.delay + 1);

		var request = jasmine.Ajax.requests.mostRecent();
		var data = JSON.parse(request.params);

		expect(data.items.length).toBe(6);
		var item = data.items[0];
		expect(item.level).toBe('page');
		expect(item.root).toBe(rootguid);
		expect(item.name).toBe('fef');

		/*
			 {
				 'root': 'a44b4fc27cb44e82ba72575f5eed7581',
				 'name': 'fef:test1',
				 'timestamp': '2015-04-07T15:00:00.010Z',
				 'url': 'http://server/',
				 'level': 'debug',
				 'messages': [
				    'test debug'
				 ]
			 }
		 */
		item = data.items[1];
		expect(item.level).toBe('debug');
		expect(item.root).toBe(rootguid);
		expect(item.name).toBe('fef:test1');
		expect(item.messages[0]).toBe('test debug');

		item = data.items[2];
		expect(item.level).toBe('log');
		expect(item.root).toBe(rootguid);
		expect(item.name).toBe('fef:test1');
		expect(item.messages[0]).toBe('test log');

		item = data.items[3];
		expect(item.level).toBe('info');
		expect(item.root).toBe(rootguid);
		expect(item.name).toBe('fef:test1');
		expect(item.messages[0]).toBe('test info');

		item = data.items[4];
		expect(item.level).toBe('warn');
		expect(item.root).toBe(rootguid);
		expect(item.name).toBe('fef:test1');
		expect(item.messages[0]).toBe('test warn');

		item = data.items[5];
		expect(item.level).toBe('error');
		expect(item.root).toBe(rootguid);
		expect(item.name).toBe('fef:test1');
		expect(item.messages[0]).toBe('test error');
	});
});

describe('FefLog with $log override.', function() {
	var FefLogProvider, Log;
	beforeEach(module('fef'));

	beforeEach(module('fef', function (fefLogProvider) {
		FefLogProvider = fefLogProvider;
	}));

	it('test log and error are pass from $log', function() {
		inject(function( $log ) {
			FefLogProvider.enhance$log($log);
			Log = $log;
		});

		Log.log('test log');
		expect(Log.log.logs).toEqual([['[fef:$log] test log']]);

		var error = new Error('test error');
		Log.error(error);
		expect(Log.error.logs).toEqual([['[fef:$log] ', error]]); // Error: test error
	});
});