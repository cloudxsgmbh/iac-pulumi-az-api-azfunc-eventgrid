// built-ins
import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import { authorization, insights, storage, web } from "@pulumi/azure-native";

// custom imports
import { signedBlobReadUrl } from "./helpers";


interface FunctionAppArgs {
  /** The Resource Group object */
  resourceGroup: resources.ResourceGroup;
  /** Provide a relative path to the Azure function code */
  functionDirectory: string;
}

export class FunctionApp extends pulumi.ComponentResource {

  // Private variables
  private _componentName: string;
  // Public variables
  public readonly functionApp: web.WebApp;

  // Constructor
  constructor(private name: string, private args: FunctionAppArgs, opts?: pulumi.ResourceOptions) {

    super("clxs:FunctionApp", name, args, opts);

    this._componentName = name;


    // Storage account is required by Function App.
    // Also, we will upload the function code to the same storage account.
    const storageAccount = new storage.StorageAccount(this.getName("sa").replace(/-/g, ""), {
      resourceGroupName: args.resourceGroup.name,
      sku: {
        name: storage.SkuName.Standard_LRS,
      },
      kind: storage.Kind.StorageV2,
    }, { parent: this });

    // Function code archives will be stored in this container.
    const codeContainer = new storage.BlobContainer(this.getName("zips"), {
      resourceGroupName: args.resourceGroup.name,
      accountName: storageAccount.name,
    }, { parent: this });

    // Upload Azure Function's code as a zip archive to the storage account.
    const codeBlob = new storage.Blob(this.getName("zip"), {
      resourceGroupName: args.resourceGroup.name,
      accountName: storageAccount.name,
      containerName: codeContainer.name,
      source: new pulumi.asset.FileArchive(args.functionDirectory),
    }, { parent: this });


    // App Insights
    const appInsights = new insights.Component(this.getName("insights"), {
      resourceGroupName: args.resourceGroup.name,
      kind: "web",
      applicationType: "web"
    }, { parent: this });

    /* Hosting Plan */
    const plan = new web.AppServicePlan(this.getName("svcplan"), {
      resourceGroupName: args.resourceGroup.name,
      sku: {
        name: "Y1",
        tier: 'Dynamic'
      }
    }, { parent: this });


    /* Function App */
    const codeBlobUrl = signedBlobReadUrl(codeBlob, codeContainer, storageAccount, args.resourceGroup);
    this.functionApp = new web.WebApp(this.getName("funcApp"), {
      resourceGroupName: args.resourceGroup.name,
      serverFarmId: plan.id,
      httpsOnly: true,
      kind: "functionapp",
      identity: {
        type: "SystemAssigned"
      },
      siteConfig: {
        appSettings: [
          { name: 'APPINSIGHTS_INSTRUMENTATIONKEY', value: appInsights.instrumentationKey },
          { name: 'AzureWebJobsStorage__accountName', value: storageAccount.name },
          { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' },
          { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' },
          { name: "WEBSITE_NODE_DEFAULT_VERSION", value: "~18" },
          { name: "WEBSITE_RUN_FROM_PACKAGE", value: codeBlobUrl },
        ]
      }
    }, { parent: this });

    const storageBlobDataOwnerRole = new authorization.RoleAssignment(this.getName("storageBlobDataOwnerRole"), {
      principalId: this.functionApp.identity.apply(i => i!.principalId),
      principalType: "ServicePrincipal",
      roleDefinitionId: "/providers/Microsoft.Authorization/roleDefinitions/b7e6dc6d-f1e8-4753-8033-0f276bb0955b",
      scope: storageAccount.id
    }, { parent: this });


    // Register that we are done constructing the component
    this.registerOutputs({
      functionName: this.functionApp.name,
    });
  }

  // Private methods
  private getName(type: string) {
    return `${this._componentName}-${type}`;
  }
}