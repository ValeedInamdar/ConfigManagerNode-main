
var query = require("../dbQuery");

var authService = require("./auth")
var databaseService = require("./database")
var migService = require("./migration")
var mailService = require("./mail")


//#region - offerings
exports.getOfferings = async function () {
    var data;
    data = await databaseService.callDatabase(query.offerings)
    if (data.length > 0) {
        return { status: 200, data: data }
    } else {
        return { status: 400, data: "No data" }
    }
}

exports.getModules = async function (offeringId) {
    var data;
    data = await databaseService.callDatabase(query.modules, [offeringId])
    if (data.length > 0) {
        return { status: 200, data: data }
    } else {
        return { status: 400, data: "No data" }
    }
}

exports.getFunctionalArea = async function (moduleId,offeringId) {
    var functionalAreaData;
    functionalAreaData = await databaseService.callDatabase(query.functionalArea, [moduleId])
    if (functionalAreaData.length > 0) {
        for (let i = 0; i < functionalAreaData.length; i++) {
            var taskData = [];
            taskData = await this.getTasks(functionalAreaData[i].functionalAreaId,offeringId)//Yogesh AHCS
            functionalAreaData[i].tasks = [];
            functionalAreaData[i].tasks = taskData.data;

        }
        return { status: 200, data: functionalAreaData }

    }
    // if (functionalAreaData.length > 0) {
    //     return { status: 200, data: functionalAreaData }
    // } 
    else {
        return { status: 400, data: "No data" }
    }
}

exports.getTasks = async function (moduleId) {
    var data, filterTasks;
    data = await databaseService.callDatabase(query.tasks, [moduleId])
    if (data.length > 0) {
        return { status: 200, data: data }// By Yogesh
    } else {
        return { status: 400, data: "No data" }
    }
}

exports.getTasks = async function (moduleId,offeringId) {//Yogesh AHCS start created new method with 2 params
    var data, filterTasks;
    data = await databaseService.callDatabase(query.tasks, [moduleId,offeringId,'Y'])
    if (data.length > 0) {
        return { status: 200, data: data }
    } else {
        return { status: 400, data: "No data" }
    }
}//AHCS end


exports.getFilter = async function (filter,sourceUrl) {// DynamicYog
    var data = [];
    data = await migService.getFilterValues(filter,sourceUrl);// DynamicYog


    if (data && data.length > 0) {// DynamicYog 
        return { status: 200, data: data }
    } else {
        return { status: 400, data: "No data" }
    }

}

exports.getTasksView = async function (name, name, id) {
    var data;
    data = await databaseService.callDatabase(query.tasksView, [name, name, id])
    if (data.length > 0) {
        return { status: 200, data: data }
    } else {
        return { status: 400, data: "No data" }
    }
}
//#endregion


//#region - history
exports.getHistory = async function (historyId) {
    var data;
    if (historyId === 'all') {
        data = await databaseService.callDatabase(query.getAllHistory)
    } else {
        data = await databaseService.callDatabase(query.getSpecificHistory, [parseInt(historyId)])
    }
    if (data.length > 0) {
        return { status: 200, data: data }
    } else {
        return { status: 400, data: "No data" }
    }
}

exports.postHistory = async function (historyId, historyData, query) {
    if (historyId) {
        var data;
        data = await databaseService.callDatabase(query)
        if (data) {
            return { status: 200, data: "Success" }
        } else {
            return { status: 400, data: "Failed" }
        }
    } else {
        var histData = [historyData.requestName, historyData.requestType, historyData.sourceInstance, historyData.destinationInstance, historyData.module, historyData.filterCriteria, historyData.status, historyData.submissionDate, historyData.completionDate, historyData.createdBy, historyData.taskDataJson, historyData.exportNumbers ]
        var data;
        data = await databaseService.callDatabase("INSERT INTO history (requestName, requestType, sourceInstance, destinationInstance, module, filterCriteria, status, submissionDate, completionDate, createdBy, taskDataJson,exportRequestId) VALUES (?,?,?,?,?,?,?,?,?,?,?,?);", histData)
        // data = await databaseService.callDatabase(query.insertHistory, histData)
        if (data) {
            return { status: 200, data: { "id": data.insertId } }
        } else {
            return { status: 400, data: "Failed" }
        }
    }
}


