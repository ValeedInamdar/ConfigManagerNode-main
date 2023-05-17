
var axios = require('axios')
var nodemailer = require('nodemailer')
var soapRequest = require('easy-soap-request');
var xml2js = require('xml2js').parseString;
var fs = require('fs');
const fsa = require('fs-extra');
var config = require("../config");
var query = require("../dbQuery");
var calQquery = require("../dbQuery");
var authService = require("./auth")
var databaseService = require("./database")
const { parseStringPromise } = require('xml2js');
var mailService = require("./mail")
var offeringsService = require("./offerings");
const { patch } = require('../routes/migration');
var base64 = require('file-base64');

exports.getFilterValues = async function (filterCode, sourceUrl) {// DynamicYog

  exportCred = await databaseService.callDatabase(calQquery.getInstanceCredByURL, sourceUrl);//// DynamicYog
  let UserName = exportCred[0].username;
  let EncodedString = "Basic " + UserName;//139 144

  console.log(EncodedString);
  //LE, LEDGER, BU
  var filter;
  if (filterCode === 'General Ledger') {
    filter = 'LEDGER';
  } else if (filterCode === 'PER_LOCATION') {
    filter = 'LOC';
  } else if (filterCode === 'FUN_BUSINESS_UNIT') {
    filter = 'BU';
  } else if (filterCode === 'Accounting Hub') {
    filter = 'SUBLEDGERAPP';
  }
  try {
    var data = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:pub="http://xmlns.oracle.com/oxp/service/PublicReportService">
    <soap:Header/>
    <soap:Body>
        <pub:runReport>
            <pub:reportRequest>
                <pub:parameterNameValues>
                    <pub:item>
                        <pub:name>p_type</pub:name>
                        <pub:values>
                          <pub:item>${filter}</pub:item>
                        </pub:values>
                    </pub:item>
                </pub:parameterNameValues>
                <pub:reportAbsolutePath>/Custom/Configuration Migration Toolkit/Common/Ledger BU LE Extract Report.xdo</pub:reportAbsolutePath>
                <pub:sizeOfDataChunkDownload>-1</pub:sizeOfDataChunkDownload>
            </pub:reportRequest>
            <pub:appParam/>
        </pub:runReport>
    </soap:Body>
</soap:Envelope>`;
    var configData = {
      method: 'post',
      url: `${sourceUrl}:443/xmlpserver/services/ExternalReportWSSService?wsdl`,// DynamicYog
      headers: {
        'Content-Type': 'application/soap+xml; charset=UTF-8',
        'Authorization': EncodedString,// DynamicYog
        'SOAPAction': 'runReport'
      },
      data: data
    };
    console.log("--->configData-->", configData);
    const response = await axios(configData);
    console.log("--->response-->", response);
    var filterArr = []
    xml2js(response.data, await function (err, result) {
      var sampleText = result["env:Envelope"]["env:Body"][0]["ns2:runReportResponse"][0]["ns2:runReportReturn"][0]["ns2:reportBytes"][0]
      console.log("--->sampleText-->", sampleText);
      let bufferObj = Buffer.from(sampleText, "base64");
      let decodedString = bufferObj.toString("utf8");
      xml2js(decodedString, function (err, result) {
        var arrData = result["DATA_DS"]["G_1"];
        console.log("--arrData--->", arrData);
        for (let i = 0; i < arrData.length; i++) {
          filterArr.push({
            type: filterCode,
            id: arrData[i].ID[0],
            name: arrData[i].NAME[0]
          })
        }
      });
    });
    console.log("--->filterArr-->", filterArr);
    return filterArr;

  } catch (e) {
    console.log(e)
  }
}

exports.Migration = async function (requestData, taskData, requestId, userEmail, ifLastTask) {

  let sourceUrl = requestData.sourceUrl;
  let targetUrl = requestData.targetUrl;
  // DynamicYog
  importCred = await databaseService.callDatabase(calQquery.getInstanceCredByURL, targetUrl);//Import
  let importUserName = importCred[0].username;// Yogesh Start encode decode from manage intance
  let importEncodedString = "Basic " + importUserName;//147,148,158

  exportCred = await databaseService.callDatabase(calQquery.getInstanceCredByURL, sourceUrl);//Export
  let exportUserName = exportCred[0].username;

  let exportEncodedString = "Basic " + exportUserName;//139 144

  console.log("-->sourceUrl-->", sourceUrl, "--->targetUrl-->", targetUrl);


  try {

    var resExport = await this.exportFunction(sourceUrl, taskData, exportEncodedString);
    if (resExport.status == 200) {
      console.log('export ', resExport)
      var detailsData = {
        "requestId": requestId,
        "taskCode": taskData.taskCode,
        "exportProcessId": resExport.data.ExportProcessId,
        "importProcessId": null,
        "exportStatus": "In Progress",
        "importStatus": "In Progress",
        "submissionDate": new Date(),
        "completionDate": null,
        "createdBy": userEmail
      }
      var postExportData = await offeringsService.postExportDetails(null, detailsData, null)
      if (!resExport.data.ExportProcessId) {
        return { 'TaskCode': taskData.taskCode, 'Status': 'No Export Process Id' };
      }
      else {
        var flagStatusExport = await this.CheckStatus('export', sourceUrl, resExport.data.ExportProcessId, taskData.taskCode, exportEncodedString)
        if (flagStatusExport.status == 200) {
          if (flagStatusExport.data.ProcessCompletedFlag == "true") {
            var query = `UPDATE export_process_id SET exportStatus = 'Completed' WHERE exportId = ` + parseInt(postExportData.data.id)
            await offeringsService.postExportDetails(postExportData.data.id, null, query)
            var fileContent = await this.getFileContent(sourceUrl, resExport.data.ExportProcessId, taskData.taskCode, exportEncodedString);
            if (fileContent.status == 200) {
              console.log("before starting Import ", fileContent.status);
              console.log("before starting Import targetUrl,taskData.taskCode, fileContent.data, importEncodedString--->", targetUrl, taskData.taskCode, fileContent.data, importEncodedString);
              var resImport = await this.startImportFunction(targetUrl, taskData.taskCode, fileContent.data, importEncodedString)
              if (resImport.status == 200) {
                if (!resImport.data.ImportProcessId) {
                  return { 'TaskCode': taskData.taskCode, 'Status': 'No Import Process Id' };
                }
                else {
                  console.log('import ', resImport)
                  var query = `UPDATE export_process_id SET importProcessId = ${resImport.data.ImportProcessId}, importStatus = 'In Progress' WHERE exportId = ` + parseInt(postExportData.data.id)
                  await offeringsService.postExportDetails(postExportData.data.id, null, query)

                  var flagStatusImport = await this.CheckStatus('import', targetUrl, resImport.data.ImportProcessId, taskData.taskCode, importEncodedString)
                  if (flagStatusImport.status == 200) {
                    if (flagStatusImport.data.ProcessCompletedFlag == "true") {
                      var date = new Date();
                      var query = `UPDATE export_process_id SET importStatus = ?,completionDate = ? WHERE exportId = ?`;
                      await databaseService.callDatabase(query, ['Completed', date, parseInt(postExportData.data.id)])
                      return { 'TaskCode': taskData.taskCode, 'Status': 'Completed Successfully' }
                    } else {
                      console.log("Import Flag Status is false")
                    }
                  } else {
                    console.log("Import Flag Status API failed")
                  }
                }
              }
            }

            else {
              console.log("Get file content API unsuccessful")
              // return { 'TaskCode': taskData.taskCode, 'Status': 'Error in getting the File' }
            }
          }
          else {
            console.log("Export Flag Status is false")
            // return { 'TaskCode': taskData.taskCode, 'Status': 'Export Flag Status is false'}
          }
        }
        else {
          console.log("Get Flag Status API call unsuccessful");
        }
      }
    }
    else {
      console.log("Get Export Function unsuccessful");
    }
    // console.log(resImport)
    // if (resData.data.OracleExpStauts === '201') {
    //   return resData.data;
    // }
  } catch (error) {
    console.log(error)
    return { status: 400, data: error }
  }
}

exports.exportMigration = async function (requestData, taskData, requestId, userEmail, ifLastTask) {

  let sourceUrl = requestData.sourceUrl;
  // let targetUrl = requestData.targetUrl;
  // DynamicYog
  // importCred = await databaseService.callDatabase(calQquery.getInstanceCredByURL, targetUrl);//Import
  // let importUserName = importCred[0].username;// Yogesh Start encode decode from manage intance
  // let   importEncodedString = "Basic " + importUserName;//147,148,158

  exportCred = await databaseService.callDatabase(calQquery.getInstanceCredByURL, sourceUrl);//Export
  let exportUserName = exportCred[0].username;

  let exportEncodedString = "Basic " + exportUserName;//139 144

  console.log("-->sourceUrl-->", sourceUrl);


  try {
    var resExport = await this.exportFunction(sourceUrl, taskData, exportEncodedString);
    if (resExport.status == 200) {
      console.log('export ', resExport)
      var detailsData = {
        "requestId": requestId,
        "taskCode": taskData.taskCode,
        "exportProcessId": resExport.data.ExportProcessId,
        "importProcessId": null,
        "exportStatus": "In Progress",
        "importStatus": "In Progress",
        "submissionDate": new Date(),
        "completionDate": null,
        "createdBy": userEmail
      }
      var postExportData = await offeringsService.postExportDetails(null, detailsData, null)
      if (!resExport.data.ExportProcessId) {
        return { 'TaskCode': taskData.taskCode, 'Status': 'No Export Process Id' };
      }
      else {
        var flagStatusExport = await this.CheckStatus('export', sourceUrl, resExport.data.ExportProcessId, taskData.taskCode, exportEncodedString)
        if (flagStatusExport.status == 200) {
          if (flagStatusExport.data.ProcessCompletedFlag == "true") {
            var query = `UPDATE export_process_id SET exportStatus = ? , exportprocessLogs = ? WHERE exportId = ?`;
            await databaseService.callDatabase(query, [flagStatusExport.data.ProcessStatusNew, flagStatusExport.data.processIDLogs, parseInt(postExportData.data.id)])// changes for approval/logging
            var fileContent = await this.getFileContent(sourceUrl, resExport.data.ExportProcessId, taskData.biTaskCode, taskData.taskCode, exportEncodedString, requestId, taskData.taskid);// changes for approval/logging
            if (fileContent.status == 200) {
              console.log("before starting Import ", fileContent.status);
            }
            else {
              console.log("Get file content API unsuccessful")
              // return { 'TaskCode': taskData.taskCode, 'Status': 'Error in getting the File' }
            }
          }
          else {
            console.log("Export Flag Status is false")
            // return { 'TaskCode': taskData.taskCode, 'Status': 'Export Flag Status is false'}
          }
        }
        else {
          console.log("Get Flag Status API call unsuccessful");
        }
      }
    }
    else {
      console.log("Get Export Function unsuccessful");
    }
  } catch (error) {
    console.log(error)
    return { status: 400, data: error }
  }
}

exports.importMigration = async function historyId(historyId, requestId, targetUrl, taskCode, fileContent, token) {
  var resImport = await this.startImportFunction(targetUrl, taskCode, fileContent, token)
  if (resImport.status == 200) {
    if (!resImport.data.ImportProcessId) {
      return { 'TaskCode': taskCode, 'Status': 'No Import Process Id' };
    }
    else {
      console.log('import process id ', resImport)
      // var query = `UPDATE export_process_id SET importProcessId = ${resImport.data.ImportProcessId}, importStatus = 'In Progress' WHERE exportId = ` + parseInt(postExportData.data.id)
      // await offeringsService.postExportDetails(postExportData.data.id, null, query)
      let getExport = await databaseService.callDatabase(query.getExportlogsbyReq, [requestId, taskCode]);
      let logtext = getExport[0].exportLog;
      await databaseService.callDatabase(query.insertImportDetails, [historyId, taskCode, getExport[0].exportProcessId, resImport.data.ImportProcessId, getExport[0].exportStatus, 'In progress', getExport[0].submissionDate, null, getExport[0].createdBy, logtext])
      // let getImport = await databaseService.callDatabase(query.getExportProcessId, [historyId, taskCode]);


      var flagStatusImport = await this.CheckStatus('import', targetUrl, resImport.data.ImportProcessId, taskCode, token)
      if (flagStatusImport.status == 200) {
        if (flagStatusImport.data.ProcessCompletedFlag == "true") {
          var date = new Date();
          let getExport = await databaseService.callDatabase(query.getExportProcessId, [requestId, taskCode]);
          console.log("getExport", getExport);
          await databaseService.callDatabase(query.updateImportDetails, [flagStatusImport.data.ProcessStatusNew, date, flagStatusImport.data.processIDLogs, resImport.data.ImportProcessId])
          return { 'TaskCode': taskCode, 'Status': 'Completed Successfully' }
        } else {
          console.log("Import Flag Status is false")
        }
      } else {
        console.log("Import Flag Status API failed")
      }
    }
  }
}

exports.checkIdComplete = async function (userDetails, requestDetails, offeringDetails, historyId, migrationChecked) {
  console.log("In export function")
  var status;
  if (migrationChecked) {
    console.log("--->checkIdComplete-->if -->", migrationChecked);
    var resDataExport = await offeringsService.getExportDetails(historyId);
    console.log(resDataExport);
    if (resDataExport.status === 200) {
      var dataExportAll = resDataExport.data;
      dataExport = dataExportAll.filter(obj => (obj.exportStatus == "In Progress" || obj.importStatus == "In Progress"));
      if (dataExport.length === 0) {
        status = 'Completed'
      } else {
        status = 'Failed'
      }

    }
  } else {
    console.log("--->checkIdComplete-->else -->", migrationChecked);
    var date = new Date();
    var query = `UPDATE history SET status = ?, completionDate = ? WHERE requestId = ?`;
    await databaseService.callDatabase(query, ['Completed', date, parseInt(historyId)])
    status = 'Completed'
  }

  var filename = `${historyId}_${requestDetails.requestType}_Workbook.xls`;

  var emailSubject = 'Status of Configuration Migration Process';
  if (requestDetails.requestType === "Export") {
    var emailBody =
      `<div>Hi,</div>
    <br>
    <div>Migration has been <b>${status}</b> with below details.</div>
    <br>
    <div> Request Id: ${historyId} </div>
    <div> Request By: ${userDetails.username} </div>
    <div> Request Name: ${requestDetails.requestName} </div>
    <div> Request Type: ${requestDetails.requestType} </div>
    <div> Source Instance: ${requestDetails.sourceUrl} </div>
    <div> Offering: ${offeringDetails.offering.offeringName} </div>
    <div> Module: ${offeringDetails.module.moduleName} </div>
    <div> Filter Value: ${offeringDetails.filter.name} </div>
    <br><br>
    Replies to this email aren't monitored. Please do not reply.`;
  }

  if (requestDetails.requestType === "Import") {

    var updateFileNm = `${historyId}_${requestDetails.requestType}_Workbook.xls`;

    var emailBody =
      `<div>Hi,</div>
    <br>
    <div>Migration has been <b>${status}</b> with below details.</div>
    <br>
    <div> Request Id: ${historyId} </div>
    <div> Request Name: ${requestDetails.requestName} </div>
    <div> Request Type: ${requestDetails.requestType} </div>
    <div> Destination Instance: ${requestDetails.targetUrl} </div>
    <br><br>
    Replies to this email aren't monitored. Please do not reply.`;
    await mailService.sendMailToUser(userDetails.email, emailSubject, emailBody, updateFileNm, updateFileNm);
  }
  if (requestDetails.requestType === "Catalog Export") {
    var emailBody =
      `<div>Hi,</div>
  <br>
  <div>Migration has been <b>${status}</b> with below details.</div>
  <br>
  <div> Request Id: ${historyId} </div>
  <div> Request By: ${userDetails.username} </div>
  <div> Request Name: ${requestDetails.requestName} </div>
  <div> Request Type: ${requestDetails.requestType} </div>
  <div> Source Instance: ${requestDetails.sourceUrl} </div>
   <br><br>
  Replies to this email aren't monitored. Please do not reply.`;
  }
  if (requestDetails.requestType === "Catalog Import") {
    var emailBody =
      `<div>Hi,</div>
  <br>
  <div>Migration has been <b>${status}</b> with below details.</div>
  <br>
  <div> Request Id: ${historyId} </div>
  <div> Request Name: ${requestDetails.requestName} </div>
  <div> Request Type: ${requestDetails.requestType} </div>
  <div> Destination Instance: ${requestDetails.targetUrl} </div>
  <br><br>
  Replies to this email aren't monitored. Please do not reply.`;
  }
  await mailService.sendMailToUserCompare(userDetails.email, emailSubject, emailBody, updateFileNm, updateFileNm);
}

