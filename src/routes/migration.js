const router = require('express').Router();
var fs = require("fs");
var configUrl = require("../config");
var query = require("../dbQuery");
var authService = require("../services/auth");
var databaseService = require("../services/database");
var migService = require("../services/migration");
var mailService = require("../services/mail");
var offeringsService = require("../services/offerings");
var workbookServices = require("../services/workbook");
var base64 = require('file-base64');
const { url } = require('inspector');

router.get('/', (req, res) => {
    res.send('Manage User Actions');
});

//#region - Offering 
router.get('/Offerings', async function (req, res) {
    var data;
    console.log('Get Offerings request')
    data = await offeringsService.getOfferings()
    console.log('Get Offerings response ', JSON.stringify(data))
    res.send(data)
});

router.get('/Modules/:offeringId', async function (req, res) {
    var offeringId = req.params.offeringId;
    console.log('Get Modules request')
    console.log('Get Modules request params ', JSON.stringify(req.params))
    var data;
    data = await offeringsService.getModules(offeringId)
    console.log('Get Modules response ', JSON.stringify(data))
    res.send(data)
});

router.get('/FunctionalArea/:moduleId/:offeringId', async function (req, res) {//Yogesh AHCS start
    var moduleId = req.params.moduleId;
    var offeringId = req.params.offeringId;
    console.log('Get Functional Area request', moduleId)
    console.log('Get Functional Area request', offeringId)
    console.log('Get Functional Area request params ', JSON.stringify(req.params))
    var data;
    data = await offeringsService.getFunctionalArea(moduleId, offeringId); //end
    console.log('Get Functional Area response ', JSON.stringify(data))

    res.send(data)
});

router.get('/Tasks/:moduleId', async function (req, res) {
    var moduleId = req.params.moduleId;
    console.log('Get Tasks request')
    console.log('Get Tasks request params ', JSON.stringify(req.params))
    var data;
    data = await offeringsService.getTasks(moduleId)
    console.log('Get Tasks response ', JSON.stringify(data))
    res.send(data)
});

router.get('/FilterValue/:moduleName/:sourceUrl', async function (req, res) {
    var filter = req.params.moduleName;
    var sourceUrl = req.params.sourceUrl;
    console.log('Get Filter request')
    console.log('Get Filter request params ', JSON.stringify(req.params))
    var data = await offeringsService.getFilter(filter, sourceUrl)
    console.log('Get Filter response ', JSON.stringify(data))
    res.send(data)
});

router.post('/FilterValueNew', async function (req, res) { //// DynamicYog
    var filter = req.body.moduleName;
    var sourceUrl = req.body.sourceUrl;
    console.log('Get Filter request')
    console.log('Get Filter request params ', sourceUrl)
    var data = await offeringsService.getFilter(filter, sourceUrl)
    // console.log('Get Filter response ', JSON.stringify(data))
    res.send(data)
});

//#endregion

//#region -Instance details
router.get('/getInstanceDetails', async function (req, res) {
    console.log('Get Instance Details request')
    var data = await offeringsService.getInstanceDetails();
    console.log('Get Instance Details response ', JSON.stringify(data));
    res.send(data)
});


router.post('/createInstance', async function (req, res) {
    var instanceName = req.body.instanceName;
    var instanceUrl = req.body.instanceUrl;
    var instanceType = req.body.instanceType;
    var environmentType = req.body.environmentType;
    var username = req.body.username;
    var password = req.body.password;

    console.log('Create Instance request')
    console.log('Create Instance request body ', JSON.stringify(req.body))
    var data = await offeringsService.newInstance(instanceName, instanceUrl, instanceType, environmentType, username, password);
    console.log('Create Instance response ', JSON.stringify(data))

    res.send(data)
});

router.post('/editInstance', async function (req, res) {

    var ID = req.body.Id;
    var Itype = req.body.Itype;
    var environmentType = req.body.environmentType;
    var name = req.body.name;
    var password = req.body.password;
    var instanceUrl = req.body.instanceUrl;
    var username = req.body.username;

    console.log('Edit Instance request')
    console.log('Edit Instance request body ', JSON.stringify(req.body))

    var data = await offeringsService.editInstance(ID, Itype, environmentType, name, password, instanceUrl, username);
    console.log('Edit Instance response ', JSON.stringify(data))

    res.send(data)
});

router.post('/deleteInstance', async function (req, res) {

    var ID = req.body.Id;

    var data = await offeringsService.deleteInstance(ID);
    res.send(data)
});
//#endregion

