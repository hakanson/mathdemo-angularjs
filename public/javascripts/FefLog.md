# FefLog
### Description
The Front-end Framework log service (FefLog) builds on the AngularJS `$log` interface and adds the concepts of named loggers and writing log events to a back-end http service.
It also includes support for TRAMS logging concepts like root guid and page events.  Future support will include component events and UX logging.
### Usage

In the most simple case, just inject `fefLog` into your controller, call  `getLogger()` and use it like you would use `$log`.

	function MainCtrl($scope, fefLog) {
		var appLog = fefLog.getLogger();
		appLog.log('loading');
	}

This will be output on the JavaScript console.

    [fef] loading

You can configure FefLog to modify the runtime behavior of the logging methods.
Configuration changes are allowed at any time. which is useful for threshold values.
However, some of these configuration option should be set early in the application lifecycle and may have undesired results if changes later.

	fefLog.configure({
	    rootname : 'app' 
	    consoleThreshold: 5,
	    consoleTimestamp: true,
	    httpThreshold: 5,
	    httpPath: '/api/log',
	    delay: 250
	 });

**rootname** is the logger name which appears formatted inside brackets.
The defaults is `'fef'`

**consoleTimestamp** is a boolean flag indicating if you want a a UTC timestamp printed before each log message.
The default is `false`.

**consoleThreshold** and **httpThreshold** filter the output at a maximum level. 
The default for consoleThreshold is `log` and for httpThreshold is `error`.
The allowed values are either in string or number format:

- `0` or `'none'`
- `1` or `'error'`
- `2` or `'warn'`
- `3` or `'info'`
- `4` or `'log'`
- `5` or `'debug'`

**httpPath** is the URL for your back end web service that consumes the `POST`ed log data.
HTTP is disabled by default and there is no default value.
A corresponding, sharable back-end service is being built to capture and index these logs.

**delay** is the time in milliseconds a buffer of log messages in kept before being sent over http.
This allows for more efficient use of network requests.
The default value is `250`.

#### $log

FefLog uses the functionality of AngularJS `$log` to write to the JavaScript console.

FefLog can be configured to overload AngularJS `$log`, which will automatically capture `$log` method output and send to the configured httpPath.  This also captures `$exceptionHandler` since that utilizes `$log.error()`.  To enable this functionality:

	angular.module('app').config(['$provide', 'fefLogProvider', function ($provide, fefLogProvider) {
		$provide.decorator('$log', [ '$delegate', function ($delegate) {
			fefLogProvider.enhance$log($delegate);
			return $delegate;
		}]);
	}]);

After calling `enhance$log()`, any code which uses `$log` directly... 

	function MainCtrl($scope, $log) {
		$log.log('loading');
	}

...will behave as if you called `feflog.getLogger('$log')`.  The output would be:

	2015-03-14T14:26:53.589Z [fef:$log] loading

#### Named loggers / configurations

The following example will independently set the base configuration from a named configuration, which are indicated by an optional `name` parameter and only allowed to override `consoleThreshold` and `httpThreshold` values.

	var config = fefLog.configure({ rootname : 'app', consoleThreshold: 'error' });
	var featureConfig = fefLog.configure({ consoleThreshold: 'debug' }, 'feature');

When this logging code is executed...

    var appLog = fefLog.getLogger();
    var featureLog = fefLog.getLogger('feature');
    
    $log.error('$log error');
    $log.debug('$log debug');
    
    appLog.error('error');
    appLog.debug('debug');
    
    featureLog.error('feature error');
    featureLog.debug('feature debug');

...this output will appear in the JavaScript console:

	[app:$log] $log error
	[app] error
	[app:feature] feature error
	[app:feature] feature debug

#### HTTP

The JSON data which is `POST`ed to the `httpPath` contains a `version` attribute and an `items` array.

    {
        'version': '0.1,
        'items': []
    }

The concepts of Page events and root guids come from TRMR and TRAMS.  The page event is used to mark a significant UI interaction, historically triggered by navigating to a new web page.  The rootguid is a property of the page event that allows other events (including REST API calls) to be linked back to the originating page.

In a Single Page Application, it is the burden of the application to trigger page events at the appropriate time, likely during significant route changes.  The `pageguid()` method of FefLog provides for this.

    var rootguid = FefLog.pageguid(true);

This will generate a new `rootguid` and create a page event in the items array.
If called with a `string` parameter, that will be used for the `pageName`.
If called without a parameter, it will just return the current rootguid and not create a new page event.

	 {
		 'root': 'a44b4fc27cb44e82ba72575f5eed7581',
		 'name': 'fef',
		 'timestamp': '2015-03-14T14:26:53.589Z',
		 'url': 'http://server/',
		 'level': 'page',
		 'pageName': 'UNKNOWN'
	 }

To match other behaviors in the TRAMS infrastructure, the generated rootguid is also automatically set as the `x-cobalt-pcid` header for any requests that utilize `$http`.

    $http.defaults.headers.common['x-cobalt-pcid'] = rootguid;

Logging events also create entries in the `items` array.
The `featureLog.debug('feature debug')` snippet above would create the following JSON payload.  Note that `messages` is an array because `log()` methods can take multiple parameters.

    {
        'root': '50907f563fff479aa6fcdfefafea4bfd',
        'name': 'app:feature',
        'timestamp': '2015-03-14T14:26:53.589Z',
        'url': 'http://server/',
        'level': 'debug',
        'messages': [
            'feature debug'
        ]
    }

Error objects passed to the `$log.error()` or its FefLog equivalents will generate a stacktrace.  This code

	function ErrorCtrl($scope) {
		throw new Error('thrown');
	}

...will trigger the `$exceptionHandler` and generate this JSON event data including a string based stacktrace derived from `error.stack`:

    {
        'root': '50907f563fff479aa6fcdfefafea4bfd',
        'name': 'fef:$log',
        'timestamp': '2015-03-14T14:26:53.589Z',
        'url': 'http://server/',
        'level': 'error',
        'messages': [
            'Error: thrown',
            '<ng-view class=\'ng-scope\'>'
        ],
        'stacktrace': 'Error: thrown\n    at new ErrorCtrl (http://server/javascripts/app.js:50:9)\n    at invoke (http://ajax.googleapis.com/ajax/libs/angularjs/1.2.26/angular.js:3966:17)\n  ...'
    }

Note: FefLog intentionally uses `setTimeout` and `XMLHttpRequest` internally instead of `$timeout` and `$http` to avoid circular exception situations.

Future versions of FefLog may support creating TRMR component events, likely using a promised based API to capture the `duration` of a client event.

    {
        "root": "9b844642acf5481ea2636c2d4e1b1038",
        "name": "app",
        "timestamp": "2015-03-14T14:26:53.589Z",
        "componentName": "MainCtrl.calculate",
        "level": "component",
        "duration": 16
    }
