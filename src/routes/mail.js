const router = require('express').Router();

var configUrl = require("../config");
var databaseService = require("../services/database");
var migService = require("../services/migration");
var mailService = require("../services/mail");
var offeringsService = require("../services/offerings");
var axios = require('axios')
var xml2js = require('xml2js').parseString;
var query1 = require("../dbQuery");
var fs = require("fs");
var process = require("process");
var path = require("path");
router.get('/', async (req, res) => {
    res.send("Mail");
});

// router.get('/managerApproval/:historyId', async function (req, res) {
//     var historyId = req.params.historyId;
//     try {
//         var getHistoryData = await offeringsService.getHistory(historyId)

//         var getBoardEmailData = await offeringsService.getBoardEmail(getHistoryData.data.moduleName)
//         var approveUrl = `${configUrl.node}/mail/approve/${historyId}`
//         var rejectUrl = `${configUrl.node}/mail/reject/${historyId}`
//         var emailData = await mailService.sendMail(approveUrl, rejectUrl, getBoardEmailData.data.boardName, getBoardEmailData.data.boardEmail);
//         if (emailData.status === 200) {
//             res.send({ status: 200, data: "Submitted Successfully" });
//         } else {
//             res.send({ status: 400, data: "Failed" });
//         }
//     } catch (error) {
//         console.log(error)
//         return error;
//     }
//     res.send("Approve");
// });