//#region - history
router.get('/getHistory/:historyId', async function (req, res) {
    var historyId = req.params.historyId;
    console.log('Get History request')
    console.log('Get History request params ', JSON.stringify(req.params))
    var data = await offeringsService.getHistory(historyId)
    // console.log('Get History response ', JSON.stringify(data))

    res.send(data)
});


router.get('/getExport/:exportId', async function (req, res) {
    var exportId = req.params.exportId;
    var data = await offeringsService.getExportDetails(exportId)
    res.send(data)
});

router.get('/statistics', async function (req, res) {
    var data, tableData, completedData, failedData, activeData;
    console.log('Get Statistics request')

    data = await offeringsService.getHistory('all');
    if (data.status === 200) {
        tableData = data.data
        completedData = tableData.filter(obj => obj.status == "Completed");
        failedData = tableData.filter(obj => obj.status == "Failed");
        activeData = tableData.filter(obj => (obj.status == "In Progress" || obj.status == "Approval Pending"));
    } else {
        tableData = [];
        completedData = [];
        failedData = [];
        activeData = [];
    }

    var data = [
        { count: tableData.length, label: 'All Executions' },
        { count: completedData.length, label: 'Completed Executions' },
        { count: activeData.length, label: 'Active Executions' },
        { count: failedData.length, label: 'Failed Executions' },
    ];
    console.log('Get Statistics response ', JSON.stringify(data))

    res.send({ status: 200, data: data });
});


router.get('/refresh', async function (req, res) {
    var resData;
    var resDataHistory = await offeringsService.getHistory('all');
    if (resDataHistory.status === 200) {
        var dataHistory = resDataHistory.data;
        dataHistory = dataHistory.filter(obj => (obj.status == "In Progress"));
        console.log("-->refresh dataHistory.length -->", dataHistory.length);

        if (dataHistory.length > 0) {
            for (let i = 0; i < dataHistory.length; i++) {
                var query1 = `SELECT count(*) FROM export_process_id where (exportStatus = 'In progress' || importStatus = 'In progress') and requestId = ?`;

                let inProgressCount = await databaseService.callDatabase(
                    query1,
                    dataHistory[i].requestId
                );

                if (inProgressCount === 0) {
                    var date = new Date();
                    var query = `UPDATE history SET status = ?, completionDate = ? WHERE requestId = ?`;
                    await databaseService.callDatabase(query, [
                        "Completed",
                        date,
                        parseInt(dataHistory[i].requestId),
                    ]);
                }
            }
        }


    }
    resData = await offeringsService.getHistory('all');
    res.send({ status: 200, data: resData.data });
});
//#endregion

//#region - Submit Migration 

