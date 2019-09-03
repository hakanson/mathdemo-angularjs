(function () {
	'use strict';
	angular.module('fef')
		.provider('fefLog', FefLogProvider);

	function FefLogProvider() {
		var _$log;

		var levels = ['none', 'error', 'warn', 'info', 'log', 'debug'];
		var baseConfig = {
			rootname : 'fef',
			consoleThreshold: 4,
			consoleTimestamp: false,
			httpThreshold: 1,
			httpPath: null,
			httpAuthorization: null,
			delay: 250
		};
		var rootGuid = trmrguid();
		var namedConfigs = {};
		var $window, $location;

		function setInit(_window, _location, _log) {
			$window = _window;
			$location = _location;
			_$log = _$log || _log
		}

		function thresholdFromString(value) {
			var i;
			for (i = 0; i < levels.length; i++) {
				if (levels[i] == value.toLowerCase()) {
					return i;
				}
			}

			return -1;
		}

		function validateConfig(config) {
			if (typeof config.consoleThreshold == 'string') {
				config.consoleThreshold = thresholdFromString(config.consoleThreshold);
			}
			if (typeof config.consoleThreshold != 'number' || config.consoleThreshold < 0 || config.consoleThreshold > 5) {
				config.consoleThreshold = 4;
			}

			if (typeof config.httpThreshold == 'string') {
				config.httpThreshold = thresholdFromString(config.httpThreshold);
			}
			if (typeof config.httpThreshold != 'number' || config.httpThreshold < 0 || config.httpThreshold > 5) {
				config.httpThreshold = 1;
			}
		}
		// won't allow new properties tp pollute config object
		function extendConfig(base, extended) {
			var keys = Object.keys(base);
			angular.forEach(keys, function (item) {
				// check for undefined explicitly so 0 and false will work
				if (extended[item] !== undefined) {
					base[item] = extended[item];
				}
			});
		}
		function configure(newConfig, name) {
			var cfg, key;

			if (!angular.isUndefined(newConfig)) {
				if (name && name.length) {
					key = ([baseConfig.rootname].concat(name)).join(':');
					cfg = namedConfigs[key];
					if (!cfg) {
						cfg = namedConfigs[key] = {
							consoleThreshold: baseConfig.consoleThreshold,
							httpThreshold: baseConfig.httpThreshold
						};
					}

					if (newConfig === null) {
						delete namedConfigs[key];
						cfg = baseConfig;
					} else {
						// will only override consoleThreshold & httpThreshold
						extendConfig(cfg, newConfig);
						validateConfig(cfg);
					}

					// return clone of configuration object
					return angular.extend({}, baseConfig, cfg);

				} else {
					extendConfig(baseConfig, newConfig);
					validateConfig(baseConfig);
				}
			}

			// return clone of configuration object
			return angular.extend({}, baseConfig);
		}

		/*jshint bitwise: true*/
		function trmrguid() {
			return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
				var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
				return v.toString(16);
			});
		}

		function generatePageGuid($http, pagename) {
			rootGuid = trmrguid();
			$http.defaults.headers.common['x-cobalt-pcid'] = rootGuid;

			var data = createLogData(baseConfig.rootname);
			data.level = 'page';
			data.pageName = (typeof pagename == 'string' ? pagename : 'UNKNOWN');
			logHttp(data);
		}

		var logBuffer = [];
		function logHttp(logData) {
			if (baseConfig.httpPath) {
				if (logBuffer.length == 0) {
					//*** DO NOT COPY THE PATTERN BELOW
					// use setTimeout/XMLHttpRequest instead of $timeout/$http to avoid circular exceptions/errors
					setTimeout(function () {
						var logRequest = new XMLHttpRequest();
						logRequest.open('POST', baseConfig.httpPath);
						logRequest.setRequestHeader('x-cobalt-pcid', rootGuid);
						logRequest.setRequestHeader('Content-Type', 'application/json'); // ;charset=UTF-8
						if (baseConfig.httpAuthorization) {
							logRequest.setRequestHeader('Authorization', baseConfig.httpAuthorization);
						}
						logRequest.send(JSON.stringify({version: '0.1', items: logBuffer}));

						logBuffer = [];
					}, baseConfig.delay);
					//***
				}
				logBuffer.push(logData);
			}
		}

		function createLogData (name) {
			var timestamp = (new Date()).toISOString();

			var data = {
				root: rootGuid,
				name: name,
				timestamp: timestamp
			};
			if ($location) {
				data['url'] = $location.absUrl();
			}

			return data;
		}

		// from angular.js source code
		function formatError(arg) {
			if (arg instanceof Error) {
				if (arg.stack) {
					arg = (arg.message && arg.stack.indexOf(arg.message) === -1)
						? 'Error: ' + arg.message + '\n' + arg.stack
						: arg.stack;
				} else if (arg.sourceURL) {
					arg = arg.message + '\n' + arg.sourceURL + ':' + arg.line;
				}
			}
			return arg;
		}

		function executeLogFn(args, logFn, level, name) {
			name = ([baseConfig.rootname].concat(name)).join(':');
			var logData = createLogData(name);
			var cfg = namedConfigs[name] || baseConfig;
			var timestamp = '';

			// HTTP logging
			if (baseConfig.httpPath && level <= cfg.httpThreshold) {
				var i, messages = [];
				for (i = 0; i < args.length; i++) {
					messages.push(args[i].toString());
				}

				logData.level = levels[level];
				logData.messages = messages;

				if (args[0] instanceof Error) {
					if (args[0].stack) {
						logData['stacktrace'] = formatError(args[0]);
					}
				}

				logHttp(logData);
			}

			// console logging
			if (level <= cfg.consoleThreshold) {

				// prepend an ISO timestamp and logger to the original log message
				if (cfg.consoleTimestamp) {
					timestamp = logData.timestamp + ' ';
				}
				if (angular.isString(args[0])) {
					args[0] = timestamp + '[' + name + '] ' + args[0];
				} else {
					args.unshift(timestamp + '[' + name + '] ');
				}

				logFn.apply(null, args);
			}
		}

		/**
		 * Wrap original log function
		 */
		function wrapLogFn(logFn, level, name) {
			var wrappedLogFn = function () {
				var args = Array.prototype.slice.call(arguments);
				return executeLogFn(args, logFn, level, name || ['$log']);
			};

			// support angular-mocks which assumes log messages captured in an array
			// https://github.com/angular/bower-angular-mocks/blob/master/angular-mocks.js
			wrappedLogFn.logs = [ ];

			return wrappedLogFn;
		}

		/**
		 * Generate name-specific logger instance
		 */
		function getLogger() {
			var name = Array.prototype.slice.call(arguments) || [];

			return {
				log: wrapLogFn(_$log.log, 4, name),
				info: wrapLogFn(_$log.info, 3, name),
				warn: wrapLogFn(_$log.warn, 2, name),
				debug: wrapLogFn(_$log.debug, 5, name),
				error: wrapLogFn(_$log.error, 1, name)
			};
		}

		this.enhance$log = function ($log, moduleName) {
			// capture the original functions of $log
			_$log = (function ($log) {
				return {
					log: $log.log,
					info: $log.info,
					warn: $log.warn,
					debug: $log.debug,
					error: $log.error
				};
			})($log);

			$log.debug = wrapLogFn($log.debug, 5);
			$log.log = wrapLogFn($log.log, 4);
			$log.info = wrapLogFn($log.info, 3);
			$log.warn = wrapLogFn($log.warn, 2);
			$log.error = wrapLogFn($log.error, 1);

			return $log;
		};

		this.$get = ['$window','$location', '$http', '$log', function ($window, $location, $http, $log) {
			var fefLog = {};

			setInit($window, $location, $log);

			fefLog.configure = configure;

			fefLog.getLogger = getLogger;

			fefLog.pageguid = function (pagename) {
				if (pagename) {
					generatePageGuid($http, pagename);
				}

				return rootGuid;
			};

			// work in progress for timing a component by wrapping in a Promise
			fefLog.component = function (options, promise) {
				var then = Date.now();
				var data = createLogData(baseConfig.rootname);
				delete data.url;
				data.componentName = options.name;
				data.level = 'component';
				return promise.then(function(result) {
					data.duration = (Date.now() - then);
					logHttp(data);
					return result;
				}, function(reason) {
					data.duration = (Date.now() - then);
					data.error = 1;
					logHttp(data);
					return reason;
				});
			};

			return fefLog;
		}];
	}
})();