exports.exportFunction = async function (sourceUrl, taskData, token) {
  // Call export endpoint
  let url = `${sourceUrl}:443/${config.export}`;
  console.log(" in export function url ---->", url);
  var newTaskData;
  console.log(" in export function taskData ---->", taskData);
  if (taskData.scope === '') {
    newTaskData = JSON.stringify({
      "TaskCode": taskData.taskCode,
      "SetupTaskCSVExportProcess": [
        {
          "TaskCode": taskData.taskCode
        }
      ]
    })
  } else {
    if (taskData.filterBusinessObjectCode2 === '') {
      newTaskData = JSON.stringify({
        "TaskCode": taskData.taskCode,
        "SetupTaskCSVExportCriteria": [
          {
            "TaskCode": taskData.taskCode, //taskCode
            "BusinessObjectCode": taskData.filterBusinessObjectCode1,
            "AttributeSet": "Set1",
            "AttributeName": taskData.filterAttributeName1, //attNAme1
            "AttributeValue": taskData.filterAttributeValue1 //attrValu1
          }
        ],
        "SetupTaskCSVExportProcess": [
          {
            "TaskCode": taskData.taskCode
          }
        ]
      });
    } else {
      newTaskData = JSON.stringify({
        "TaskCode": taskData.taskCode,
        "SetupTaskCSVExportCriteria": [
          {
            "TaskCode": taskData.taskCode, //taskCode
            "BusinessObjectCode": taskData.filterBusinessObjectCode1, //filterBusinessObjectCode1
            "AttributeSet": "Set1",
            "AttributeName": taskData.filterAttributeName1, //filterAttributeName1
            "AttributeValue": taskData.filterAttributeValue1 //filterAttributeValue1
          },
          {
            "TaskCode": taskData.taskCode, //taskCode
            "BusinessObjectCode": taskData.filterBusinessObjectCode2, //filterBusinessObjectCode2
            "AttributeSet": "Set2",
            "AttributeName": taskData.filterAttributeName2, //filterAttributeName2
            "AttributeValue": taskData.filterAttributeValue2  //filterAttributeValue2
          }
        ],
        "SetupTaskCSVExportProcess": [
          {
            "TaskCode": taskData.taskCode
          }
        ]
      });
    }
  }

  console.log("in Export function newTaskData---->>", newTaskData);
  try {
    var configData = {
      method: 'post',
      url: url,
      headers: {
        "Authorization": token,
        'Content-Type': 'application/json'
      },
      data: newTaskData
    }
    var resData;
    resData = await axios(configData);

    if (resData.status === 201) {
      return {
        status: 200,
        data: {
          "TaskCode": resData.data.TaskCode,
          "ExportProcessId": resData.data.SetupTaskCSVExportProcess ? resData.data.SetupTaskCSVExportProcess[0].ProcessId : null,
        }
      };

    }
  } catch (error) {
    console.log(error)
    return { status: 400, data: error }
  }
  // }
  // payload contains process id use this process id in status API call 
}

