var query1 = require("../dbQuery");
var databaseService = require("../services/database");
var soapRequest = require("easy-soap-request");
const convert = require('xml2js').parseStringPromise;
const fs = require('fs');
var mailService = require("../services/mail");
var offeringsService = require("../services/offerings");

async function Workbooktest(instanceDetails, userName, password, filterValue,selectedTaskString) {
  let url = `${instanceDetails}:443/xmlpserver/services/v2/ScheduleService`;

  try {
    let sampleHeaders = { "Content-Type": "text/xml;charset=UTF-8" };

    let xml = `<soapenv:Envelope xmlns:soapenv='http://schemas.xmlsoap.org/soap/envelope/' xmlns:v2='http://xmlns.oracle.com/oxp/service/v2'>
      <soapenv:Header/>
      <soapenv:Body>
         <v2:scheduleReport>
            <v2:scheduleRequest>
               <v2:reportRequest>
                  <v2:attributeFormat>EXCEL</v2:attributeFormat>
                  <v2:attributeLocale>en-EN</v2:attributeLocale>
                  <v2:attributeTemplate>GL_Configuration_Workbook_Template</v2:attributeTemplate>
                  <v2:byPassCache>true</v2:byPassCache>
                  <v2:flattenXML>false</v2:flattenXML>
                  <v2:reportAbsolutePath>/Custom/Configuration Migration Toolkit/Finance/General Ledger/Report/GL_Configuration_Workbook_v1.xdo</v2:reportAbsolutePath>
                  <v2:parameterNameValues>
                  <v2:listOfParamNameValues>
                    <v2:item>
                      <v2:name>LEDGER_NAME</v2:name>
                      <v2:values>
                        <v2:item>${filterValue}</v2:item>
                      </v2:values>
                    </v2:item>
                    <v2:item>
                    <v2:name>TASKS</v2:name>
                        <v2:values>
                          <v2:item>${selectedTaskString}</v2:item>
                        </v2:values>
                    </v2:item>
                  </v2:listOfParamNameValues>
                </v2:parameterNameValues>
                  </v2:reportRequest>
                  <v2:saveDataOption>true</v2:saveDataOption>
                  <v2:saveOutputOption>true</v2:saveOutputOption>
               <v2:userJobDesc>Report Job SOAP UI</v2:userJobDesc>
               <v2:userJobName>Report Job SOAP UI</v2:userJobName>
            </v2:scheduleRequest>
            <v2:userID>${userName}</v2:userID>
            <v2:password>${password}</v2:password>
         </v2:scheduleReport>
      </soapenv:Body>
    </soapenv:Envelope>`;
console.log("selectedTaskString",selectedTaskString);
    const { response } = await soapRequest({
      url: url,
      headers: sampleHeaders,
      xml: xml,
    });

    const { body } = response;
    var scheduleReportReturn;

    scheduleReportReturn =
      /<scheduleReportReturn>(.*?)<\/scheduleReportReturn>/g.exec(body)[1];

    if (response.statusCode === 200) {
      return { status: 200, data: scheduleReportReturn };
    }
  } catch (error) {
    console.log(error);
    return { status: 400, data: error };
  }
}

async function getAllScheduleReportHistory1(
  instanceDetails,
  userName,
  password,
  jobId
) {
  let url = `${instanceDetails}:443/xmlpserver/services/v2/ScheduleService`;
  try {
    let sampleHeaders = { "Content-Type": "application/xml" };

    let xml = `<soapenv:Envelope xmlns:soapenv='http://schemas.xmlsoap.org/soap/envelope/' xmlns:v2='http://xmlns.oracle.com/oxp/service/v2'>
    <soapenv:Header/>
    <soapenv:Body>
       <v2:getAllScheduledReportHistory>
          <v2:filter>
             <v2:jobId>${jobId}</v2:jobId>
          </v2:filter>
          <v2:beginIdx>1</v2:beginIdx>
          <v2:userID>${userName}</v2:userID>
          <v2:password>${password}</v2:password>
       </v2:getAllScheduledReportHistory>
    </soapenv:Body>
 </soapenv:Envelope>`;


  // Send the SOAP request
    const { response } = await soapRequest({
      url: url,
      headers: sampleHeaders,
      xml: xml,
    });
    var childJobId;
  // Parse the SOAP response body
  console.log("xml--->",xml);
  console.log("sampleHeaders--->",sampleHeaders);

  console.log("url--->",url);


  const { body } = response;
  const result = await convert(body);
  console.log("response--->",response);
  console.log("result--->",result);

  // Get the value of some child element from the SOAP response
  childJobId = result['soapenv:Envelope']['soapenv:Body'][0]['getAllScheduledReportHistoryResponse'][0]['getAllScheduledReportHistoryReturn'][0]['jobInfoList'][0]['item'][0]['jobId'][0];
  console.log("childJobId--->",childJobId);

    if (response.statusCode === 200) {
      return { status: 200, data: childJobId };
    }
  } catch (error) {
    console.log(error);
    return { status: 400, data: error };
  }
}

