import { AzureFunction, Context, HttpRequest } from "@azure/functions"

const HelloNode: AzureFunction = async function (context: Context, req: HttpRequest) {
  context.log('JavaScript HTTP trigger function processed a request.');

  var timeStamp = new Date().toISOString();

  context.bindings.outputEvent = [];

  context.bindings.outputEvent.push({
    "id": "1",
    "subject": "test",
    "data": {
      "name": "test"
    },
    "eventType": "test",
    "eventTime": timeStamp,
    "dataVersion": "1.0"
  });


  //if (req.query.name || (req.body && req.body.name)) {
  //  context.res = {
  //    // status: 200, /* Defaults to 200 */
  //    body: "Hello from Node.js, " + (req.query.name || req.body.name)
  //  };
  //}
  //else {
  //  context.res = {
  //    status: 400,
  //    body: "Please pass a name on the query string or in the request body"
  //  };
  //}
};

export default HelloNode;