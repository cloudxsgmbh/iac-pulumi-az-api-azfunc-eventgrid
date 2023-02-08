import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import { authorization, insights, storage, web } from "@pulumi/azure-native";

// Create an Azure Resource Group
const resourceGroup = new resources.ResourceGroup("apiDemo");

// Create an Azure resource (Storage Account)
const storageAccount = new storage.StorageAccount("sa", {
    resourceGroupName: resourceGroup.name,
    sku: {
        name: storage.SkuName.Standard_LRS,
    },
    kind: storage.Kind.StorageV2,
});

const config = pulumi.output(authorization.getClientConfig());
const appInsights = new insights.Component("appinsights", {
    resourceGroupName: resourceGroup.name,
    kind: "web",
    applicationType: "web",
    tags: {
        //[`hidden-link:/subscriptions/${config.subscriptionId}/resourceGroups/${resourceGroup.name}/providers/Microsoft.Web/sites/${func}`]: 'Resource'
    }
});

/* Hosting Plan */
const plan = new web.AppServicePlan("plan", {
    resourceGroupName: resourceGroup.name,
    sku: {
        name: "Y1",
        tier: 'Dynamic'
    }
});


/* Function App */
const func = new web.WebApp("func", {
    resourceGroupName: resourceGroup.name,
    serverFarmId: plan.id,
    httpsOnly: true,
    kind: "functionapp",
    identity: {
        type: "SystemAssigned"
    },
    siteConfig: {
        appSettings: [
            {
                name: 'APPINSIGHTS_INSTRUMENTATIONKEY',
                value: appInsights.instrumentationKey
            },
            {
                name: 'AzureWebJobsStorage__accountName',
                value: storageAccount.name
            },
            {
                name: 'FUNCTIONS_WORKER_RUNTIME',
                value: 'powershell'
            },
            {
                name: 'FUNCTIONS_EXTENSION_VERSION',
                value: '~4'
            }
        ]
    }
});

const storageBlobDataOwnerRole = new authorization.RoleAssignment("storageBlobDataOwnerRole", {
    principalId: func.identity.apply(i => i!.principalId),
    principalType: "ServicePrincipal",
    roleDefinitionId: "/providers/Microsoft.Authorization/roleDefinitions/b7e6dc6d-f1e8-4753-8033-0f276bb0955b",
    scope: storageAccount.id
});
