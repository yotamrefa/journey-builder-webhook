"use strict";

var express = require("express");
var util = require("util");
var request = require("request");
var _ = require("lodash");
var config = require("../lib/config");
var logger = require("../lib/logger");
var sfmc = require("../lib/sfmc");

var router = express.Router();

router.get("/events", function(req, res, next) {
	sfmc.listEvents(function(err, data) {
		if(err) {
			return next(err);
		}
		res.json(data);
	});	
});

router.post("/execute", function(req, res, next) {
	logger.debug("webhook:execute:\n", JSON.stringify(req.body));
	var activity = req.body;
	var contactKey = activity.inArguments[0].contactKey;
	var email = activity.inArguments[0].email;
	var customObjectKey = activity.inArguments[0].customObjectKey;
	var webhookUrl = activity.inArguments[0].webhookUrl;
	var interactionId = activity.journeyId;
	sfmc.getInteractionEventData(interactionId, customObjectKey, function(err, data) {
		if(err) {
			return next(err);
		}
		//logger.debug("interaction data:\n", JSON.stringify(data));	
		executeHttpRequest(webhookUrl, "POST", null, data, "json", 200, function(err, resp, body) {
			if(err) {
				return next(err);
			}
			logger.debug("webhook execute success");
			res.status(200).send("");
		});	
	});
});

router.post("/publish", function(req, res, next) {
	logger.debug("webhook:publish:", util.inspect(req.body));
	res.status(200).send("");
});

router.post("/save", function(req, res, next) {
	logger.debug("webhook:save:", util.inspect(req.body));
	res.status(200).send("");
});

router.post("/validate", function(req, res, next) {
	logger.debug("webhook:validate:", util.inspect(req.body));
	res.status(200).send("");
});

function executeHttpRequest(url, method, headers, data, dataType, expectedStatusCode, callback) {
	var defaultHeaders = {
		'User-Agent': 'sfmc-activity-webhook'
	};
	if(headers) {
		_.merge(defaultHeaders, headers);
	}
	var options = {
		url: url,
		method: method,
		headers: defaultHeaders
	};
	if(data) {
		if(dataType === 'json') {
			options.json = data;
		}
		else if (dataType === 'xml') {
			defaultHeaders['Content-Type'] = 'application/xml';
			options.body = data;
		}
		else if (dataType === 'form') {
			options.form = data;
		}
		else {
			defaultHeaders['Content-Type'] = 'text/plain';
			options.body = data;
		}
	}
	request(options, function (err, resp, body) {	
		if(!err) {
			if(resp.statusCode === expectedStatusCode) {
				callback(err, resp, body);
			}
			else {
				callback(new Error('Invalid Status Code: ' + resp.statusCode));
			}
		}
		else {
			callback(err);
		}
	});
}

module.exports = router;