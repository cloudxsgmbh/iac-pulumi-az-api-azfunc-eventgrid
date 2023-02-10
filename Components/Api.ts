import * as pulumi from "@pulumi/pulumi";
import { apimanagement, web } from "@pulumi/azure-native";
import { config } from "process";


interface ApiArgs {
  resourceGroupName: pulumi.Input<string>;
  function: web.WebApp;
}

export class Api extends pulumi.ComponentResource {

  private _componentName: string;

  constructor(private name: string, private args: ApiArgs, opts?: pulumi.ResourceOptions) {
    super("clxs:Api", name, args, opts);

    const apiStackConfig = new pulumi.Config('apiManagementService');

    this._componentName = name;

    const apiManagementService = new apimanagement.ApiManagementService(this.getName("service"), {
      resourceGroupName: args.resourceGroupName,
      sku: {
        name: apiStackConfig.require('skuType'), //apimanagement.SkuType.Developer,
        capacity: apiStackConfig.requireNumber('capacity')
      },
      publisherEmail: apiStackConfig.require('publisherEmail'),
      publisherName: apiStackConfig.require('publisherName'),
      enableClientCertificate: true,
      /*       identity: {
              type: "SystemAssigned"
            }, */
    }, { parent: this });


    const funcKey = new apimanagement.NamedValue(this.getName('funcKey'), {
      resourceGroupName: args.resourceGroupName,
      serviceName: apiManagementService.name,
      displayName: args.function.name.apply(n => `${n}-functionkey`),
      secret: true,
      value: "ThisIsAFunctionKey", //TODO: generate a new one on the function app. Seems not possible with Pulumi. Further investigation needed.
      tags: ["key", "function", "auto"]
    }, { parent: this })


    //Backend that points to the function app
    const functionAppBackend = new apimanagement.Backend(this.getName('functionBackend'), {
      resourceGroupName: args.resourceGroupName,
      serviceName: apiManagementService.name,
      resourceId: args.function.id.apply(id => `https://management.azure.com${id}`),
      protocol: apimanagement.Protocol.Http,
      url: args.function.defaultHostName.apply((hostName) => `https://${hostName}/api`),
      credentials: {
        header: {
          "x-functions-key": [
            funcKey.name.apply(name => `{{${name}}}`)
          ]
        }
      }
    }, { parent: this });


    // Api
    const myApi = new apimanagement.Api(this.getName("api"), {
      resourceGroupName: args.resourceGroupName,
      displayName: this.name,
      path: "api",
      serviceName: apiManagementService.name,
      apiType: apimanagement.ApiType.Http,
      protocols: [apimanagement.Protocol.Https],
    }, { parent: this });


    // Api Operation
    const operation = new apimanagement.ApiOperation(this.getName('getHelloNode'), {
      resourceGroupName: args.resourceGroupName,
      apiId: myApi.name,
      serviceName: apiManagementService.name,
      displayName: "HelloNode",
      method: "GET",
      urlTemplate: "/HelloNode", //This has to be the same as the function name!
    }, { parent: this });


    // Api Operation Policy
    const opPolicy = new apimanagement.ApiOperationPolicy("set-backend-service", {
      resourceGroupName: args.resourceGroupName,
      apiId: myApi.name,
      operationId: operation.name,
      serviceName: apiManagementService.name,
      policyId: "policy",
      format: apimanagement.PolicyContentFormat.Xml,
      value: functionAppBackend.name.apply((backendName) => {
        return `<policies>
          <inbound>
              <base />
              <set-backend-service id="apim-generated-policy" backend-id="${backendName}" />
          </inbound>
          <backend>
              <base />
          </backend>
          <outbound>
              <base />
          </outbound>
          <on-error>
              <base />
          </on-error>
        </policies>` })
    }, { parent: this });



    this.registerOutputs();
  }

  private getName(type: string) {
    return `${this._componentName}-${type}`;
  }
}