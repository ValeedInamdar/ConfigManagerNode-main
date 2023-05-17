// DEV URL
let hostUrl = 'http://localhost'
//PROD URL
// let hostUrl = 'http://140.238.166.54'
let config = {
    web: `${hostUrl}:4200`,
    node: `${hostUrl}:3000`,
    export: `fscmRestApi/resources/11.13.18.05/setupTaskCSVExports`,
    import: `fscmRestApi/resources/11.13.18.05/setupTaskCSVImports`,
    filterValueUrl: 'https://fa-epvg-test-saasfaprod1.fa.ocs.oraclecloud.com:443/xmlpserver/services/ExternalReportWSSService?wsdl',


    dbConfig: {
        host: "localhost",
        user: "root",
        password: "Valeed@9380",
        database: "conf_migration"
    },
    // dbConfig: {
    //     host: "localhost",
    //     user: "root",
    //     password: "Shashikala73",
    //     database: "conf_migration"
    // },

    mailDetails: {
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: '587',
        auth: {
            user: 'ltim.demo.user@gmail.com',
            pass: 'eaunmzvtajzrczxx'
        }
    },

    email: `valeed.inamdar@lntinfotech.com`
}


module.exports = config;