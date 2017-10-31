const async = require('async');
const parseUrlencoded = require('lib/parsers/bodyparser');
const dbError = require('lib/loggers/db_error');
const config = require('config');
const redis = require('lib/redis/redis');
const logger = require('lib/loggers/logger').winston;
const pjson = require('../../../package.json');

let utils = {};

utils.post = function (Schema, newObject, request, response, next, callback) {
    let newDBObject = Schema.mapObject(null, newObject);
    Schema.validateObject(newDBObject, function (err) {
        if (err) {
            if (callback) callback(err);
            return response.status(400).json(err);
        }
        else {
            newDBObject.save(function (err) {
                if (err) {
                    if (callback) callback(err);
                    return dbError(err, request, response, next)
                }
                else {
                    response.status(201).json(newDBObject);
                    if (callback) callback(null, newDBObject);
                    let query = {_id: newDBObject.id};
                    // Delete any listings of this kind of object
                    redis.deleteCachedResult(query, Schema.modelName, function (err) {
                        if (err) {
                            return;
                        }
                        redis.setCachedResult(query, Schema.modelName, newDBObject);
                    });
                }
            })
        }
    })

};
utils.postUpdate = function (Schema, query, newObject, request, response, next) {
    for (let key in query) {
        if (query[key] === undefined) {
            delete query[key]
        }
    }
    Schema.filterQuery(request.user, function (error, filter) {
        if (error) return response.status(404).json(error);
        query = {$and: [query, filter]};
        Schema.findOne(query,
            function (err, object) {
                if (err) {
                    return dbError(err, request, response, next)
                }
                else if (object === null) {
                    return response.status(404).json({
                        localizedError: 'Object not found',
                        rawError: 'Object for ' + query + ' not found'
                    });
                }

                // TODO: Need to enable this? Filter does the trick! No?
                /*
                // If not admin, restrict to current user, if not error
                else if (request.user.admin === false && request.user._id.toString() !== object.client._id.toString()) {
                    let name = Schema.modelName;
                    response.status(403).json({
                        localizedError: 'You are not authorized to access this ' + name,
                        rawError: 'user ' + request.user._id + ' is not admin'
                    });
                }
                */
                else {
                    delete newObject.__v; // Ommit version. This is important as you cannot resave if version not equal.
                    let newDBObject = Schema.mapObject(object, newObject);
                    Schema.validateObject(newDBObject, function (err) {
                        if (err) {
                            return response.status(400).json(err);
                        }
                        else {
                            newDBObject.save(function (err) {
                                if (err) {
                                    return dbError(err, request, response, next)
                                }
                                else {
                                    response.status(200).json(newDBObject);
                                    let query = {_id: newDBObject.id};

                                    // Delete any listings of this kind of object
                                    redis.deleteCachedResult(query, Schema.modelName, function (err) {
                                        if (err) {
                                            return;
                                        }
                                        redis.setCachedResult(query, Schema.modelName, newDBObject);
                                    });
                                }
                            })
                        }
                    })
                }
            })
    });
};
utils.getAll = function (Schema, query, options, request, response, next, restrict_user = true) {
    let newObject = request.body;
    request.checkQuery('limit', 'No valid limit provided').optional().isNumeric();
    request.checkQuery('offset', 'No valid offset provided').optional().isNumeric();
    request.checkQuery('page', 'No valid page provided').optional().isNumeric();
    request.getValidationResult().then(function (result) {
        if (!result.isEmpty()) {
            response.status(400).json(result.array()[0]);
            return;
        }

        if (request.query.limit !== undefined && Number(request.query.limit) >= 0) {
            options.limit = Number(request.query.limit);
        }
        if (request.query.offset !== undefined && Number(request.query.offset) >= 0) {
            options.offset = Number(request.query.offset);
        }
        else if (request.query.page !== undefined && Number(request.query.page) >= 0) {
            options.page = Number(request.query.page);
        }
        if (options.lean === undefined) {
            options.lean = true
        }
        // Options you can pass
        // var options = {
        //   select: 'title date author',
        //   sort: { date: -1 },
        //   populate: 'author',
        //   lean: true,
        //   offset: 20,
        //   limit: 10
        // };

        for (let key in query) {
            if (query[key] === undefined) {
                delete query[key]
            }
        }
        Schema.filterQuery(request.user, function (error, filter) {
            if (error) return response.status(500).json(error);
            query = {$and: [query, filter]};
            let cacheQuery = {};
            Object.assign(cacheQuery, query);
            Object.assign(cacheQuery, options);
            redis.getCachedResults(cacheQuery, Schema.modelName + "-list", request, function (err, reply) {
                if (err) {
                    return response.status(500).json({
                        localizedError: 'There was an error at the caching system',
                        rawError: 'error: ' + err
                    });
                }
                else if (reply) {
                    response.status(200).json(reply);
                }
                else {
                    Schema.paginate(query, options, function (err, objects) {
                        if (err) return dbError(err, request, response, next);
                        response.json(objects);
                        redis.setCachedResult(cacheQuery, Schema.modelName + "-list", objects)
                    });
                }
            })
        });

    }).catch(function (err) {
        return response.status(500).json({
            localizedError: 'There was an error at the validation system',
            rawError: 'error: ' + err
        });
    });

};
utils.getOneQuery = function (Schema, query, request, response, next) {
    let name = Schema.modelName;
    request.getValidationResult().then(function (result) {
        if (!result.isEmpty()) {
            response.status(400).json(result.array()[0]);
            return;
        }
        for (const key in query) {
            if (query[key] === undefined) {
                delete query[key]
            }
        }
        Schema.filterQuery(request.user, function (error, filter) {
            // Filter query
            if (error) return response.status(404).json(error);
            query = {$and: [query, filter]};
            redis.getCachedResults(query, Schema.modelName, request, function (err, reply) {
                if (err) {
                    return response.status(500).json({
                        localizedError: 'There was an error at the caching system',
                        rawError: 'error: ' + err
                    });
                }
                else if (reply && request.method !== "DELETE") {
                    response.object = reply;
                    response.status(200);
                    return next(null, request, response, next)
                }
                else {
                    Schema.findOne(query).exec(function (err, object) {
                        if (err) return dbError(err, request, response, next);
                        if (!object) {
                            let localizedError = {
                                'localizedError': name + ' ' + query._id + ' not found',
                                'rawError': query._id + ' not found'
                            };
                            response.status(404).json(localizedError)
                        }
                        else {
                            response.object = object;
                            response.status(200);
                            next(null, request, response, next);
                            if (request.method === "DELETE") {
                                redis.deleteCachedResult(query, Schema.modelName)
                            }
                            else {
                                redis.setCachedResult(query, Schema.modelName, object)
                            }
                        }
                    });
                }
            })
        });
    }).catch(function (err) {
        return response.status(500).json({
            localizedError: 'There was an error at the validation system',
            rawError: 'error: ' + err
        });
    });
};
utils.getOne = function (Schema, request, response, next) {
    let id = request.params.id;
    let name = Schema.modelName;
    request.checkParams('id', 'No valid id of ' + name + ' provided').isObjectId();
    let query = {_id: id};
    utils.getOneQuery(Schema, query, request, response, next);
};


