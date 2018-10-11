
const { URL } = require('url');
const qs = require('querystring');
const mysql = require('mysql');
const mapKeys = require('lodash/mapKeys');
const _ = require('lodash');

const NAMESPACE = 'axios-logger-mysql';

const logRequest = () => axiosConfig => {
  axiosConfig[NAMESPACE] = Object.assign(
    { requestTimestamp: Date.now() },
    axiosConfig[NAMESPACE]
  );
  return axiosConfig;
};

function createRequestObject({
  axiosConfig,
  axiosRequest,
  transformRequestBody,
}) {
  const url = new URL(axiosConfig.url);

  const requestHeaders = {
    host: url.host,
    ...mapKeys(axiosConfig.headers, (val, key) => key.toLowerCase()),
  };

  let requestBody;

  if (
    requestHeaders['content-type'] &&
    requestHeaders['content-type'].startsWith('application/json')
  ) {
    try {
      requestBody = JSON.parse(axiosConfig.data);
    } catch (err) {
      requestBody = requestBody || null;
    }
  } else {
    requestBody = axiosConfig.data || null;
  }

  if (requestBody && typeof transformRequestBody === 'function') {
    requestBody = transformRequestBody(requestBody, {
      request: axiosRequest,
      config: axiosConfig,
    });
  }

  return {
    method: axiosRequest.method || axiosConfig.method.toUpperCase(),
    path: axiosRequest.path || url.pathname,
    headers: requestHeaders,
    query: {
      ...qs.parse(url.search.replace('?', '')),
      ...axiosConfig.params,
    },
    body: requestBody,
  };
}

function createResponseObject({ axiosResponse, transformResponseBody }) {
  let body = axiosResponse.data || null;
  if (body && typeof transformResponseBody === 'function') {
    body = transformResponseBody(body, {
      response: axiosResponse,
      config: axiosResponse.config,
    });
  }
  return {
    status: axiosResponse.status,
    statusText: axiosResponse.statusText,
    headers: axiosResponse.headers,
    body,
  };
}

function buildInsertArray(selectedColumns, insertData){
  let result = [];
  selectedColumns.forEach(key => {
    switch (key) {
      case 'method':
        result.push(insertData.request.method)
        break;
      case 'host':
        result.push(insertData.request.headers.host)
        break;
      case 'path':
        result.push(insertData.request.path)
        break;
      case 'requestheaders':
        result.push(JSON.stringify(insertData.request.headers));
        break;
      case 'requestQuery':
        result.push(JSON.stringify(insertData.request.query));
        break;
      case 'requestBody':
        result.push(JSON.stringify(insertData.request.body));
        break;
      case 'responseStatus':
        if(insertData.response){
          result.push(insertData.response.status);
        }else{
          result.push('');
        }
        break;
      case 'responseHeaders':
        if(insertData.response){
          result.push(JSON.stringify(insertData.response.headers));
        }else{
          result.push('');
        }
        break;
      case 'responseBody':
        if(insertData.response){
          result.push(JSON.stringify(insertData.response.body));
        }else{
          result.push('');
        }
        break;
      case 'responseError':
        result.push(JSON.stringify(insertData.error));
        break;
      case 'responseTime':
        result.push(insertData.time);
        break;
      case 'createdAt':
        result.push(new Date())
        break;
      
      default:
        break;
    }
  });
  return result;
}
const logResponse = (
    table, db, selectedColumns,
    { transformRequestBody, transformResponseBody } = {},
  ) => (axiosResponse) => {
    const axiosConfig = axiosResponse.config;
    const axiosRequest = axiosResponse.request;

    const { requestTimestamp } = axiosConfig[NAMESPACE];
    const responseTimestamp = Date.now();

    const request = createRequestObject({
      axiosConfig,
      axiosRequest,
      transformRequestBody,
    });
    const response = createResponseObject({
      axiosResponse,
      transformResponseBody,
    });

    const insertData = {
      request,
      response,
      error: null,
      time: responseTimestamp - requestTimestamp,
    };

    const sql = `INSERT INTO ${table} (${selectedColumns.join(",")}) VALUES ?`;
    const insertArray = buildInsertArray(selectedColumns,insertData);
    const values = [
      insertArray,
    ];
    db.query(sql, [values], function (err, result) {
      if (err) throw err;
    });
    
    return axiosResponse;
};

const logError = (table, db, selectedColumns, { transformRequestBody, transformResponseBody } = {}) => (axiosError) => {
  const axiosConfig = axiosError.config;
  const axiosRequest = axiosError.request;

  const { requestTimestamp } = axiosConfig[NAMESPACE];
  const errorTimestamp = Date.now();

  const request = createRequestObject({
    axiosConfig,
    axiosRequest,
    transformRequestBody,
  });

  const response = createResponseObject({
    axiosResponse:axiosError.response,
    transformResponseBody
  });

  const error = axiosError.message;

  const insertData = {
    request,
    response,
    error,
    time: errorTimestamp - requestTimestamp,
  };
  const sql = `INSERT INTO ${table} (${selectedColumns.join(",")}) VALUES ?`;
  const insertArray = buildInsertArray(selectedColumns, insertData);
  const values = [
    insertArray,
  ];
  db.query(sql, [values], function (err, result) {
    if (err) throw err;
  });

  return Promise.reject(axiosError);
};

function useMysqlLogger(
  axios,
  {
    host,
    user,
    password = '',
    database,
    table,
    port = 3306,
    excludeColumns = [],
    allInstances = false,
    transformRequestBody,
    transformResponseBody,
  }
) {
  const db = mysql.createConnection({
    host,
    user,
    password,
    database,
    port,
  });

  db.connect((err) => {
    if (err) {
      throw err;
    }
  });
  const tableColumns = ['method', 'host', 'path',
    'requestheaders', 'requestQuery', 'requestBody',
    'responseStatus', 'responseHeaders', 'responseBody', 'responseError', 'responseTime', 'createdAt'
  ];
  
  const selectedColumns = _.difference(tableColumns, excludeColumns);

  axios.interceptors.request.use(logRequest(table));
  axios.interceptors.response.use(
    logResponse(table, db, selectedColumns, { transformRequestBody, transformResponseBody }),
    logError(table, db, selectedColumns, { transformRequestBody, transformResponseBody })
  );

  if (allInstances && axios.create) {
    const axiosCreate = axios.create.bind(axios);

    axios.create = (...args) => {
      const instance = axiosCreate(...args);

      useMysqlLogger(instance, {
        host,
        user,
        password,
        database,
        table,
        transformRequestBody,
        transformResponseBody,
      });

      return instance;
    };
  }
}

module.exports = {
  useMysqlLogger,
};
