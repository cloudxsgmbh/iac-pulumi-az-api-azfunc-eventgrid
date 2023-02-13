import { readFileSync } from "fs";
import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import { eventgrid } from "@pulumi/azure-native";

import { FunctionApp } from './Components/FunctionApp';
import { Api } from './Components/Api';

// Helpers
function getName(type: string) {
    const projectName = pulumi.getProject().toLowerCase();
    const stackName = pulumi.getStack().toLowerCase();
    return `${projectName}-${stackName}-${type}`;
}

// Get the current Azure environment
//const config = pulumi.output(authorization.getClientConfig());

// Create an Azure Resource Group
const resourceGroup = new resources.ResourceGroup(getName("rg"));


// Create EventGrid resources
const eventGridTopic = new eventgrid.Topic(getName("egTopic"), {
    resourceGroupName: resourceGroup.name,
});


// Create a Function App
const functionApp = new FunctionApp(getName("app"), {
    resourceGroup: resourceGroup,
    functionDirectory: "./FunctionApp",
    eventGridTopic: eventGridTopic
});

// Create an Api Management
const apiManagement = new Api(getName("api"), {
    resourceGroupName: resourceGroup.name,
    function: functionApp.functionApp
});



// add readme to stack outputs. must be named "readme".
export const readme = readFileSync(`./Pulumi.${pulumi.getStack()}.README.md`).toString();