async function getScheduledJobInfo(
    instanceDetails,
    userName,
    password,
    jobId
  ) {
    let url = `${instanceDetails}:443/xmlpserver/services/v2/ScheduleService`;
  
    try {
      let sampleHeaders = { "Content-Type": "text/xml;charset=UTF-8" };
  
      let xml = `<soapenv:Envelope xmlns:soapenv='http://schemas.xmlsoap.org/soap/envelope/' xmlns:v2='http://xmlns.oracle.com/oxp/service/v2'>
      <soapenv:Header/>
      <soapenv:Body>
         <v2:getScheduledJobInfo>
            <v2:jobInstanceID>${jobId}</v2:jobInstanceID>
            <v2:userID>${userName}</v2:userID>
            <v2:password>${password}</v2:password>
         </v2:getScheduledJobInfo>
      </soapenv:Body>
   </soapenv:Envelope>`;
      
  // Send the SOAP request
  const { response } = await soapRequest({
    url: url,
    headers: sampleHeaders,
    xml: xml,
  });
  var status;
// Parse the SOAP response body
const { body } = response;
const result = await convert(body);

// Get the value of some child element from the SOAP response
status = result['soapenv:Envelope']['soapenv:Body'][0]['getScheduledJobInfoResponse'][0]['getScheduledJobInfoReturn'][0]['status'][0];
console.log("status--->",status);
      if (response.statusCode === 200) {
        return { status: 200, data: status };
      }
    } catch (error) {
      console.log(error);
      return { status: 400, data: error };
    }
  }


  async function getScheduledReportOutputInfo(
    instanceDetails,
    userName,
    password,
    jobId
  ) {
    let url = `${instanceDetails}:443/xmlpserver/services/v2/ScheduleService`;
  
    try {
      let sampleHeaders = { "Content-Type": "text/xml;charset=UTF-8" };
  
      let xml = `<soapenv:Envelope xmlns:soapenv='http://schemas.xmlsoap.org/soap/envelope/' xmlns:v2='http://xmlns.oracle.com/oxp/service/v2'>
      <soapenv:Header/>
      <soapenv:Body>
      <v2:getScheduledReportOutputInfo>
            <v2:jobInstanceID>${jobId}</v2:jobInstanceID>
            <v2:userID>${userName}</v2:userID>
            <v2:password>${password}</v2:password>
         </v2:getScheduledReportOutputInfo>
      </soapenv:Body>
   </soapenv:Envelope>`;
      
// Send the SOAP request
const { response } = await soapRequest({
    url: url,
    headers: sampleHeaders,
    xml: xml,
  });
  var outputId;
// Parse the SOAP response body
const { body } = response;
const result = await convert(body);

// Get the value of some child element from the SOAP response
outputId = result['soapenv:Envelope']['soapenv:Body'][0]['getScheduledReportOutputInfoResponse'][0]['getScheduledReportOutputInfoReturn'][0]['jobOutputList'][0]['item'][0]['outputId'][0];
console.log("outputId--->",outputId);  
      if (response.statusCode === 200) {
        return { status: 200, data: outputId };
      }
    } catch (error) {
      console.log(error);
      return { status: 400, data: error };
    }
  }

  async function getDocumentData(
    instanceDetails,
    userName,
    password,
    jobId
  ) {
    let url = `${instanceDetails}:443/xmlpserver/services/v2/ScheduleService`;
  
    try {
      let sampleHeaders = { "Content-Type": "text/xml;charset=UTF-8" };
  
      let xml = `<soapenv:Envelope xmlns:soapenv='http://schemas.xmlsoap.org/soap/envelope/' xmlns:v2='http://xmlns.oracle.com/oxp/service/v2'>
      <soapenv:Header/>
      <soapenv:Body>
      <v2:getDocumentData>
            <v2:jobOutputID>${jobId}</v2:jobOutputID>
            <v2:userID>${userName}</v2:userID>
            <v2:password>${password}</v2:password>
         </v2:getDocumentData>
      </soapenv:Body>
   </soapenv:Envelope>`;
//    console.log("in getDocumentData--->");  
    
// Send the SOAP request
const { response } = await soapRequest({
    url: url,
    headers: sampleHeaders,
    xml: xml,
  });
  var getDocumentDataReturn;
// Parse the SOAP response body
const { body } = response;
const result = await convert(body);

// Get the value of some child element from the SOAP response
getDocumentDataReturn = result['soapenv:Envelope']['soapenv:Body'][0]['getDocumentDataResponse'][0]['getDocumentDataReturn'][0];
//  console.log("getDocumentDataReturn--->",getDocumentDataReturn); 

      if (response.statusCode === 200) {
        return { status: 200, data: getDocumentDataReturn };
      }
    } catch (error) {
      console.log(error);
      return { status: 400, data: error };
    }
  }

  // function sleep(ms) {
  //   return new Promise((resolve) => {
  //     setTimeout(resolve, ms);
  //   });
  // }