// exports.CheckStatus = async function (type, envUrl, ProcessId, TaskCode, token) {
//   let url;
//   if (type === 'export') {
//      this.url = `${envUrl}:443/${config.export}/${TaskCode}/child/SetupTaskCSVExportProcess/${ProcessId}`
//   } else if (type === 'import') {
//      this.url = `${envUrl}:443/${config.import}/${TaskCode}/child/SetupTaskCSVImportProcess/${ProcessId}`
//   }


//   let flag = "false";
//   let x = 0;
//   while (flag != "true") {
//     setTimeout(function () { console.log(`${type} status count  ${x}`) }, 10000);
//     try {
//       var configData = {
//         method: 'get',
//         url: this.url,
//         headers: {
//           "Authorization": token,
//           "Content-Type": "application/octet-stream"
//         }
//       };
//       var resData = await axios(configData);
//       flag = resData.data.ProcessCompletedFlag.toString();
//       x = x + 1;
//     } catch (error) {
//       console.log(error);
//       x = x + 1;
//     }
//   }
//   if (resData.status === 200) {
//     return {
//       status: 200,
//       data: {
//         ProcessCompletedFlag: resData.data.ProcessCompletedFlag.toString(),
//         ProcessId: resData.data.ProcessId.toString(),
//       }
//     }
//   }
//   else {
//     return { status: 400, data: error }
//   }
// }

