# Axios Logger MySQL

[![npm](https://img.shields.io/npm/v/axios-logger-mysql.svg)](https://www.npmjs.com/package/axios-logger-mysql)

A [Axios](https://github.com/axios/axios) interceptor that logs all axios requests and responses to a MySQL table.

> Couldn't find one when I was working on a nodejs project so I ripped off [Yoctol's MongoDB version](https://github.com/Yoctol/axios-logger-mongo) and made one. Hope it helps :) 

## Installation

Install using npm:

```sh
npm install axios-logger-mysql
```

Run the SQL below to insert table holds the request logs
```sql 

CREATE TABLE `requestlogs` (
  `id` int(11) NOT NULL,
  `method` varchar(255) DEFAULT NULL,
  `host` varchar(255) DEFAULT NULL,
  `path` varchar(255) DEFAULT NULL,
  `requestheaders` text,
  `requestQuery` text,
  `requestBody` text,
  `responseStatus` text,
  `responseHeaders` text,
  `responseBody` text,
  `responseError` text,
  `responseTime` varchar(255) DEFAULT NULL,
  `createdAt` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
ALTER TABLE `requestlogs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `host` (`host`),
  ADD KEY `path` (`path`),
  ADD KEY `createdAt` (`createdAt`);

ALTER TABLE `requestlogs` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

  ```

## API Reference

| Param     | Type       |Description                                    |Options                                    |
| --------------------- | ---------- | -------------------------------------- | -------------------------------------- |
| host              | `String`   | MySQL connection host url.                    |
| user              | `String`   | MySQL user.                    |
| password              | `String`   | MySQL user password.                    |
| database              | `String`   | MySQL database name.                    |
| port              | `String`   | MySQL connection port.                    |
| table        | `String`   | MySQL table where the logs will be stored.                |
| excludeColumns        | `Array`   | Exclude parameters that you don't need on your logs.               |['method', 'host', 'path', 'requestheaders', 'requestQuery', 'requestBody','responseStatus', 'responseHeaders', 'responseBody', 'responseError', 'responseTime', 'createdAt',]|
| allInstances          | `Boolean`  | Support all of axios instances or not. |


## Usage

```js
const { useMysqlLogger } = require('axios-logger-mysql');

useMysqlLogger(axios, {
  host: '',
  user: '',
  password: '',
  database:'',
  table:'requestlogs',
  excludeColumns:['']
});
```

To support all of axios instances, set option `allInstances` to `true`:

```js
useMysqlLogger(axios, {
  host: '',
  user: '',
  password: '',
  database:'',
  table:'requestlogs',
  excludeColumns:['']
  allInstances: true,
});
```

## Credits
* [C. T. Lin](https://github.com/chentsulin) - The original creator of the[MongoDB version](https://github.com/Yoctol/axios-logger-mongo)
