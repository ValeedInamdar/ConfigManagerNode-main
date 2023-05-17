
var mysql = require('mysql');
var config = require("../config");


exports.callDatabase = async function (query, data) {
    var connection = mysql.createConnection(config.dbConfig);
    return new Promise((resolve, reject) => {
        connection.query(query, data, (error, result) => {
            if (error) {
                return reject(error);
            }
            return resolve(result);
        });
        connection.end()
    });
}