exports.getExportDetails = async function (exportId) {
    var data;
    if (exportId === 'all') {
        data = await databaseService.callDatabase(query.getAllExportDetails)
    } else {
        data = await databaseService.callDatabase(query.getSpecificExportDetails, [parseInt(exportId)])
    }
    if (data.length > 0) {
        return { status: 200, data: data }
    } else {
        return { status: 400, data: "No data" }
    }
}

exports.postExportDetails = async function (exportId, exportData, query) {
    if (exportId) {
        var data;
        data = await databaseService.callDatabase(query)
        if (data) {
            return { status: 200, data: "Success" }
        } else {
            return { status: 400, data: "Failed" }
        }
    } else {
        var exportData = [exportData.requestId, exportData.taskCode, exportData.exportProcessId, exportData.importProcessId, exportData.exportStatus, null, exportData.submissionDate, exportData.completionDate, exportData.createdBy ]
        console.log("--->exportData-->")
        var data;
        data = await databaseService.callDatabase("INSERT INTO export_process_id (requestId, taskCode, exportProcessId, importProcessId, exportStatus, importStatus, submissionDate, completionDate, createdBy) VALUES (?,?,?,?,?,?,?,?,?);", exportData)
        if (data) {
            return { status: 200, data: { "id": data.insertId } }
        } else {
            return { status: 400, data: "Failed" }
        }
    }
}

//#endregion
exports.postCatalogExportDetails = async function (query,data) {
    
        var data;
        data = await databaseService.callDatabase(query,data)
        if (data) {
            return { status: 200, data: "Success" }
        } else {
            return { status: 400, data: "Failed" }
}
}

//#region - instance details
exports.getInstanceDetails = async function () {
    var data;
    data = await databaseService.callDatabase(query.getInstanceDetails)
    if (data.length > 0) {
        return { status: 200, data: data }
    } else {
        return { status: 400, data: "No data" }
    }
}

exports.getInstanceName = async function () {
    var data;
    data = await databaseService.callDatabase(query.getInstanceName)
    if (data.length > 0) {
        return { status: 200, data: data }
    } else {
        return { status: 400, data: "No data" }
    }
}

exports.newInstance = async function (instanceName,url,instanceType,environmentType,username,password) {
    var data;
    let instanceString = username +":"+password; // yogesh save instance cred as encrypted start
   
    let bufferObjInstance = Buffer.from(instanceString, "utf8");
    let   importEncodedString = bufferObjInstance.toString('base64');

    data = await databaseService.callDatabase(query.instance,[instanceName,url,instanceType,environmentType,importEncodedString,importEncodedString])// yogesh save instance cred as encrypted end
    if (data.affectedRows > 0) {
        return { status: 200, data: 'Success' }
    } else {
        return { status: 400, data: 'Failed' }
    }
}
exports.editInstance = async function (ID,Itype,environmentType,name,password,instanceUrl,username) {
    var data;
    data = await databaseService.callDatabase(query.editInstance,[name,instanceUrl,Itype,environmentType,username,password,ID])
    if (data.affectedRows > 0) {
        return { status: 200 }
    } else {
        return { status: 400 }
    }
}
exports.deleteInstance = async function (ID) {
    var data;
    data = await databaseService.callDatabase(query.deleteInstance,[ID])
    if (data.affectedRows > 0) {
        return { status: 200 }
    } else {
        return { status: 400 }
    }
}

//#endregion


exports.getBoardEmail = async function (moduleName) {
    var data;
    data = await databaseService.callDatabase(query.boardEmail, [moduleName])
    if (data.length > 0) {
        return { status: 200, data: data }
    } else {
        return { status: 400, data: "No data" }
    }
}







