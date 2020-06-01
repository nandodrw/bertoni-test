const http = require('http');
const crypto = require('crypto');

/******** CONSTANTS *********/

const ALLOWED_POST_ROUTES = [
  {
    route: 'hashcalc',
    controller: hashController
  },
];

const ALLOWED_GET_REQUESTS = [
  {
    route: 'stast',
    controller: statsController
  },
];


/******** DATABASE *******/

const IN_MEMORY_DATABASE = new Map();


function storeStats(host, payloadSize, processingTime) {
  if (IN_MEMORY_DATABASE.has(host)) {
    let currentStats = IN_MEMORY_DATABASE.get(host)

    IN_MEMORY_DATABASE.set(host, {
      active: currentStats.active + 1,
      max_payload: payloadSize > currentStats.max_payload ? payloadSize : currentStats.max_payload,
      average_payload: ((currentStats.average_payload * currentStats.active) + payloadSize) / (currentStats.active + 1),
      average_time_per_mb: ((currentStats.average_time_per_mb * currentStats.active) + ((payloadSize / (1024 * 1024)) / processingTime)) / (currentStats.active + 1)
    });

  } else {

    IN_MEMORY_DATABASE.set(host, {
      active: 1,
      max_payload: payloadSize,
      average_payload: payloadSize,
      average_time_per_mb: (payloadSize / (1024 * 1024)) / processingTime
    });

  }
}


/******** CONTROLLERS *******/

/** handle STATS */
function statsController(req, res, reqUrl) {
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(200);
  res.write(JSON.stringify({
    host: req.headers.host,
    stats: IN_MEMORY_DATABASE.has(req.headers.host) ? IN_MEMORY_DATABASE.get(req.headers.host) : {}
  }));
  res.end();
}

/** handle MD5 hashing */
function hashController(req, res, reqUrl) {
  req.setEncoding('utf8');
  res.setHeader('Content-Type', 'application/json');

  const hash = crypto.createHash('md5');
  let payloadSize = 0;
  var timeStart = process.hrtime();

  req.on('data', (chunk) => {
    hash.update(chunk);
    payloadSize += Buffer.byteLength(chunk);
  });

  req.on('end', () => {
    const processingTime = process.hrtime(timeStart)[1] / 1000000
    storeStats(req.headers.host, payloadSize, processingTime)

    res.writeHead(200);
    res.write(JSON.stringify({
      host: req.headers.host,
      hash: hash.digest('hex'),
      time: processingTime,
      size: payloadSize
    }));
    res.end();
  });

}

/** if there is no related function which handles the request, then show error message */
function notFound(req, res) {
  res.writeHead(404);
  res.write('Not found');
  res.end();
}


/******** BOILERPLATE AND SERVER INITIALIZATION *******/

http.createServer((req, res) => {

  // create router to redirect to controller functions
  const router = {
    ...(
      () => ALLOWED_POST_ROUTES.reduce((prev, endpoint) => {
        prev[`POST/${endpoint.route}`] = endpoint.controller;
        return prev;
      }, {})
    )(),

    ...(
      () => ALLOWED_GET_REQUESTS.reduce((prev, endpoint) => {
        prev[`GET/${endpoint.route}`] = endpoint.controller;
        return prev;
      }, {})
    )(),

    'default': notFound
  };


  // parse the url by using WHATWG URL API
  let reqUrl = new URL(req.url, 'http://127.0.0.1/');
  let controller = router[req.method + reqUrl.pathname] || router['default'];
  controller(req, res, reqUrl);

}).listen(8080, () => {
  console.log('Server is running at http://127.0.0.1:8080/');
});