// Filter & Sort utils

/*
*
* // FILTER
            let transform = {
                directQuery: {
                    "vetCenter": "vetCenter",
                    "owner": "owner",
                    "statuses": "statuses.status",
                },
                textQuery: {
                    language: request.headers["Accept-Language"]
                },
                other: {
                    active: {
                        _default: true,
                        _values: {
                            "false": false,
                            "all": "_delete",
                        }
                    },
                }
            };
            let query = route_utils.filterQuery(request.query, transform);
* */


utils.filterQuery = function (requestQuery, transform, query = {}) {
    // First direct queries
    if (transform.directQuery) {
        Object.keys(transform.directQuery).forEach(function (element) {
            let queryValue = transform.directQuery[element];
            if (requestQuery[element]) {
                query[queryValue] = requestQuery[element];
                if (requestQuery[element] instanceof String && requestQuery[element].length === 0) { // if nosize, put a null for the query
                    query[queryValue] = null;
                }
            }
        });
    }

    // Then text search
    if (transform.textQuery) {
        if (requestQuery.text !== undefined) {
            query['$text'] = {'$search': requestQuery.text};
            if (transform.textQuery.language) {
                query['$text']['$language'] = transform.textQuery.language;
            }
        }
    }

    // then other transforms

    if (transform.other) {
        Object.keys(transform.other).forEach(function (element) {
            query[element] = transform.other[element]["_default"]; // default value
            let elementValue = requestQuery[element];
            if (requestQuery[element]) {
                let values = transform.other[element]["_values"]; // other values
                Object.keys(values).forEach(function (key) {
                    if (elementValue === key) {
                        let valueForKey = values[key];
                        if (valueForKey !== "_delete") { // If not delete
                            query[element] = valueForKey;
                        }
                        else {
                            delete query[element]
                        }
                    }
                })
            }
        });
    }
    return query;
};

/*
*
*   // SORT
            let options = {sort: []};
            let sortTransform = {
                _default: [["createdAt",1]],
                status: "statuses.status",
                planCreationDate: "sort.planCreationDate",
                name: "name",
                vetCenterName: "sort.vetCenterName",
            };
            options.sort = route_utils.sortQuery(request.query.sort, sortTransform, options.sort);
            route_utils.getAll(Pet,
                query,
                options,
                request, response, next)

* */
utils.sortQuery = function (requestSort,transform,sort = []) {
    if (!requestSort) { return sort } // If no sort, exit
    if (!Array.isArray(requestSort)) { requestSort = [requestSort]} // if not array, transform
    requestSort.forEach(function (sortElement) { // sort each element
        if (sortElement["field"] !== undefined) {
            let direction = 1;
            if (sortElement["order"] === "desc") { // maybe desc
                direction = -1;
            }
            let sortKey = transform[sortElement["field"]]; // add new sort key
            if (sortKey){
                let newElement = [sortKey,direction];
                sort.push(newElement);
            }
        }
    });
    if (sort.length===0){
        if (transform["_default"]){
            return transform["_default"];
        }
    }
    return sort;
};

module.exports = utils;
