import { readFileSync } from "fs";
import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import { authorization, insights, storage, web } from "@pulumi/azure-native";

import { FunctionApp } from './Components/FunctionApp';

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

const mySecondFunction = new FunctionApp(getName("app"), {
    resourceGroupName: resourceGroup.name
});

// add readme to stack outputs. must be named "readme".
export const readme = readFileSync(`./Pulumi.${pulumi.getStack()}.README.md`).toString();