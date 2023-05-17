const nodemailer = require('nodemailer');

var query = require("../dbQuery");
var config = require("../config");

var databaseService = require("./database")
var migService = require("./migration")
var mailService = require("./mail")
var offeringsService = require("./offerings")

//Login service
exports.Login = async function (username, password) {
    var checkEmail, userData;
    checkEmail = await databaseService.callDatabase(query.checkEmail, [username])
    if (checkEmail.length > 0) {
        userData = await databaseService.callDatabase(query.login, [username, password])
        if (userData.length > 0) {
            return { status: 200, data: userData[0] }
        } else {
            return { status: 201, data: "Wrong Password" }
        }
    } else {
        return { status: 400, data: "No user data" }
    }
}

exports.forgotPassword = async function (username, password) {
    var userData;
    userData = await databaseService.callDatabase(query.forgotPassword, [password, username])

    if (userData.affectedRows > 0) {
        let bufferObj = Buffer.from(password, "base64");
        let decodedString = bufferObj.toString("utf8");
        var emailSubject = 'Password Resetted for Configuration Manager';
        var emailBody =
            `<div>Hi</div>, 
            <br>
            <div>Your Configuration Manager Tool password has been resetted to <b>${decodedString}</b></div>
            <br><br>
            Replies to this email aren't monitored. Please do not reply.`
        await mailService.sendMailToUser(username, emailSubject, emailBody);
        return { status: 200, data: 'Success' }
    } else {
        return { status: 404, data: 'Failed' }
    }
}

exports.Register = async function (firstName, lastName, email, password, role, managerName, managerEmail) {
    var userData, checkEmail;
    checkEmail = await databaseService.callDatabase(query.checkEmail, [email])
    if (checkEmail.length > 0) {
        // console.log("status: 201, data: 'User already registered'")
        return { status: 201, data: 'User already registered' }
    } else {
        userData = await databaseService.callDatabase(query.register, [firstName, lastName, email, password, role, managerName, managerEmail])

        if (userData.affectedRows > 0) {
            let bufferObj = Buffer.from(code, "base64");
            let decodedString = bufferObj.toString("utf8");
            var emailSubject = 'Welcome to Configuration Manager';
            var emailBody =
                `<p>Hi ${firstName} ${lastName}, 
                <br><br>
                Welcome to Configuration Manager tool. Below are the details to access the tool
                <br><br>
                Website URL: ${config.web} 
                <br> 
                Email : ${email} 
                <br> 
                Password : ${decodedString} 
                <br><br>
                Replies to this email aren't monitored. Please do not reply.`

            await mailService.sendMailToUser(email, emailSubject, emailBody);

            // console.log("status: 200, data: 'User registered'")
            return { status: 200, data: 'User registered' }
        }
    }

}

exports.getManagerData = async function () {
    var userData;
    userData = await databaseService.callDatabase(query.managerEmail)

    if (userData.length > 0) {
        return { status: 200, data: userData }
    } else {
        return { status: 404, data: 'Failed' }
    }
}

exports.GetCred = async function (type) {
    var credData;
    credData = await databaseService.callDatabase(query.cred, [type])
    if (credData.length > 0) {
        return { status: 200, data: credData[0].token }
    } else {
        return { status: 400, data: "No data" }
    }
}