// changes for approval/logging start
exports.CheckStatus = async function (type, envUrl, ProcessId, TaskCode, token) {
  let url;
  if (type === 'export') {
    this.url = `${envUrl}:443/${config.export}/${TaskCode}/child/SetupTaskCSVExportProcess/${ProcessId}/child/SetupTaskCSVExportProcessResult/${ProcessId}/enclosure/ProcessLog`;
  } else if (type === 'import') {
    this.url = `${envUrl}:443/${config.import}/${TaskCode}/child/SetupTaskCSVImportProcess/${ProcessId}/child/SetupTaskCSVImportProcessResult/${ProcessId}/enclosure/ProcessLog`;
  }

  var progressStatus;
  let logdata;
  let urlSent = `${envUrl}/fscmService/SetupDataExportImportService?WSDL`;
  try {
    var data1 = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:typ="http://xmlns.oracle.com/apps/setup/migrator/setupDataExportImportService/types/">
  <soapenv:Header/>
  <soapenv:Body>
     <typ:getTaskCSVExportResult>
        <typ:processId>${ProcessId}</typ:processId>
     </typ:getTaskCSVExportResult>
  </soapenv:Body>
</soapenv:Envelope>`;
    var configData1 = {
      method: "post",
      url: urlSent,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        Authorization: token,
      },
      data: data1,
    };

  } catch (error) {
    console.log(error);
    return { status: 400, data: error };
  }

  let flag = "false";
  let x = 0;
  let resData1;

  while (flag != "true") {
    setTimeout(function () { console.log(`${type} status count  ${x}`) }, 10000);
    try {

      const response1 = await axios(configData1);
      // console.log("---getStatusByProcessId --->response-->", response1);
      var responsetoString = response1.data.toString();

      progressStatus = responsetoString.substring(
        responsetoString.indexOf("<ns1:StatusCode>") + 16,
        responsetoString.lastIndexOf("</ns1:StatusCode>")
      );
      console.log("--getStatusByProcessId->status-->", progressStatus);

      if (progressStatus == 'COMPLETED') {
        var configData = {
          method: 'get',
          url: this.url,
          headers: {
            "Authorization": token,
          }
        };

        resData1 = await axios(configData);
        resData1.data = resData1.data.replace(/(\\n)/g, "\n");
        console.log("sads---s resData1.data->", resData1.data);

        let stringData = resData1.data;

        stringData = stringData.replace(/(\\r)/g, "\r");
        console.log("sads---s stringData->", stringData);

        logdata = stringData;
        progressStatus = "Completed"
        flag = "true";
      }
      else
        if (progressStatus == 'COMPLETED_ERRORS') {
          var configData = {
            method: 'get',
            url: this.url,
            headers: {
              "Authorization": token,
            }
          };

          resData1 = await axios(configData);
          resData1.data = resData1.data.replace(/(\\n)/g, "\n");
          console.log("sads---s resData1.data->", resData1.data);

          let stringDatanew = resData1.data;

          stringDatanew = stringDatanew.replace(/(\\r)/g, "\r");
          console.log("sads---s stringDatanew->", stringDatanew);

          logdata = stringDatanew;
          progressStatus = "Completed with Error"
          flag = "true";
        }
        else {
          flag = "false";
        }
      x = x + 1;
    } catch (error) {
      console.log(error);
      x = x + 1;
    }
  }

  if (flag == "true") {
    return {
      status: 200,
      data: {
        ProcessCompletedFlag: flag,
        ProcessStatusNew: progressStatus,
        processIDLogs: logdata,
      }
    }
  }
  else {
    return { status: 400, data: error }
  }
}
// changes for approval/logging end

exports.getFileContent = async function (sourceUrl, ExportProcessId, biTaskCode, TaskCode, token, requestId, taskid) {
  let url = `${sourceUrl}:443/${config.export}/${TaskCode}/child/SetupTaskCSVExportProcess/${ExportProcessId}/child/SetupTaskCSVExportProcessResult/${ExportProcessId}/enclosure/FileContent`;
  try {
    var configData = {
      method: 'get',
      url: url,
      headers: {
        "Authorization": token,
        "Content-type": "application/octet-stream",
      },
      stream: true,
      responseType: 'arraybuffer'
    };
    let fileCont = await axios(configData)
    if (fileCont.status === 200) {
      let data = fileCont.data;
      console.log("--------------------filecontentdata----------------->", data)
      let base64data = data.toString('base64');
      // fs.writeFile("exportFiles/"+TaskCode+".csv",data,{encoding:'binary'}, function(err){
      //   if(err) {
      //     console.log("error in base64 to csv conversion", err)
      //   }
      //   else {
      //     console.log("success in base64 to csv conversion")
      //   }
      // })
      if (!fs.existsSync("exportFiles/" + requestId)) {
        fs.mkdirSync("exportFiles/" + requestId);
      }
      fs.writeFile("exportFiles/" + requestId + "/" + requestId + "_" + taskid + "_" + biTaskCode + "_" + TaskCode + ".zip", data, (err) => {
        if (err) throw err;
        console.log("success");
      });
      console.log("-----------------Base64 filecontent----------------------------->", base64data);
      return { status: 200, data: base64data }
    }
  } catch (error) {
    console.log(error)
    return { status: 400, data: error }
  }
  // get file content in base 64 format
}

exports.startImportFunction = async function (targetUrl, TaskCode, fileContent, token) {
  let url = `${targetUrl}:443/${config.import}`
  let base64data = fileContent.toString('base64');

  var newTaskData =
  {
    "TaskCode": TaskCode,
    "SetupTaskCSVImportProcess": [
      {
        "TaskCode": TaskCode,
        "FileContent": base64data
      }
    ],
  }
  try {
    var configData = {
      method: 'post',
      url: url,
      headers: {
        "Authorization": token,
        'Content-Type': 'application/vnd.oracle.adf.resourceitem+json'
      },
      data: newTaskData
    }
    var resData;
    resData = await axios(configData);
    console.log("In import function resdata", resData);
    console.log("In imort function resdata", resData.status);

    if (resData.status === 201) {
      return {
        status: 200,
        data: {
          "TaskCode": resData.data.TaskCode,
          "ImportProcessId": resData.data.SetupTaskCSVImportProcess ? resData.data.SetupTaskCSVImportProcess[0].ProcessId : null,
        }
      };;
    }
  } catch (error) {
    console.log(error)
    return { status: 400, data: error }
  }
}

exports.Workbook = async function (instance, instanceDetails, email, filterValue) {
  let url = `${instanceDetails.url}:443/xmlpserver/services/v2/ScheduleService`;
  let cred, data;

  console.log("instanceDetails---->", instanceDetails.url, "<--instance-->", instance);
  if (instance === "Source") {
    data = await databaseService.callDatabase(query.getInstanceCredByURL, instanceDetails.url);// DynamicYog
  } else if (instance === "Target") {
    data = await databaseService.callDatabase(query.getInstanceCredByURL, instanceDetails.url);// DynamicYog
  }
  let userName = data[0].username; // Yogesh instance details decode 
  let bufferObj = Buffer.from(userName, "base64");
  let decodedString = bufferObj.toString("utf8");
  userName = decodedString.split(":")[0];
  let password = decodedString.split(":")[1];
  console.log("--username password decodeed--->", userName, password)
  // Yogesh instance details decode
  try {
    let sampleHeaders = { 'Content-Type': 'text/xml;charset=UTF-8' };

    let xml =
      `<soapenv:Envelope xmlns:soapenv='http://schemas.xmlsoap.org/soap/envelope/' xmlns:v2='http://xmlns.oracle.com/oxp/service/v2'>
  <soapenv:Header/>
  <soapenv:Body>
     <v2:scheduleReport>
        <v2:scheduleRequest>
           <v2:deliveryChannels>
              <v2:emailOptions>
                 <v2:item>
                    <v2:emailAttachmentName>GL Configuration Workbook</v2:emailAttachmentName>
                    <v2:emailBody>
                    Hi,
                    
                    Please find the output of GL Configuration Workbook from ${instanceDetails.url} instance.

                    Thanks
                    Configuration Manager
                    </v2:emailBody>
                    <v2:emailFrom>[mailto:epvg-test.bi.sender@workflow.mail.em2.cloud.oracle.com%3c/v2:emailFrom]epvg-test.bi.sender@workflow.mail.em2.cloud.oracle.com</v2:emailFrom>
                    <v2:emailServerName>cns</v2:emailServerName>
                    <v2:emailSubject>GL Configuration Workbook - ${instance}</v2:emailSubject>
                    <v2:emailTo>${config.email}, ${email}</v2:emailTo>
                 </v2:item>
              </v2:emailOptions>
           </v2:deliveryChannels>
           <v2:reportRequest>
              <v2:attributeFormat>EXCEL</v2:attributeFormat>
              <v2:attributeLocale>en-EN</v2:attributeLocale>
              <v2:attributeTemplate>GL_Configuration_Workbook_Template</v2:attributeTemplate>
              <v2:byPassCache>true</v2:byPassCache>
              <v2:flattenXML>false</v2:flattenXML>
              <v2:reportAbsolutePath>/Custom/Configuration Migration Toolkit/Finance/General Ledger/Report/GL_Configuration_Workbook_Report.xdo</v2:reportAbsolutePath>
              <v2:parameterNameValues>
              <v2:listOfParamNameValues>
                <v2:item>
                  <v2:name>LEDGER_NAME</v2:name>
                  <v2:values>
                    <v2:item>${filterValue}</v2:item>
                  </v2:values>
                </v2:item>
              </v2:listOfParamNameValues>
            </v2:parameterNameValues>
              </v2:reportRequest>
           <v2:userJobDesc>Report Job SOAP UI</v2:userJobDesc>
           <v2:userJobName>Report Job SOAP UI</v2:userJobName>
        </v2:scheduleRequest>
        <v2:userID>${userName}</v2:userID>
        <v2:password>${password}</v2:password>
     </v2:scheduleReport>
  </soapenv:Body>
</soapenv:Envelope>`;

    const { response } = await soapRequest({ url: url, headers: sampleHeaders, xml: xml });
    console.log(response);
    if (response.statusCode === 200) {
      return { status: 200, data: "Success" }
    }
  } catch (error) {
    console.log(error)
    return { status: 400, data: error }
  }
}


exports.backupBeforeImport = async function (requestData, taskData, requestId) {

  let targetUrl = requestData.targetUrl;
  // DynamicYog
  importCred = await databaseService.callDatabase(calQquery.getInstanceCredByURL, targetUrl);//Import
  let importUserName = importCred[0].username;
  let importEncodedString = "Basic " + importUserName;

  try {

    var resExport = await this.exportFunction(targetUrl, taskData, importEncodedString);

    if (resExport.status == 200) {
      console.log('export ', resExport)

      if (!resExport.data.ExportProcessId) {
        return { 'TaskCode': taskData.taskCode, 'Status': 'No Export Process Id' };
      }
      else {
        var flagStatusExport = await this.CheckStatus('export', targetUrl, resExport.data.ExportProcessId, taskData.taskCode, importEncodedString)
        if (flagStatusExport.status == 200) {
          if (flagStatusExport.data.ProcessCompletedFlag == "true") {
            var fileContent = await this.getFileContentandSaveInBackupDir(targetUrl, resExport.data.ExportProcessId, taskData.biTaskCode, taskData.taskCode, importEncodedString, requestId, taskData.taskid);// changes for approval/logging
            if (fileContent.status == 200) {
              console.log("before starting Import ", fileContent.status);
            }
            else {
              console.log("Get file content API unsuccessful")
              // return { 'TaskCode': taskData.taskCode, 'Status': 'Error in getting the File' }
            }
          }
          else {
            console.log("Export Flag Status is false")
            // return { 'TaskCode': taskData.taskCode, 'Status': 'Export Flag Status is false'}
          }
        }
        else {
          console.log("Get Flag Status API call unsuccessful");
        }
      }
    }
    else {
      console.log("Get Export Function unsuccessful");
    }
  } catch (error) {
    console.log(error)
    return { status: 400, data: "" }
  }

}

exports.getFileContentandSaveInBackupDir = async function (targetUrl, ExportProcessId, biTaskCode, TaskCode, token, requestId, taskid) {
  let url = `${targetUrl}:443/${config.export}/${TaskCode}/child/SetupTaskCSVExportProcess/${ExportProcessId}/child/SetupTaskCSVExportProcessResult/${ExportProcessId}/enclosure/FileContent`;
  try {
    var configData = {
      method: 'get',
      url: url,
      headers: {
        "Authorization": token,
        "Content-type": "application/octet-stream",
      },
      stream: true,
      responseType: 'arraybuffer'
    };
    let fileCont = await axios(configData)
    if (fileCont.status === 200) {
      let data = fileCont.data;
      console.log("--------------------getFileContentandSaveInBackupDir----------------->", data)
      let base64data = data.toString('base64');

      if (!fs.existsSync("importFiles/" + requestId)) {
        fs.mkdirSync("importFiles/" + requestId);
      }
      if (!fs.existsSync("importFiles/" + requestId + "/Backup")) {
        fs.mkdirSync("importFiles/" + requestId + "/Backup");
      }
      fs.writeFile("importFiles/" + requestId + "/Backup/" + requestId + "_" + taskid + "_" + biTaskCode + "_" + TaskCode + ".zip", data, (err) => {
        if (err) throw err;
        console.log("success");
      });
      console.log("-----------------Base64 filecontent----------------------------->", base64data);
      return { status: 200, data: base64data }
    }
  } catch (error) {
    console.log(error)
    return { status: 400, data: error }
  }
  // get file content in base 64 format
}
//logon
exports.logon = async function (Url) {
  try {
    let url = Url+'/analytics-ws/saw.dll?SoapImpl=nQSessionService';
    let sampleHeaders = { 'Content-Type': 'text/xml;charset=UTF-8' };
    const xml = `
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v7="urn://oracle.bi.webservices/v7">
     <soapenv:Header/>
     <soapenv:Body>
        <v7:logon>
           <v7:name>Trainee User Functional</v7:name>
           <v7:password>Welcome@123</v7:password>
        </v7:logon>
     </soapenv:Body>
  </soapenv:Envelope>`;

    const { response } = await soapRequest({ url: url, headers: sampleHeaders, xml: xml });
    const { body } = response;

    console.log('body', body);

    const parsedResult = await parseStringPromise(body);
    const sessionID = parsedResult['soap:Envelope']['soap:Body'][0]['sawsoap:logonResult'][0]['sawsoap:sessionID'][0];
    console.log('from logon' + sessionID._);
    return sessionID._;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}
//logoff
exports.logoff = async function (sessionID) {
  try {
    let url = 'https://fa-epvg-test-saasfaprod1.fa.ocs.oraclecloud.com/analytics-ws/saw.dll?SoapImpl=nQSessionService';
    let sampleHeaders = { 'Content-Type': 'text/xml;charset=UTF-8' };
    const xml = `
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v7="urn://oracle.bi.webservices/v7">
  <soapenv:Header/>
  <soapenv:Body>
     <v7:logoff>
        <v7:sessionID>${sessionID}</v7:sessionID>
     </v7:logoff>
  </soapenv:Body>
</soapenv:Envelope>
`;
    const { response } = await soapRequest({ url: url, headers: sampleHeaders, xml: xml });
    const { body } = response;
    console.log(body);
    return { status: 200, data: 'logoff successfull' };
  } catch (error) {
    console.error('Error:', error);
    return null;
  }

}
//keepAlive
exports.keepAlive = async function (sessionID,Url) {
  try {
    let url = Url+'/analytics-ws/saw.dll?SoapImpl=nQSessionService';
    let sampleHeaders = { 'Content-Type': 'text/xml;charset=UTF-8' };
    const xml = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v7="urn://oracle.bi.webservices/v7">
    <soapenv:Header/>
    <soapenv:Body>
       <v7:keepAlive>
          <!--Zero or more repetitions:-->
          <v7:sessionID>${sessionID}</v7:sessionID>
       </v7:keepAlive>
    </soapenv:Body>
  </soapenv:Envelope>
  `;;

    const { response } = await soapRequest({ url: url, headers: sampleHeaders, xml: xml });
    const { body } = response;

    console.log('body', body);

    return { status: 200, data: 'is alive' };
  } catch (error) {
    console.error('Error:', error);
    return null;
  }

}
//checkAlive
exports.checkAlive = async function (sessionID,Url) {
  try {
    let url = Url+'/analytics-ws/saw.dll?SoapImpl=nQSessionService';
    let sampleHeaders = { 'Content-Type': 'text/xml;charset=UTF-8' };
    const xml = `
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v7="urn://oracle.bi.webservices/v7">
<soapenv:Header/>
<soapenv:Body>
<v7:getSessionEnvironment>
<v7:sessionID>${sessionID}</v7:sessionID>
</v7:getSessionEnvironment>
</soapenv:Body>
</soapenv:Envelope>
`;

    const { response } = await soapRequest({ url: url, headers: sampleHeaders, xml: xml });
    const { body } = response;

    console.log('body', body);
    const parsedResult = await parseStringPromise(body);
    const faultElement = parsedResult['soap:Envelope']['soap:Body'][0]['soap:Fault'];
    const faultstring = faultElement ? faultElement[0]['faultstring'][0] : undefined;

    console.log('faultstring', faultstring);
    if (typeof faultstring !== 'undefined') {
      return false;
    } else {
      return true;
    }
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}
//getIteminfo
exports.getItemInfo = async function (sessionID, data,Url) {
  try {
    let myArray = [];
    if (data != null) {
      await Promise.all(data.map(async element => {
        try {
          let path = element.objectName;
          type = element.objectType;
          console.log('from getiteminfo' + type);
          if (type === 'bi publisher report') {
            path = path + '.xdo'
            console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@path' + path);
          } else if (type === 'bi publisher data model') {
            path = path + '.xdm'
            console.log(path);
          } else if (type === 'bi publisher style template') {
            path = path + '.xss'
            console.log(path);
          } else if (type === 'bi publisher sub template') {
            path = path + '.xsb'
            console.log(path);
          }
          let url = Url+'/analytics-ws/saw.dll?SoapImpl=webCatalogService';
          let sampleHeaders = { 'Content-Type': 'text/xml;charset=UTF-8' };
          let xml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v7="urn://oracle.bi.webservices/v7">
          <soapenv:Header/>
          <soapenv:Body>
             <v7:getItemInfo>
                <v7:path>${path}</v7:path>
                <v7:resolveLinks></v7:resolveLinks>
                <v7:sessionID>${sessionID}</v7:sessionID>
             </v7:getItemInfo>
          </soapenv:Body>
       </soapenv:Envelope>
       `;

          const { response } = await soapRequest({ url: url, headers: sampleHeaders, xml: xml });
          const { body } = response;

          console.log('body', body);

          const parsedResult = await parseStringPromise(body);
          const faultElement = parsedResult['soap:Envelope']['soap:Body'][0]['soap:Fault'];
          const faultstring = faultElement ? faultElement[0]['faultstring'][0] : undefined;

          console.log('faultstring', faultstring);
          console.log('element.validity_check', element.validity_check);

          if (typeof faultstring !== 'undefined') {
            element.validity_check = 'N';
          } else {
            element.validity_check = 'Y';
          }
          console.log('element.validity_check', element.validity_check);
          console.log('element', element);
          myArray.push(element);

          console.log('myArray', myArray);
          console.log('myArray.length', myArray.length);
        } catch (error) {
          console.error('Error occurred during SOAP request:', error);
          element.validity_check = 'N';
          myArray.push(element);
        }
      }));

      return { status: 200, data: myArray };
    } else {
      return { status: 200, data: data };
    }
  } catch (error) {
    console.error('Unexpected error occurred:', error);
    return { status: 400, data: error };
  }
}
//export
exports.copyItem2 = async function (sessionID, url, data, useDetails, requestId, exportid, code) {
  try {
    let Url = url + '/analytics-ws/saw.dll?SoapImpl=webCatalogService';
    console.log('llllllllllllllllllllllllllllllllllllllllll' + sessionID + 'ddddddddddd' + code + 'urlllllllll' + url)
    await Promise.all(data.map(async element => {
      let path = element.objectName;
      var type = element.objectType;
      var ext = '';
      var export_process_id = requestId + element.catalogID;
      console.log('from getiteminfo' + type);
      if (type === 'bi publisher report') {
        ext = '.xdo';
        path = path + ext;
        console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@path' + path);
      } else if (type === 'bi publisher data model') {
        ext = '.xdm';
        path = path + ext;
        console.log(path);
      } else if (type === 'bi publisher style template') {
        ext = '.xss';
        path = path + ext;
        console.log(path);
      } else if (type === 'bi publisher sub template') {
        ext = '.xsb';
        path = path + ext;
        console.log(path);
      }
      if (code == true) {
        var detailsData = {
          "requestId": requestId,
          "taskCode": element.objectName,
          "exportProcessId": export_process_id,
          "importProcessId": null,
          "exportStatus": "In Progress",
          "importStatus": null,
          "submissionDate": new Date(),
          "completionDate": null,
          "createdBy": useDetails.email
        }
        var postExportData = await offeringsService.postExportDetails(null, detailsData, null);
        console.log(postExportData);
      }
      var flag;
      const lastIndex = path.lastIndexOf('/');
      const pathafterslash = path.slice(lastIndex + 1);
      var base64data = await this.generateBase64(sessionID, path, Url);
      if (base64data.status == 200) {
        if (code == true) {
          if (!(await fsa.pathExists("reportcatalog/" + requestId))) {
            await fsa.ensureDir("reportcatalog/" + requestId);
          }

          if (!(await fsa.pathExists("reportcatalog/" + requestId + "/exports-source"))) {
            await fsa.ensureDir("reportcatalog/" + requestId + "/exports-source");
          }
          filename = "reportcatalog/" + requestId + "/" + "exports-source/" + requestId + "_" + pathafterslash + ext;
        } else if (code == false) {
          if (!(await fsa.pathExists("reportcatalog/" + exportid))) {
            await fsa.ensureDir("reportcatalog/" + requestId);
          }

          if (!(await fsa.pathExists("reportcatalog/" + exportid + "/backup-targets"))) {
            await fsa.ensureDir("reportcatalog/" + exportid + "/backup-targets");
          }
          filename = "reportcatalog/" + exportid + "/backup-targets/" + exportid + "_" + pathafterslash + ext;
        }
        base64.decode(
          base64data.data,
          filename,
          function (err, output) {
          }
        );
        flag = 'Completed';
      }
      else {
        flag = 'Failed';
      }
      var date = new Date();
      query = "UPDATE export_process_id SET exportStatus = ?, completionDate = ? where exportProcessId = ?";
      var response = await offeringsService.postCatalogExportDetails(query, [flag, date, export_process_id]);
    }));

    return { status: 200, data: 'myArray' };
  }
  catch (error) {
    console.error('Unexpected error occurred:', error);
    return { status: 400, data: error };
  }
};
//generateBase64
exports.generateBase64 = async function (sessionID, path, Url) {
  try {

    console.log('session id from generate--------------------' + sessionID);
    let sampleHeaders = { 'Content-Type': 'text/xml;charset=UTF-8' };
    let xml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v7="urn://oracle.bi.webservices/v7">
        <soapenv:Header/>
        <soapenv:Body>
          <v7:copyItem2>
            <!--1 or more repetitions:-->
            <v7:path>${path}</v7:path>
            <v7:recursive>true</v7:recursive>
            <v7:permissions>false</v7:permissions>
            <v7:timestamps>false</v7:timestamps>
            <v7:useMtom>false</v7:useMtom>
            <v7:sessionID>${sessionID}</v7:sessionID>
          </v7:copyItem2>
        </soapenv:Body>
      </soapenv:Envelope>`;

    const { response } = await soapRequest({ url: Url, headers: sampleHeaders, xml: xml });
    const { body } = response;
    const parsedResult = await parseStringPromise(body);
    const faultElement = parsedResult['soap:Envelope']['soap:Body'][0]['soap:Fault'];
    const faultstring = faultElement ? faultElement[0]['faultstring'][0] : undefined;

    console.log('faultstring', faultstring);

    if (typeof faultstring !== 'undefined') {
      return { status: 400, data: faultstring };
    } else {
      const base64data = await parsedResult['soap:Envelope']['soap:Body'][0]['sawsoap:copyItem2Result'][0]['sawsoap:archive'][0];
      // console.log((base64data._));
      return { status: 200, data: base64data._ };
    }
  } catch (error) {
    console.error('Error occurred during SOAP request:', error);
    return { status: 400, data: false };
  }
}
//import 
exports.pasteItem2 = async function (sessionID, url, data, useDetails, requestId, exportId) {
  try {
    var flag = 'Completed';
    let Url = url + '/analytics-ws/saw.dll?SoapImpl=webCatalogService';
    await Promise.all(data.map(async element => {
      let path = element.objectName;
      var type = element.objectType;
      var ext = '';
      var export_process_id = exportId.toString() + element.catalogID;
      console.log('Export process id-------------------'+export_process_id);
      var import_process_id = requestId + element.catalogID;
      console.log('from getiteminfo' + type);
      if (type === 'bi publisher report') {
        ext = '.xdo';
        path = path + ext;
        console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@path' + path);
      } else if (type === 'bi publisher data model') {
        ext = '.xdm';
        path = path + ext;
        console.log(path);
      } else if (type === 'bi publisher style template') {
        ext = '.xss';
        path = path + ext;
        console.log(path);
      } else if (type === 'bi publisher sub template') {
        ext = '.xsb';
        path = path + ext;
        console.log(path);
      }
      var detailsData = {
        "requestId": requestId,
        "taskCode": element.objectName,
        "exportProcessId": export_process_id,
        "importProcessId": import_process_id,
        "exportStatus": null,
        "importStatus": "In Progress",
        "submissionDate": new Date(),
        "completionDate": null,
        "createdBy": useDetails.email
      }
      var postExportData = await offeringsService.postExportDetails(null, detailsData, null);
      console.log(postExportData);

      const lastIndex = path.lastIndexOf('/');
      const pathafterslash = path.slice(lastIndex + 1);
      const partbeforelastslash = path.slice(0, lastIndex);
      var filename = "reportcatalog/" + exportId + "/" + "exports-source/" + exportId + "_" + pathafterslash + ext;
      console.log('lllllllllllllllllllllllllllllllllllllllllllllllllllllllllllll' + filename);
      var destinationPath = "reportcatalog/" + exportId + "/" + "imports-target/" + exportId + "_" + pathafterslash + ext;
      if (fs.existsSync(filename)) {
        base64.encode(filename, async function (err, base64String) {
          try {
            let sampleHeaders = { 'Content-Type': 'text/xml;charset=UTF-8' };
            let xml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v7="urn://oracle.bi.webservices/v7">
            <soapenv:Header/>
            <soapenv:Body>
               <v7:pasteItem2>
                  <v7:archive>${base64String}</v7:archive>
                  <v7:replacePath>${partbeforelastslash}</v7:replacePath>
                  <v7:flagACL>false</v7:flagACL>
                  <v7:flagOverwrite>false</v7:flagOverwrite>
                  <v7:sessionID>${sessionID}</v7:sessionID>
               </v7:pasteItem2>
            </soapenv:Body>
         </soapenv:Envelope>
         `;

            const { response } = await soapRequest({ url: Url, headers: sampleHeaders, xml: xml });
            const { body } = response;
            const parsedResult = await parseStringPromise(body);
            const faultElement = parsedResult['soap:Envelope']['soap:Body'][0]['soap:Fault'];
            const faultstring = faultElement ? faultElement[0]['faultstring'][0] : undefined;

            console.log('faultstring', faultstring);

            if (typeof faultstring !== 'undefined') {
              flag = 'Failed';
            } else {
              flag = 'Completed';
              console.log('flagggggggggggggggg' + flag);
              // Use fs.rename to move the file
              if (!(await fsa.pathExists("reportcatalog/" + exportId))) {
                await fsa.ensureDir("reportcatalog/" + exportId);
              }

              if (!(await fsa.pathExists("reportcatalog/" + exportId + "/" + "imports-target/"))) {
                await fsa.ensureDir("reportcatalog/" + exportId + "/" + "imports-target/");
              }
              console.log('filename0000000000000000000' + filename);
              console.log('destinationfilename0000000000000000000' + destinationPath);
              fsa.rename(filename, destinationPath, (error) => {
                if (error) {
                  console.error('Error moving file:', error);
                } else {
                  console.log('File moved successfully!');
                }
              });
            }
            var date = new Date();
            query = "UPDATE export_process_id SET exportStatus = ?, completionDate = ? where importProcessId = ?";
            var res = await offeringsService.postCatalogExportDetails(query, [flag, date, import_process_id]);
            console.log(res);

          } catch (error) {
            console.error('Error occurred during SOAP request:', error);
            return { status: 400, data: false };
          }

        });


      }
      // console.log('before file rename---------------------' + flag);
      // if (flag === 'Completed') {
      //   fs.rename(sourceFile, destinationPath, (error) => {
      //     if (error) {
      //       console.error('Error moving file:', error);
      //     } else {
      //       console.log('File moved successfully!');
      //     }
      //   });
      // }
      return { status: 200, data: 'myArray' };
    }));

  }
  catch (error) {
    console.error('Unexpected error occurred:', error);
    return { status: 400, data: error };
  }
}