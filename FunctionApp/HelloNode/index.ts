import { AzureFunction, Context, HttpRequest } from "@azure/functions"

const HelloNode: AzureFunction = async function (context: Context, req: HttpRequest) {
  context.log('JavaScript HTTP trigger function processed a request.');

  const timeStamp = new Date().toISOString();

  // Retrieve caller name from query string or body
  const caller = req.query.name || req.body.name || "unknown";


  context.bindings.outputEvent = [];
  context.bindings.outputEvent.push({
    "topic": "",
    "subject": "HelloNode",
    "id": "1",
    "eventType": "Hello",
    "eventTime": timeStamp,
    "data": {
      "content": "This is a test event. It was sent by the Azure Function called HelloNode.",
      "caller": caller
    },
    "dataVersion": "1.0",
    "metadataVersion": "1"
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