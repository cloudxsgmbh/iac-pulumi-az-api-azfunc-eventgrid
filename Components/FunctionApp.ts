import * as pulumi from "@pulumi/pulumi";
//import * as resources from "@pulumi/azure-native/resources";
import { authorization, insights, storage, web } from "@pulumi/azure-native";


interface FunctionAppArgs {
  resourceGroupName: pulumi.Output<string>;
}

export class FunctionApp extends pulumi.ComponentResource {

  private _componentName: string;

  constructor(private name: string, private args: FunctionAppArgs, opts?: pulumi.ResourceOptions) {

    super("clxs:FunctionApp", name, args, opts);

    this._componentName = name;

    // Create an Azure resource (Storage Account)
    const storageAccount = new storage.StorageAccount(this.getName("sa").replace(/-/g, ""), {
      resourceGroupName: args.resourceGroupName,
      sku: {
        name: storage.SkuName.Standard_LRS,
      },
      kind: storage.Kind.StorageV2,
    }, { parent: this });


    // App Insights
    const appInsights = new insights.Component(this.getName("insights"), {
      resourceGroupName: args.resourceGroupName,
      kind: "web",
      applicationType: "web"
    }, { parent: this });

    /* Hosting Plan */
    const plan = new web.AppServicePlan(this.getName("svcplan"), {
      resourceGroupName: args.resourceGroupName,
      sku: {
        name: "Y1",
        tier: 'Dynamic'
      }
    }, { parent: this });


    /* Function App */
    const func = new web.WebApp(this.getName("funcApp"), {
      resourceGroupName: args.resourceGroupName,
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
    }, { parent: this });

    const storageBlobDataOwnerRole = new authorization.RoleAssignment(this.getName("storageBlobDataOwnerRole"), {
      principalId: func.identity.apply(i => i!.principalId),
      principalType: "ServicePrincipal",
      roleDefinitionId: "/providers/Microsoft.Authorization/roleDefinitions/b7e6dc6d-f1e8-4753-8033-0f276bb0955b",
      scope: storageAccount.id
    }, { parent: this });


    // Register that we are done constructing the component
    this.registerOutputs({
      storageAccountName: storageAccount.name
    });
  }

  private getName(type: string) {
    return `${this._componentName}-${type}`;
  }
}