exports.getWorkbookExcel = async function (instanceDetails, filterValue,selectedTaskString) {
  let  data;
try{

    data = await databaseService.callDatabase(
      query1.getInstanceCredByURL,
      instanceDetails
    ); // DynamicYog
  
  let userName = data[0].username; // Yogesh instance details decode
  let bufferObj = Buffer.from(userName, "base64");
  let decodedString = bufferObj.toString("utf8");
  userName = decodedString.split(":")[0];
  let password = decodedString.split(":")[1];

  const sourceWorkbookData = await Workbooktest(instanceDetails,
    userName,
    password,
    filterValue,
    selectedTaskString
  );

  // await sleep(50000);
  let getChildJobId;
  let outputflag = "false";
  let i = 0;

while(outputflag != "true"){
   
      const getAllScheduleReportHistorydata = await getAllScheduleReportHistory1(
          instanceDetails,userName,
          password,sourceWorkbookData.data
        );
        console.log("getAllScheduleReportHistory status-try-->", getAllScheduleReportHistorydata.data,i);
        if (getAllScheduleReportHistorydata.status == 200){
          getChildJobId = getAllScheduleReportHistorydata.data;
          outputflag = "true";
        }else{
          i = i + 1;
          outputflag = "false"
        }
  }

const getScheduledJobInfodata = await getScheduledJobInfo(
    instanceDetails,userName,
    password,getChildJobId
  );
  console.log("getScheduledJobInfo status--->", getScheduledJobInfodata.data);

let getScheduledJobInfoStatus;
let flag = "false";
let x = 0;
let getDocumentDataDecodedData;
getScheduledJobInfoStatus = getScheduledJobInfodata.data;

while (flag != "true") {
  if(getScheduledJobInfoStatus == "Success"){

const getScheduledReportOutputInfodata = await getScheduledReportOutputInfo(
    instanceDetails,userName,
    password,getChildJobId
  );
  console.log("outputId--->", getScheduledReportOutputInfodata.data);

  console.log("getScheduledJobInfo status if--->",getScheduledJobInfoStatus , x);

getDocumentDataDecoded = await getDocumentData(
    instanceDetails,userName,
    password,getScheduledReportOutputInfodata.data
  );
  getDocumentDataDecodedData = getDocumentDataDecoded.data;
  flag = "true";
}
else{
  console.log("getScheduledJobInfo status else--->",getScheduledJobInfoStatus , x);
  const getScheduledJobInfodata = await getScheduledJobInfo(instanceDetails,userName,password,getChildJobId);
  getScheduledJobInfoStatus = getScheduledJobInfodata.data;
  flag = "false";

}
x = x + 1;

}

 var base64String = getDocumentDataDecodedData;
//   base64.decode(base64String, './workbooks/'+filename
// , function(err, output) {  console.log('success');});

// var emailBody =
//     `<div>Hi,</div>`            
// await mailService.sendMailToUser('yogesh.chaure@lntinfotech.com', 'PFA', emailBody, filename, filename);

if ( getDocumentDataDecoded.status === 200) {
    return { status: 200, data: base64String };
  }
} catch (error) {
  console.log(error);
  return { status: 400, data: error };
}
}

// this.getWorkbookExcel(
//   "Source",
//   "https://fa-epvg-test-saasfaprod1.fa.ocs.oraclecloud.com",
//   "CITI8 US"
// );
