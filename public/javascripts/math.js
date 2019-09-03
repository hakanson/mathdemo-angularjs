(function () {
	'use strict';

	var app = angular.module('math', ['ngRoute', 'ngResource', 'ngSanitize', 'fef']);

//  --- begin configure fefLog ---
	app.config(['$provide', 'fefLogProvider', function ($provide, fefLogProvider) {
		$provide.decorator('$log', [ "$delegate", function ($delegate) {
			fefLogProvider.enhance$log($delegate);

			return $delegate;
		}]);
	}]);

	app.run(['fefLog', function (fefLog) {
		fefLog.configure({ rootname : app.name, consoleThreshold: 5, consoleTimestamp: true, httpThreshold: 5, httpPath: '/api/log/fef'});
		// you can configure the thresholds for a specific named logger
		// fefLog.configure({ httpThreshold : 5 }, 'BinaryOperatorCtrl');
		fefLog.pageguid(true);
	}]);
//  --- end configure fefLog --


	app.run(['fefLog', '$rootScope', '$document', function (fefLog, $rootScope, $document) {
		var $log = fefLog.getLogger('$broadcast', 'visibilitychange');

		$log.debug('listen for visibilitychange event');

		// you can trigger visibilitychange by swithing active browser tabs
		$document.on('visibilitychange', function () {
			$log.info('hidden=' + document.hidden + ', visibilityState=' + document.visibilityState);
			$rootScope.$broadcast('visibilityChange', document.hidden, document.visibilityState);
		});
	}]);

	app.run(['fefLog', '$rootScope', function (fefLog, $rootScope) {
		var $log = fefLog.getLogger('$on', 'visibilitychange');

		$rootScope.$on('visibilityChange', function (event, hidden, visibilityState) {
			$log.info(hidden + ", " + visibilityState);
		});
	}]);


	function ErrorCtrl($scope, fefLog) {
		var $log = fefLog.getLogger('ErrorCtrl');
		$log.debug('loading');

		throw new Error('thrown');
	}

	app.config(function ($routeProvider) {
		$routeProvider
			.when('/',
			{
				templateUrl: 'view/home.html'
			})
			.when('/binary/:operation',
			{
				templateUrl: 'view/binary.html',
				controller: 'BinaryOperatorCtrl'
			})
			.when('/unary/:operation',
			{
				templateUrl: 'view/unary.html',
				controller: 'UnaryOperatorCtrl'
			})
			.when('/error',
			{
				templateUrl: 'view/home.html',
				controller: ErrorCtrl
			})
			.when('/config',
			{
				templateUrl: 'view/config.html',
				controller: function ($scope, fefLog) {
					var $log = fefLog.getLogger('ConfigCtrl');
					$log.debug('loading');

					var config = fefLog.configure();
					$log.debug(JSON.stringify(config));

					$scope.model = {
						console: config.consoleThreshold,
						http: config.httpThreshold,
						httpAuthorization: config.httpAuthorization
					};

					$scope.$watchCollection('model', function () {
						fefLog.configure({consoleThreshold: $scope.model.console, httpThreshold: $scope.model.http, httpAuthorization: $scope.model.httpAuthorization });
					});
				}
			})
	});

	app.run(['$location', '$rootScope', 'fefLog', function ($location, $rootScope, fefLog) {
		var $log = fefLog.getLogger();

		$rootScope.$on("$locationChangeStart", function (event, next, current) {
			$log.debug(event.name);

			if (next.indexOf('/#/prevent') > 0) {
				event.preventDefault();
				$log.warn(event.name + " event.preventDefault() for " + next);
			}
		});
		$rootScope.$on("$locationChangeSuccess", function (event, next, current) {
			$log.log(event.name + "  " + current + " -> " + next);
		});


		$rootScope.$on("$routeChangeStart", function (event, aRoute, bRoute) {
			$log.debug(event.name);
		});
		$rootScope.$on("$routeChangeSuccess", function (event, aRoute, bRoute) {
			$log.debug(event.name);
			fefLog.pageguid(true);
		});
	}]);

	app.directive('equationInput', function (fefLog) {
		var $log = fefLog.getLogger('equationInput');
		$log.debug('loading');

		return {
			replace: true,
			restrict: 'E',
			scope: {
				name: '@'
			},
			templateUrl: 'template/equation-input.html'
		}
	});

	app.directive('binaryEquation', function (fefLog) {
		var $log = fefLog.getLogger('binaryEquation');
		$log.debug('loading');

		return {
			restrict: 'E',
			templateUrl: 'template/binary-equation.html'
		}
	});

	app.directive('unaryEquation', function (fefLog) {
		var $log = fefLog.getLogger('unaryEquation');
		$log.debug('loading');

		return {
			restrict: 'E',
			templateUrl: 'template/unary-equation.html'
		}
	});

	//  "Answer to The Ultimate Question of Life, the Universe, and Everything"
	app.constant('answer', 42);

	app.value('mapping', {
		"add": {
			"label": "Add",
			"operation": "+"
		},
		"sub": {
			"label": "Subtract",
			"operation": "-"
		},
		"div": {
			"label": "Divide",
			"operation": "/"
		},
		"abs": {
			"label": "Absolute Value",
			"operation": "abs"
		},
		"sqrt": {
			"label": "Square Root",
			"operation": "sqrt"
		}
	});

	app.factory('binaryCalculator', function ($log) {
		// using $log instead of fefLog so can't name logger, but logging still works as configured
		// var $log = fefLog.getLogger('binaryCalculator');
		$log.debug('loading');

		var service = {
			compute: function (x, y, operation) {

				var result;

				switch (operation) {
					case '+':
						$log.debug('addition');
						result = x + y;
						break;
					case '/':
						$log.debug('division');
						result = x / y;
						break;
					default:
						$log.error('unknown operation');
				}

				return result;
			}
		};

		return service;
	});

	app.service('unaryCalculator', function (fefLog, $q) {
		var $log = fefLog.getLogger('unaryCalculator');
		$log.debug('loading');

		this.compute = function (x, operation) {
			var deferred = $q.defer();
			var result;

			switch (operation) {
				case 'abs':
					$log.debug('absolute');
					result = Math.abs(x);
					break;
				case 'sqrt':
					$log.debug('square root');
					result = Math.sqrt(x);
					break;
				default:
					$log.error('unknown operation');
			}

			if (result) {
				deferred.resolve(result);
			} else {
				deferred.reject('no result');
			}

			return deferred.promise;
		};
	});


	app.service('unaryCalculatorRemote', function ($log, $q, $http) {
		//var $log = fefLog.getLogger('unaryCalculatorRemote');
		$log.debug('loading');

		this.compute = function (x, operation) {
			var deferred = $q.defer();
			var data = {
				x: x,
				operation: operation
			};

			$http.post('/api/math/unary', data).
				success(function (data, status, headers, config) {
					if (data.result) {
						deferred.resolve(data.result);
					} else {
						deferred.reject('no result');
					}
				}).
				error(function (data, status, headers, config) {
					deferred.reject('no result');
				});

			return deferred.promise;
		};
	});

	app.controller('BinaryOperatorCtrl', function ($scope, fefLog, $routeParams, $interpolate, mapping, binaryCalculator) {

		var $log = fefLog.getLogger('BinaryOperatorCtrl');
		$log.debug('loading');

		var format = $interpolate('binary operation: {{model.x}} {{operation}} {{model.y}} = {{result}}');

		$scope.label = mapping[$routeParams.operation].label;
		$scope.operation = mapping[$routeParams.operation].operation;

		$scope.model = {
			x: 1,
			y: 1
		};

		$scope.$watchCollection('model', function () {
			delete $scope.result;
		});

		$scope.calculate = function () {
			$log.info('calculating...');

			$scope.result = binaryCalculator.compute($scope.model.x, $scope.model.y, $scope.operation);

			$log.info(format($scope));
		};
	});

	app.controller('UnaryOperatorCtrl', function ($scope, fefLog, $routeParams, $interpolate, mapping, unaryCalculator, unaryCalculatorRemote) {

		var $log = fefLog.getLogger('UnaryOperatorCtrl');
		$log.debug('loading');

		var format = $interpolate('unary operation: {{operation}}({{model.x}}) = {{result}}');

		$scope.label = mapping[$routeParams.operation].label;
		$scope.operation = mapping[$routeParams.operation].operation;
		$scope.useRemote = false;

		$scope.model = {
			x: 1
		};

		$scope.$watchCollection('model', function () {
			delete $scope.result;
		});

		$scope.calculate = function () {
			$log.info('calculating...');

			var calculator = ($scope.useRemote ? unaryCalculatorRemote : unaryCalculator);

			calculator.compute($scope.model.x, $scope.operation).then(function (result) {
			//fefLog.component({name:'UnaryOperatorCtrl.calculate'},calculator.compute($scope.model.x, $scope.operation)).then(function (result) {
				$scope.result = result;
				$log.info(format($scope));
			}, function (reason) {
				$scope.result = null;
				$log.error(reason)
			});
		};

	});

	app.controller('ConfigCtrl', function ($scope, fefLog) {

		var config = fefLog.configure();
		$scope.model = {
			console: config.consoleThreshold,
			http: config.httpThreshold,
			httpAuthorization: config.httpAuthorization
		};
	});
})();