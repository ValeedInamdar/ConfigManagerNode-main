
var nodemailer = require('nodemailer')
var config = require("../config");

exports.sendMailToUser = async function (emailId, emailSubject, emailBody, fileName, file) {// changes for approval/logging
  console.log("Email triggered for ", emailId)

  var transporter = nodemailer.createTransport(config.mailDetails);

  let mailDetails = {
    from: config.mailDetails.user,
    to: emailId,
    cc: config.email,
    subject: emailSubject,
    html: emailBody,
    attachments: [// changes for approval/logging
      {
          filename: file,
          path: './workbooks/'+fileName
      }
  ]
  };

  try {
    await transporter.sendMail(mailDetails);
    console.log("Email sent successfully")
    return { status: 200, data: 'Email sent succesfully' }
  } catch (err) {
    console.log('Error Occurs ', err);
    return { status: 500, data: err }
  }
}

exports.sendMailToUserCompare = async function (emailId, emailSubject, emailBody) {// changes for approval/logging
  console.log("Email triggered for ", emailId)

  var transporter = nodemailer.createTransport(config.mailDetails);

  let mailDetails = {
    from: config.mailDetails.user,
    to: emailId,
    cc: config.email,
    subject: emailSubject,
    html: emailBody
  };

  try {
    await transporter.sendMail(mailDetails);
    console.log("Email sent successfully")
    return { status: 200, data: 'Email sent succesfully' }
  } catch (err) {
    console.log('Error Occurs ', err);
    return { status: 500, data: err }
  }
}