router.get('/approve/:historyId', async function (req, res) {
    var historyId = req.params.historyId;
    console.log('Approve Mail request')
    console.log('Approve Mail request params ', JSON.stringify(req.params))

    try {
        console.log('Migration started')
        var getHistoryData = await offeringsService.getHistory(historyId)
        if (getHistoryData.status === 200) {
            if (getHistoryData.data[0].status === 'Approval Pending') {
                res.send('Migration in Progress');

            } else if (getHistoryData.data[0].status === 'In Progress') {
                res.send('Migration is already in Progress');
                return;

            } else if (getHistoryData.data[0].status === 'Failed') {
                res.send('Migration failed');
                return;
            } else if (getHistoryData.data[0].status === 'Completed') {
                res.send('Migration completed already');
                return;
            }
            var migDataString = getHistoryData.data[0].taskDataJson
            var migData = JSON.parse(migDataString)
            // console.log('Approve Mail request details ', migDataString)

            var requestDetails = migData.requestDetails;
            // var offeringDetails = migData.offeringDetails;
            // var userDetails = migData.userDetails;
            console.log('Approve Mail request details  --->  ', requestDetails)

            var workbookChecked = requestDetails.workbookChecked
            var migrationChecked = requestDetails.migrationChecked
            let requestType = requestDetails.requestType;
            console.log("------------------reqdetails-------------------->", requestDetails.requestType);
            // var sourceWorkbookData, targetWorkbookData, migrationData;
            let workbookResData = [];
            let migrationResData = [];

            var query = `UPDATE history SET status = 'In Progress' WHERE requestId = ` + parseInt(historyId)
            var postHistoryData = await offeringsService.postHistory(historyId, null, query)
            console.log(postHistoryData)
            console.log("--->workbookChecked FROM json-->", workbookChecked)
            if (workbookChecked) {
                var migDataString = getHistoryData.data[0].taskDataJson
                var migData = JSON.parse(migDataString)
                // console.log('Approve Mail request details ', migDataString)

                var requestDetails = migData.requestDetails;
                var offeringDetails = migData.offeringDetails;
                var userDetails = migData.userDetails;

                var sourceWorkbookData, targetWorkbookData, migrationData;
                let workbookResData = [];
                let migrationResData = [];

                console.log('Workbook Source started ')
                sourceWorkbookData = await migService.Workbook('Source', requestDetails.sourceDetails, userDetails.email, offeringDetails.filter.name);
                console.log('Workbook Source completed ', JSON.stringify(sourceWorkbookData))
                workbookResData.push({ "source": sourceWorkbookData.data })

                console.log('Workbook Target started ')
                targetWorkbookData = await migService.Workbook('Target', requestDetails.targetDetails, userDetails.email, offeringDetails.filter.name);
                console.log('Workbook Target completed ', JSON.stringify(targetWorkbookData))
                workbookResData.push({ "target": targetWorkbookData.data })
            }

            else if (requestType === "Export") {
                var migDataString = getHistoryData.data[0].taskDataJson
                var migData = JSON.parse(migDataString)
                // console.log('Approve Mail request details ', migDataString)

                var requestDetails = migData.requestDetails;
                var offeringDetails = migData.offeringDetails;
                var userDetails = migData.userDetails;

                var migrationData;
                let migrationResData = [];

                // to do API call provided by Omkar
                let deleteFilter = await databaseService.callDatabase(query1.deleteFilterRecord);
                console.log("deletefilter: ", deleteFilter);
                // Put SOAP API here
                let SourceUrl = getHistoryData.data[0].sourceInstance;
                var urlheader = `${SourceUrl}:443/xmlpserver/services/ExternalReportWSSService?wsdl`

                console.log("Export SourceUrl Cred ssss Cred---->", SourceUrl);

                importCred = await databaseService.callDatabase(query1.getInstanceCredByURL, SourceUrl);//Import
                console.log("Export Cred ssss Cred---->", importCred);
                let importUserName = importCred[0].username;// Yogesh Start encode decode from manage intance

                let EncodedString = "Basic " + importUserName;
                console.log("Encoded string is", EncodedString);
                var data = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:pub="http://xmlns.oracle.com/oxp/service/PublicReportService">
                <soap:Header/>
                <soap:Body>
                    <pub:runReport>
                        <pub:reportRequest>
                            <pub:reportAbsolutePath>Custom/Configuration Migration Toolkit/Common/Ledger BU LE Location Relation Extract Report.xdo</pub:reportAbsolutePath>
                            <pub:sizeOfDataChunkDownload>-1</pub:sizeOfDataChunkDownload>
                        </pub:reportRequest>
                        <pub:appParam/>
                    </pub:runReport>
                </soap:Body>
                </soap:Envelope>`;
                var configData = {
                    method: 'post',
                    url: urlheader,
                    headers: {
                        'Content-Type': 'application/soap+xml; charset=UTF-8',
                        'Authorization': EncodedString,
                        'SOAPAction': 'runReport'
                    },
                    data: data
                };
                console.log("--->In migration test route-->");
                console.log("--->configData-->", configData);
                const response = await axios(configData);
                console.log("--->response-->", response);
                var filterArr = []
                xml2js(response.data, await function (err, result) {
                    var sampleText = result["env:Envelope"]["env:Body"][0]["ns2:runReportResponse"][0]["ns2:runReportReturn"][0]["ns2:reportBytes"][0]
                    console.log("--->sampleText-->", sampleText);
                    let bufferObj = Buffer.from(sampleText, "base64");
                    let decodedString = bufferObj.toString("utf8");
                    var noQuotes = decodedString.replace(/"/g, "");
                    console.log("--->Decoded-->", typeof noQuotes, noQuotes)
                    console.log("--->Result-->", result)
                    xml2js(noQuotes, async function (err, result) {
                        let array = noQuotes.split("\n").map(function (line) {
                            return line.split(",");
                        });
                        console.log("Inside decoded array ", array, array.length);
                        for (let i = 1; i < array.length - 1; i++) {
                            let insertFilter = await databaseService.callDatabase(query1.insertFilterRecord, array[i]);
                            console.log("Insertfilter: ", insertFilter)
                        }
                    });
                });
                console.log("--->filterArr-->", filterArr);

                for (let i = 0; i < offeringDetails.functionalArea.length; i++) {
                    var tasks = offeringDetails.functionalArea[i].tasks;
                    var selectedTasks = tasks.filter((ele) => ele.required === 'Y');
                    console.log(selectedTasks)

                    for (let j = 0; j < selectedTasks.length; j++) {
                        var resTaskView, dataTaskView;
                        console.log("In mail rout offeringDetails.filter.name--->", offeringDetails.filter.name);
                        console.log("In mail rout selectedTasks[j].taskId--->", selectedTasks[j].taskId);

                        resTaskView = await offeringsService.getTasksView(offeringDetails.filter.name, offeringDetails.filter.name, selectedTasks[j].taskId);
                        console.log("In mail rout resTaskView--->", resTaskView)
                        dataTaskView = resTaskView.data;
                        for (let k = 0; k < dataTaskView.length; k++) {
                            migrationData = await migService.exportMigration(requestDetails, dataTaskView[k], historyId, userDetails.email, "");
                            // if(j == selectedTasks.length-1 && i == offeringDetails.functionalArea.length-1) {
                            //     await migService.checkIdComplete(userDetails, requestDetails, offeringDetails, historyId)
                            // }
                            migrationResData.push(migrationData)
                        }
                    }
                }
            }

            else if (requestType === "Import") {
                // else if (false) {
                // let exportRequestId =req.params.exportRequestId;
                // let data1 = await databaseService.callDatabase(query.getExportProcessIds,"189");
                // console.log(data1);
                var migDataString = getHistoryData.data[0].taskDataJson
                var migData = JSON.parse(migDataString)
                // console.log('Approve Mail request details ', migDataString)

                var requestDetails = migData.requestDetails;
                var offeringDetails = migData.offeringDetails;
                var userDetails = migData.userDetails;

                var migrationData;
                let migrationResData = [];
                let targetUrl = requestDetails.targetUrl;
                importCred = await databaseService.callDatabase(query1.getInstanceCredByURL, targetUrl);//Import
                console.log("importCred", importCred);
                let importUserName = importCred[0].username;// Yogesh Start encode decode from manage intance
                let importEncodedString = "Basic " + importUserName;//147,148,158

                requestId = requestDetails.exportNumbers;
                console.log("exportNumbers", requestId)
                var dirName = "exportFiles/" + requestId;

                let fileData = fs.readdirSync(dirName);
                // backup Yogesh
                for (const file of fileData) {
                    let filename = path.basename(file);
                    let individualFile = fs.readFileSync(dirName + '/' + file);
                    const parts = filename.split("_");
                    const taskId = parts[1];

                    console.log("backup Yogesh historyId--->", historyId)

                    resTaskView = await offeringsService.getTasksView("All Ledger Values", "All Ledger Values", taskId);
                    console.log("backup Yogesh resTaskView--->", resTaskView)
                    dataTaskView = resTaskView.data;
                    for (let k = 0; k < dataTaskView.length; k++) {
                        migrationData = await migService.backupBeforeImport(requestDetails, dataTaskView[k], historyId);
                    }

                }


                for (const file of fileData) {
                    let filename = path.basename(file);
                    let individualFile = fs.readFileSync(dirName + '/' + file);
                    console.log("individualFile", individualFile);
                    var pos = filename.indexOf("_", 8); // 7
                    console.log(pos);
                    var taskcode = filename.substring(pos + 1, filename.length - 4)
                    console.log(taskcode);
                    migrationData = await migService.importMigration(historyId, requestId, targetUrl, taskcode, individualFile, importEncodedString);
                    migrationResData.push(migrationData)
                    // console.log(data);
                };
                // await migService.checkIdComplete(userDetails, requestDetails, offeringDetails, historyId, migrationChecked)
            }

            else if (requestType === "Catalog Export") {
                var migDataString = getHistoryData.data[0].taskDataJson
                var migData = JSON.parse(migDataString)
                // console.log('Approve Mail request details ', migDataString)

                var requestDetails = migData.requestDetails;
                console.log(requestDetails);

                var userDetails = migData.userDetails;
                var exportrequestId = requestDetails.exportNumbers;
                var url = requestDetails.sourceUrl;
                console.log(sessionID);
                if (sessionID == undefined) {
                    var sessionid = await migService.logon(url);
                    sessionID = sessionid;
                    console.log('From validate' + sessionID);
                } else {
                    var status = migService.checkAlive(sessionID, url);
                    if (status) {
                        await migService.keepAlive(sessionID, url);
                    } else {
                        var sessionid = await migService.logon(url);
                        sessionID = sessionid;
                        console.log('From validate' + sessionID);
                    }
                }
                console.log('after all the process: ' + sessionID);
                //code start
                var migDataString = getHistoryData.data[0].taskDataJson
                var migData = JSON.parse(migDataString)
                // console.log('Approve Mail request details ', migDataString)

                var requestDetails = migData.requestDetails;
                console.log(requestDetails);
                var catalogDetails = migData.requestDetails.catalog.items;
                var userDetails = migData.userDetails;
                var url = requestDetails.sourceUrl;
                var status = await migService.copyItem2(sessionID, url, catalogDetails, userDetails, historyId, null, true);
                console.log(status);
            }
            else if (requestType === "Catalog Import") {
                var migDataString = getHistoryData.data[0].taskDataJson
                var migData = JSON.parse(migDataString)
                // console.log('Approve Mail request details ', migDataString)

                var requestDetails = migData.requestDetails;
                console.log(requestDetails);

                var userDetails = migData.userDetails;
                var exportrequestId = requestDetails.exportNumbers;
                var url = requestDetails.targetUrl;
                console.log(sessionID);
                if (sessionID == undefined) {
                    var sessionid = await migService.logon(url);
                    sessionID = sessionid;
                    console.log('From validate' + sessionID);
                } else {
                    var status = migService.checkAlive(sessionID, url);
                    if (status) {
                        await migService.keepAlive(sessionID, url);
                    } else {
                        var sessionid = await migService.logon(url);
                        sessionID = sessionid;
                        console.log('From validate' + sessionID);
                    }
                }
                console.log('after all the process: ' + sessionID);
                //code start

                //data from export id
                var getHistoryData1 = await offeringsService.getHistory(exportrequestId);
                var migDataString1 = getHistoryData1.data[0].taskDataJson
                var migData1 = JSON.parse(migDataString1)
                var catalogDetails = migData1.requestDetails.catalog.items;
                var status = await migService.copyItem2(sessionID, url, catalogDetails, userDetails, historyId, exportrequestId, false);
                console.log(status);
                var res = await migService.pasteItem2(sessionID, url, catalogDetails, userDetails, historyId, exportrequestId);
                console.log(res);
            }
            await migService.checkIdComplete(userDetails, requestDetails, offeringDetails, historyId, migrationChecked)

            console.log('Workbook Response Data ', workbookResData)
            console.log('Migration Response Data', migrationResData)
            console.log('Migration end')
        }
    } catch (error) {
        console.log('Approve Mail error ', error)
        return error;
    }
});

router.get('/reject/:historyId', async function (req, res) {
    var historyId = req.params.historyId;
    console.log('Reject Mail request')
    console.log('Reject Mail request params ', JSON.stringify(req.params))

    try {
        var getHistoryData = await offeringsService.getHistory(historyId)
        if (getHistoryData.status === 200) {
            if (getHistoryData.data[0].status === 'Approval Pending') {
                var date = new Date();
                var query = `UPDATE history SET status = ?, completionDate = ? WHERE requestId = ?`;
                await databaseService.callDatabase(query, ['Failed', date, parseInt(historyId)])
                console.log('Reject migration ')
                res.send("Migration Rejected");
            } else {
                res.send('Migration cannot be Rejected now. It is already in Progress. Please contact Support Team');
            }
        }

    } catch (error) {
        console.log('Reject Mail error ', JSON.stringify(error))
        return error;
    }
});

router.get('/sentToBoardApproval/:historyId', async function (req, res) {
    var historyId = req.params.historyId;
    try {
        var getHistoryData = await offeringsService.getHistory(historyId)

        var approveUrl = `${configUrl.node}/mail/approve/${historyId}`
        var rejectUrl = `${configUrl.node}/mail/reject/${historyId}`

        var migDataString = getHistoryData.data[0].taskDataJson
        var migData = JSON.parse(migDataString)

        var requestDetails = migData.requestDetails;

        var filename = `${historyId}_${requestDetails.requestType}_Workbook.xls`; // changes for approval/logging

        var offeringDetails = migData.offeringDetails;
        var userDetails = migData.userDetails;
        // var emailData = await mailService.sendMail(approveUrl, rejectUrl, userData.managerName, userData.managerEmail);
        if (requestDetails.requestType === "Export") {
            var getBoardEmailData = await offeringsService.getBoardEmail(offeringDetails.module.moduleName)
            let boardEmail = getBoardEmailData.data[0].boardEmailId;
            // var emailData = await mailService.sendMail(approveUrl, rejectUrl, userData.managerName, userData.managerEmail);
            var emailBody =
                `<div>Hi,</div>
                            <br>
                            <div>A Migration has been requested with below details. Please click on the below buttons for Board Approval:</div>
                            <br>
                            <div> Request Id: ${historyId} </div>
                            <div> Request By: ${userDetails.username} </div>
                            <div> Request Name: ${requestDetails.requestName} </div>
                            <div> Request Type: ${requestDetails.requestType} </div>
                            <div> Source Instance: ${requestDetails.sourceUrl} </div>
                            <div> Offering: ${offeringDetails.offering.offeringName} </div>
                            <div> Module: ${offeringDetails.module.moduleName} </div>
                            <div> Filter Value: ${offeringDetails.filter.name} </div>
                            <div style="margin:20px">
                                <a href=${approveUrl}
                                    style="padding: 8px 12px; background-color:#228B22;color:#ffffff;text-decoration:none;display:inline-block;margin-right:20px;width:70px;text-align: center;box-shadow: 2px 2px 5px #ccc;">
                                    Approve
                                </a>
                                <a href=${rejectUrl}
                                    style="padding: 8px 12px; background-color:#ED2939;color:#ffffff;text-decoration:none;display:inline-block;margin-right:20px;width:70px;text-align: center;box-shadow: 2px 2px 5px #ccc;">
                                    Reject
                                </a>
                            </div>
                        </div>`
            var emailSubject = 'Board member Approval - Request for Configuration Migration'
            await mailService.sendMailToUser(boardEmail, emailSubject, emailBody, filename, filename);// changes for approval/logging
            res.send('Approval send for Board Approval');
        }
        if (requestDetails.requestType === "Import") {
            var updateFileNm = `${historyId}_${requestDetails.requestType}_Workbook.xls`;

            // var getBoardEmailData = await offeringsService.getBoardEmail(offeringDetails.module.moduleName)
            // let boardEmail = getBoardEmailData.data[0].boardEmailId;
            let boardEmail = "yogesh.chaure@lntinfotech.com";
            //send mail
            var emailBody =
                `<div>Hi,</div>
                    <br>
                    <div>A Migration has been requested with below details. Please click on the below buttons for Board Approval:</div>
                    <br>
                    <div> Request Id: ${historyId} </div>
                    <div> Request By: ${userDetails.username} </div>
                    <div> Request Name: ${requestDetails.requestName} </div>
                    <div> Request Type: ${requestDetails.requestType} </div>
                    <div> Destination Instance: ${requestDetails.targetUrl} </div>
                    <div style="margin:20px">
                        <a href=${approveUrl}
                            style="padding: 8px 12px; background-color:#228B22;color:#ffffff;text-decoration:none;display:inline-block;margin-right:20px;width:70px;text-align: center;box-shadow: 2px 2px 5px #ccc;">
                            Approve
                        </a>
                        <a href=${rejectUrl}
                            style="padding: 8px 12px; background-color:#ED2939;color:#ffffff;text-decoration:none;display:inline-block;margin-right:20px;width:70px;text-align: center;box-shadow: 2px 2px 5px #ccc;">
                            Reject
                        </a>
                    </div>
                </div>`
            var emailSubject = 'Board member Approval - Request for Configuration Migration'
            await mailService.sendMailToUser(boardEmail, emailSubject, emailBody, updateFileNm, updateFileNm);// changes for approval/logging
            res.send('Approval send for Board Approval');
        }
        if (requestDetails.requestType === "Catalog Export") {
            // var getBoardEmailData = await offeringsService.getBoardEmail(offeringDetails.module.moduleName)
            let boardEmail = 'Valeed.Inamdar@lntinfotech.com';
            // var emailData = await mailService.sendMail(approveUrl, rejectUrl, userData.managerName, userData.managerEmail);
            var emailBody =
                `<div>Hi,</div>
                        <br>
                        <div>A Migration has been requested with below details. Please click on the below buttons for Board Approval:</div>
                        <br>
                        <div> Request Id: ${historyId} </div>
                        <div> Request By: ${userDetails.username} </div>
                        <div> Request Name: ${requestDetails.requestName} </div>
                        <div> Request Type: ${requestDetails.requestType} </div>
                        <div> Source Instance: ${requestDetails.sourceUrl} </div>
                        <div style="margin:20px">
                            <a href=${approveUrl}
                                style="padding: 8px 12px; background-color:#228B22;color:#ffffff;text-decoration:none;display:inline-block;margin-right:20px;width:70px;text-align: center;box-shadow: 2px 2px 5px #ccc;">
                                Approve
                            </a>
                            <a href=${rejectUrl}
                                style="padding: 8px 12px; background-color:#ED2939;color:#ffffff;text-decoration:none;display:inline-block;margin-right:20px;width:70px;text-align: center;box-shadow: 2px 2px 5px #ccc;">
                                Reject
                            </a>
                        </div>
                    </div>`
            var emailSubject = 'Board member Approval - Request for Configuration Migration'
            await mailService.sendMailToUserCompare(boardEmail, emailSubject, emailBody, filename, filename);// changes for approval/logging
            res.send('Approval send for Board Approval');
        }
        if (requestDetails.requestType === "Catalog Import") {
            // var getBoardEmailData = await offeringsService.getBoardEmail(offeringDetails.module.moduleName)
            let boardEmail = 'Valeed.Inamdar@lntinfotech.com';
            // var emailData = await mailService.sendMail(approveUrl, rejectUrl, userData.managerName, userData.managerEmail);
            var emailBody =
                `<div>Hi,</div>
                        <br>
                        <div>A Migration has been requested with below details. Please click on the below buttons for Board Approval:</div>
                        <br>
                        <div> Request Id: ${historyId} </div>
                        <div> Request By: ${userDetails.username} </div>
                        <div> Request Name: ${requestDetails.requestName} </div>
                        <div> Request Type: ${requestDetails.requestType} </div>
                        <div> Source Instance: ${requestDetails.sourceUrl} </div>
                        <div style="margin:20px">
                            <a href=${approveUrl}
                                style="padding: 8px 12px; background-color:#228B22;color:#ffffff;text-decoration:none;display:inline-block;margin-right:20px;width:70px;text-align: center;box-shadow: 2px 2px 5px #ccc;">
                                Approve
                            </a>
                            <a href=${rejectUrl}
                                style="padding: 8px 12px; background-color:#ED2939;color:#ffffff;text-decoration:none;display:inline-block;margin-right:20px;width:70px;text-align: center;box-shadow: 2px 2px 5px #ccc;">
                                Reject
                            </a>
                        </div>
                    </div>`
            var emailSubject = 'Board member Approval - Request for Configuration Migration'
            await mailService.sendMailToUserCompare(boardEmail, emailSubject, emailBody, filename, filename);// changes for approval/logging
            res.send('Approval send for Board Approval');
        }
    } catch (error) {
        console.log(error)
        return error;
    }
});


module.exports = router;