router.post('/submit', async function (req, res) {
    var migData = req.body;
    console.log("migData:", migData);
    var requestDetails = req.body.requestDetails;
    var offeringDetails = req.body.offeringDetails;
    var userDetails = req.body.userDetails;

    let data = await databaseService.callDatabase(query.managerEmail, [userDetails.email])
    if (data.length > 0) {
        console.log(data)
    } else {
        console.log("error")
    }
    console.log('Submit Migration request')
    // console.log('Submit Migration request body ', JSON.stringify(req.body))

    try {
        if (requestDetails.requestType === "Export") {
            var historyData = {
                "requestName": requestDetails.requestName,
                "requestType": requestDetails.requestType,
                "sourceInstance": requestDetails.sourceUrl,
                "destinationInstance": requestDetails.targetUrl,
                "module": offeringDetails.module.moduleName,
                "filterCriteria": offeringDetails.filter.name,
                "status": 'Approval Pending',
                "submissionDate": new Date(),
                "completionDate": null,
                "createdBy": userDetails.email,
                "taskDataJson": JSON.stringify(migData),
            }
            var getBoardEmailData = await offeringsService.getBoardEmail(offeringDetails.module.moduleName)
            let boardEmail = getBoardEmailData.data[0].boardEmailId;
            var postHistoryData = await offeringsService.postHistory(null, historyData, null)
            // console.log(postHistoryData.data.id)
            if (postHistoryData.status === 200) {
                var approveUrl, emailSubject, senderEmail;
                if (userDetails.role === 'Consultant') {
                    approveUrl = `${configUrl.node}/mail/sentToBoardApproval/${postHistoryData.data.id}`;
                    emailSubject = 'Manager Approval - Request for Configuration Migration';
                    senderEmail = data[0].managerEmail;
                } else {
                    approveUrl = `${configUrl.node}/mail/approve/${postHistoryData.data.id}`;
                    emailSubject = 'Board Approval - Request for Configuration Migration';
                    senderEmail = boardEmail
                }

                // changes for approval/logging start
                console.log(approveUrl, emailSubject, senderEmail);

                // Logic to get Workbook file 
                var filename = `${postHistoryData.data.id}_${requestDetails.requestType}_Workbook.xls`;

                var filterNm = `${offeringDetails.filter.name}`;
                let selectedTaskArray = [];
                let selectedTaskString;
                var base64String;
                // Filtering Selected comma seperated task from taskDataJson
                for (let i = 0; i < offeringDetails.functionalArea.length; i++) {
                    var tasks = offeringDetails.functionalArea[i].tasks;
                    var selectedTasks = tasks.filter((ele) => ele.required === "Y");
                    for (let j = 0; j < selectedTasks.length; j++) {
                        selectedTaskArray.push(selectedTasks[j].biTaskCode);
                    }
                }

                selectedTaskString = selectedTaskArray.toString();
                base64String = await workbookServices.getWorkbookExcel(`${requestDetails.sourceUrl}`, filterNm, selectedTaskString)

                base64.encode('text.xls', function (err, base64String) {

                });
                base64.decode(
                    base64String.data,
                    "./workbooks/" + filename,
                    function (err, output) {
                    }
                );// changes for approval/logging end


                //send mail
                var approveUrl = approveUrl
                var rejectUrl = `${configUrl.node}/mail/reject/${postHistoryData.data.id}`
                var emailBody =
                    `<div>Hi,</div>
                        <br>
                        <div>A Migration has been requested with below details. Please click on the below buttons to take necessary actions:</div>
                        <br>
                        <div> Request Id: ${postHistoryData.data.id} </div>
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
                var emailData = await mailService.sendMailToUser(senderEmail, emailSubject, emailBody, filename, filename); // changes for approval/logging                
                if (emailData.status === 200) {
                    res.send({ status: 200, data: "Submitted Successfully" });
                } else {
                    res.send({ status: 400, data: "Failed" });
                }
            } else {
                res.send({ status: 400, data: "Failed" });
            }
        }
        if (requestDetails.requestType === "Import") {
            let exportDet = await databaseService.callDatabase(query.getSpecificHistory, requestDetails.exportNumbers);
            console.log("exportDet===>", exportDet[0].taskDataJson)
            var migDataStringExp = exportDet[0].taskDataJson

            var historyData = {
                "requestName": requestDetails.requestName,
                "requestType": requestDetails.requestType,
                "sourceInstance": exportDet[0].sourceInstance,
                "destinationInstance": requestDetails.targetUrl,
                "module": exportDet[0].module,
                "filterCriteria": exportDet[0].filterCriteria,
                "status": 'Approval Pending',
                "submissionDate": new Date(),
                "completionDate": null,
                "createdBy": userDetails.email,
                "taskDataJson": JSON.stringify(migData),
                "exportNumbers": requestDetails.exportNumbers,
            }

            var migDataExp = JSON.parse(migDataStringExp)

            var offeringDetailsExp = migDataExp.offeringDetails;

            let selectedTaskArray = [];
            let selectedTaskString;
            var base64String;

            // let boardEmail = "yogesh.chaure@lntinfotech.com";
            var postHistoryData = await offeringsService.postHistory(null, historyData, null)

            var getBoardEmailData = await offeringsService.getBoardEmail(historyData.module)
            let boardEmail = getBoardEmailData.data[0].boardEmailId;
            if (postHistoryData.status === 200) {
                var approveUrl, emailSubject, senderEmail;
                if (userDetails.role === 'Consultant') {
                    approveUrl = `${configUrl.node}/mail/sentToBoardApproval/${postHistoryData.data.id}`;
                    emailSubject = 'Manager Approval - Request for Configuration Migration';
                    senderEmail = data[0].managerEmail;
                } else {
                    approveUrl = `${configUrl.node}/mail/approve/${postHistoryData.data.id}`;
                    emailSubject = 'Board Approval - Request for Configuration Migration';
                    senderEmail = boardEmail
                }

                // changes for approval/logging start

                // Logic to get Workbook file 

                var updateFileNm = `${postHistoryData.data.id}_${requestDetails.requestType}_Workbook.xls`;
                var filterNm = `${offeringDetailsExp.filter.name}`;

                // Filtering Selected comma seperated task from taskDataJson
                for (let i = 0; i < offeringDetailsExp.functionalArea.length; i++) {
                    var tasks = offeringDetailsExp.functionalArea[i].tasks;
                    var selectedTasks = tasks.filter((ele) => ele.required === "Y");
                    for (let j = 0; j < selectedTasks.length; j++) {
                        selectedTaskArray.push(selectedTasks[j].biTaskCode);
                    }
                }

                selectedTaskString = selectedTaskArray.toString();
                console.log("selectedTaskString list in import---->", selectedTaskString)

                base64String = await workbookServices.getWorkbookExcel(`${requestDetails.targetUrl}`, filterNm, selectedTaskString)
                base64.encode(`${updateFileNm}.xls`, function (err, base64String) {

                });
                base64.decode(
                    base64String.data,
                    "./workbooks/" + updateFileNm,
                    function (err, output) {
                    }
                );// changes for approval/logging end

                //send mail
                var approveUrl = approveUrl
                var rejectUrl = `${configUrl.node}/mail/reject/${postHistoryData.data.id}`
                var emailBody =
                    `<div>Hi,</div>
                        <br>
                        <div>A Migration has been requested with below details. Please click on the below buttons to take necessary actions:</div>
                        <br>
                        <div> Request Id: ${postHistoryData.data.id} </div>
                        <div> Request By: ${userDetails.username} </div>
                        <div> Request Name: ${requestDetails.requestName} </div>
                        <div> Request Type: ${requestDetails.requestType} </div>
                        <div> Destination Instance: ${exportDet[0].sourceInstance} </div>
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
                var emailData = await mailService.sendMailToUser(senderEmail, emailSubject, emailBody, updateFileNm, updateFileNm);// changes for approval/logging                
                if (emailData.status === 200) {
                    res.send({ status: 200, data: "Submitted Successfully" });
                } else {
                    res.send({ status: 400, data: "Failed" });
                }
            } else {
                res.send({ status: 400, data: "Failed" });
            }
        }
        if (requestDetails.requestType === "Compare") {
            var historyData = {
                "requestName": requestDetails.requestName,
                "requestType": requestDetails.requestType,
                "sourceInstance": requestDetails.sourceUrl,
                "destinationInstance": requestDetails.targetUrl,
                "module": offeringDetails.module.moduleName,
                "filterCriteria": offeringDetails.filter.name,
                "status": 'Approval Pending',
                "submissionDate": new Date(),
                "completionDate": null,
                "createdBy": userDetails.email,
                "taskDataJson": JSON.stringify(migData),
            }
            var reqID;
            var getBoardEmailData = await offeringsService.getBoardEmail(offeringDetails.module.moduleName)
            let boardEmail = getBoardEmailData.data[0].boardEmailId;
            var postHistoryData = await offeringsService.postHistory(null, historyData, null)
            // console.log(postHistoryData.data.id)
            if (postHistoryData.status === 200) {
                var approveUrl, emailSubject, senderEmail;
                if (userDetails.role === 'Consultant') {
                    approveUrl = `${configUrl.node}/mail/sentToBoardApproval/${postHistoryData.data.id}`;
                    emailSubject = 'Manager Approval - Request for Configuration Migration';
                    senderEmail = data[0].managerEmail;
                } else {
                    approveUrl = `${configUrl.node}/mail/approve/${postHistoryData.data.id}`;
                    emailSubject = 'Board Approval - Request for Configuration Migration';
                    senderEmail = boardEmail
                }
                reqID = postHistoryData.data.id;
                // changes for approval/logging start
                console.log(approveUrl, emailSubject, senderEmail);

                // Logic to get Workbook file 
                var filename_source = `${reqID}_source_${requestDetails.requestType}_Workbook.xls`;
                var filename_target = `${reqID}_target_${requestDetails.requestType}_Workbook.xls`;
                var filename = `${reqID}_summary_Diff_Workbook.xls`;

                var filterNm = `${offeringDetails.filter.name}`;
                let selectedTaskArray = [];
                let selectedTaskString;
                var base64Stringsource;
                var base64Stringtarget;
                // Filtering Selected comma seperated task from taskDataJson
                for (let i = 0; i < offeringDetails.functionalArea.length; i++) {
                    var tasks = offeringDetails.functionalArea[i].tasks;
                    var selectedTasks = tasks.filter((ele) => ele.required === "Y");
                    for (let j = 0; j < selectedTasks.length; j++) {
                        selectedTaskArray.push(selectedTasks[j].biTaskCode);
                    }
                }


                selectedTaskString = selectedTaskArray.toString();

                if (!fs.existsSync("compare/" + reqID)) {
                    fs.mkdirSync("compare/" + reqID);
                }
                if (!fs.existsSync("compare/" + reqID + "/source")) {
                    fs.mkdirSync("compare/" + reqID + "/source");
                }
                if (!fs.existsSync("compare/" + reqID + "/target")) {
                    fs.mkdirSync("compare/" + reqID + "/target");
                }

                base64Stringsource = await workbookServices.getWorkbookExcel(`${requestDetails.sourceUrl}`, filterNm, selectedTaskString)

                base64.encode(`${filename_source}.xls`, function (err, base64Stringsource) {
                });
                base64.decode(base64Stringsource.data, "compare/" + reqID + "/source/" + filename_source,
                    function (err, output) {
                    }
                );// changes for approval/logging end

                base64Stringtarget = await workbookServices.getWorkbookExcel(`${requestDetails.targetUrl}`, filterNm, selectedTaskString)

                base64.encode(`${filename_target}.xls`, function (err, base64Stringtarget) {

                });
                base64.decode(base64Stringtarget.data, "compare/" + reqID + "/target/" + filename_target,
                    function (err, output) {
                    }
                );// changes for approval/logging end

                //send mail
                var approveUrl = approveUrl
                var rejectUrl = `${configUrl.node}/mail/reject/${postHistoryData.data.id}`
                var emailBody =
                    `<div>Hi,</div>
                        <br>
                        <div>A Migration has been requested with below details. Please click on the below buttons to take necessary actions:</div>
                        <br>
                        <div> Request Id: ${postHistoryData.data.id} </div>
                        <div> Request By: ${userDetails.username} </div>
                        <div> Request Name: ${requestDetails.requestName} </div>
                        <div> Request Type: ${requestDetails.requestType} </div>
                        <div> Source Instance: ${requestDetails.sourceUrl} </div>
                        <div> Destination Instance: ${requestDetails.targetUrl} </div>
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
                var emailData = await mailService.sendMailToUserCompare(senderEmail, emailSubject, emailBody); // changes for approval/logging                
                if (emailData.status === 200) {
                    res.send({ status: 200, data: "Submitted Successfully" });
                } else {
                    res.send({ status: 400, data: "Failed" });
                }
            } else {
                res.send({ status: 400, data: "Failed" });
            }
        }
        if (requestDetails.requestType === "Catalog Export") {
            var historyData = {
                "requestName": requestDetails.requestName,
                "requestType": requestDetails.requestType,
                "sourceInstance": requestDetails.sourceUrl,
                "destinationInstance": requestDetails.targetUrl,
                "module": null,
                "filterCriteria": null,
                "status": 'Approval Pending',
                "submissionDate": new Date(),
                "completionDate": null,
                "createdBy": userDetails.email,
                "taskDataJson": JSON.stringify(migData),
            }
            let boardEmail = 'Valeed.Inamdar@lntinfotech.com'
            var postHistoryData = await offeringsService.postHistory(null, historyData, null)
            // console.log(postHistoryData.data.id)
            if (postHistoryData.status === 200) {
                var approveUrl, emailSubject, senderEmail;
                if (!userDetails.role === 'Consultant') {
                    approveUrl = `${configUrl.node}/mail/sentToBoardApproval/${postHistoryData.data.id}`;
                    emailSubject = 'Manager Approval - Request for Configuration Migration';
                    senderEmail = data[0].managerEmail;
                } else {
                    approveUrl = `${configUrl.node}/mail/approve/${postHistoryData.data.id}`;
                    emailSubject = 'Board Approval - Request for Configuration Migration';
                    senderEmail = boardEmail
                }

                // changes for approval/logging start
                console.log(approveUrl, emailSubject, senderEmail);
                //send mail
                var approveUrl = approveUrl
                var rejectUrl = `${configUrl.node}/mail/reject/${postHistoryData.data.id}`
                var emailBody =
                    `<div>Hi,</div>
                        <br>
                        <div>A Migration has been requested with below details. Please click on the below buttons to take necessary actions:</div>
                        <br>
                        <div> Request Id: ${postHistoryData.data.id} </div>
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
                var emailData = await mailService.sendMailToUserCompare(senderEmail, emailSubject, emailBody, filename, filename); // changes for approval/logging                
                if (emailData.status === 200) {
                    res.send({ status: 200, data: "Submitted Successfully" });
                } else {
                    res.send({ status: 400, data: "Failed" });
                }
            } else {
                res.send({ status: 400, data: "Failed" });
            }
        }
        if (requestDetails.requestType === "Catalog Import") {
            var historyData = {
                "requestName": requestDetails.requestName,
                "requestType": requestDetails.requestType,
                "sourceInstance": requestDetails.sourceUrl,
                "destinationInstance": requestDetails.targetUrl,
                "module": null,
                "filterCriteria": null,
                "status": 'Approval Pending',
                "submissionDate": new Date(),
                "completionDate": null,
                "createdBy": userDetails.email,
                "taskDataJson": JSON.stringify(migData),
            }
            let boardEmail = 'Valeed.Inamdar@lntinfotech.com'
            var postHistoryData = await offeringsService.postHistory(null, historyData, null)
            // console.log(postHistoryData.data.id)
            if (postHistoryData.status === 200) {
                var approveUrl, emailSubject, senderEmail;
                if (!userDetails.role === 'Consultant') {
                    approveUrl = `${configUrl.node}/mail/sentToBoardApproval/${postHistoryData.data.id}`;
                    emailSubject = 'Manager Approval - Request for Configuration Migration';
                    senderEmail = data[0].managerEmail;
                } else {
                    approveUrl = `${configUrl.node}/mail/approve/${postHistoryData.data.id}`;
                    emailSubject = 'Board Approval - Request for Configuration Migration';
                    senderEmail = boardEmail
                }

                // changes for approval/logging start
                console.log(approveUrl, emailSubject, senderEmail);
                //send mail
                var approveUrl = approveUrl
                var rejectUrl = `${configUrl.node}/mail/reject/${postHistoryData.data.id}`
                var emailBody =
                    `<div>Hi,</div>
                        <br>
                        <div>A Migration has been requested with below details. Please click on the below buttons to take necessary actions:</div>
                        <br>
                        <div> Request Id: ${postHistoryData.data.id} </div>
                        <div> Request By: ${userDetails.username} </div>
                        <div> Request Name: ${requestDetails.requestName} </div>
                        <div> Request Type: ${requestDetails.requestType} </div>
                        <div> Source Instance: ${requestDetails.targetUrl} </div>
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
                var emailData = await mailService.sendMailToUserCompare(senderEmail, emailSubject, emailBody, filename, filename); // changes for approval/logging                
                if (emailData.status === 200) {
                    res.send({ status: 200, data: "Submitted Successfully" });
                } else {
                    res.send({ status: 400, data: "Failed" });
                }
            } else {
                res.send({ status: 400, data: "Failed" });
            }
        }

    } catch (error) {
        console.log('Submit Migration error ', JSON.stringify(error), error)
        return error;
    }
});
//validate  
global.sessionID = undefined;

router.post('/getValidCatalog', async function (req, res) {
    console.log(req.body.SourceURL);
    var url = req.body.SourceURL;
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
    console.log('from catalog data' + req.body.catalogData);
    data = req.body.catalogData;
    validated = await migService.getItemInfo(sessionID, data,url)
    res.send({ status: "200", data: validated });

});


router.post('/getExportRequests', async function (req, res) {
    let createdBy = req.body.createdBy;
    // let data = await databaseService.callDatabase(query.getExportComplete, "admin.user@lntinfotech.com");
    // Uncomment this for execution
    let data = await databaseService.callDatabase(query.getExportComplete, createdBy);
    // console.log("------------------data------------>", data)
    res.send({ status: "200", data: data });
});

router.post('/getInstanceByType', async function (req, res) {
    let instanceType = req.body.instanceType;
    let data = await databaseService.callDatabase(query.getInstanceByType, "ERP/SCM/PPM/HCM/CRM/");
    // console.log("------------------data------------>", data)
    let data1 = await databaseService.callDatabase(query.getExportProcessIds, "189");
    console.log(data1);
    let arr = new Array;
    for (i = 0; i < data1.length; i++)
        arr[i] = data1[i].exportProcessId;
    console.log(arr, arr.length);
    res.send({ status: "200", data: data })
});


//#endregion

module.exports = router;