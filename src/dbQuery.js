let query = {
    managerEmail: 'SELECT managerEmail FROM user WHERE email = ?',
    checkEmail: 'SELECT email FROM user WHERE email = ?',
    login: 'SELECT userId, firstName, lastName, email, role, managerEmail FROM user WHERE email = ? && password = ?',
    managerEmail: 'SELECT managerEmail FROM user WHERE email = ?',
    register:"INSERT INTO user (firstName,lastName,email,password,role,managerName,managerEmail) VALUES (?,?,?,?,?,?,?);",
    forgotPassword:"UPDATE user SET password= ? where email= ?",

    offerings: 'SELECT * FROM offerings',
    modules: 'SELECT * FROM modules WHERE offeringId = ?',
    functionalArea: 'SELECT * FROM functional_area WHERE moduleId = ?',
    tasks: 'SELECT * FROM tasklist WHERE functionalAreaId = ? AND offeringId = ? AND exportImport = ?' ,// By Yogesh
    tasksView: "SELECT * from tasklist_with_scope_gl WHERE (ledgername = ? OR primaryLedgerName= ?) AND taskid = ?",
    deleteFilterRecord: 'truncate table le_bu_led_loc',
    insertFilterRecord: 'INSERT INTO le_bu_led_loc (legalEntityId,legalEntityName,buId,buName,ledgerId,ledgerName,ledgerCategoryCode,locationCode,locationId,primaryLedgerName,primaryLedgerId) VALUES (?,?,?,?,?,?,?,?,?,?,?)',

    getAllHistory: 'SELECT * FROM history',
    getSpecificHistory: 'SELECT * FROM history WHERE requestId = ?',
    insertHistory: "INSERT INTO history (requestName, requestType, sourceInstance, destinationInstance, module, filterCriteria, status, submissionDate, completionDate, createdBy, taskDataJson) VALUES (?,?,?,?,?,?,?,?,?,?,?);",

    getAllExportDetails: 'SELECT * FROM export_process_id',
    getSpecificExportDetails: 'SELECT * FROM export_process_id WHERE requestId = ?',
    insertExportDetails: "INSERT INTO export_process_id (requestId, taskCode, exportProcessId, importProcessId, exportStatus, importStatus, submissionDate, completionDate, createdBy) VALUES (?,?,?,?,?,?,?,?,?);",

    getInstanceDetails: 'SELECT * FROM instance_details',
    getInstanceName: 'SELECT environmentType, instanceName FROM instance_details',
    getInstanceCred: 'SELECT username, password FROM instance_details WHERE environmentType = ?',
    getInstanceCredByURL: 'SELECT username, password FROM instance_details WHERE url = ?', //DynamicYog
    instance:"INSERT INTO instance_details (instanceName,url,instanceType,environmentType,username,password) VALUES (?,?,?,?,?,?);",
    editInstance:"UPDATE instance_details SET instanceName = ?, url=?, instanceType=?,environmentType=?,username=?,password=? where instanceId=?;",
    deleteInstance:"DELETE from instance_details where instanceId=?; ",

    getExportComplete:"SELECT * FROM history where (requestType = 'Export'||requestType='Catalog Export') && createdBy = ? && status = 'Completed'",
    getExportProcessIds:"SELECT exportProcessId from export_process_id WHERE requestId = ?",
    getExportProcessId:"SELECT * from export_process_id WHERE requestId = ? and taskCode = ?",
    getExportlogsbyReq:"SELECT exportProcessId,exportStatus, submissionDate, createdBy, CONVERT(exportProcessLogs using utf8) as exportLog  from export_process_id WHERE requestId = ? and taskCode = ?",


    getImportProcessId:"SELECT * from export_process_id WHERE requestId = ? and taskCode = ?",
    updateImportDetails:"UPDATE export_process_id SET importStatus = ?, completionDate = ?,importProcessLogs = ? where importProcessId = ?",

    updateExportNumber:"UPDATE history SET exportRequestId = ? where requestId = ?",

    updateImportReq: "UPDATE history SET sourceInstance = ?, module = ?, filterCriteria = ? WHERE exportRequestId = ? && requestId = ?",
    insertImportDetails:"INSERT INTO export_process_id (requestId, taskCode, exportProcessId, importProcessId, exportStatus,importStatus, submissionDate, completionDate, createdBy,exportprocessLogs) VALUES (?,?,?,?,?,?,?,?,?,?) ",


    getInstanceByType: "SELECT * FROM instance_details where instanceType = ?",

    boardEmail: 'SELECT boardEmailId from modules where moduleName = ?',

    cred: 'SELECT token from cred where type = ?'
}


module.exports = query;