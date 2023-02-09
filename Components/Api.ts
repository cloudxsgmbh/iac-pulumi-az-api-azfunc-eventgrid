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
    }, { parent: this });


    //Backend that points to the function app
    const functionAppBackend = new apimanagement.Backend(this.getName('functionBackend'), {
      resourceGroupName: args.resourceGroupName,
      serviceName: apiManagementService.name,
      resourceId: args.function.id.apply(id => `https://management.azure.com${id}`),
      protocol: apimanagement.Protocol.Http,
      url: args.function.defaultHostName.apply((hostName) => `https://${hostName}/api`)
    }, { parent: this });

    /*     const myApi = new apimanagement.Api(this.getName("api"), {
          resourceGroupName: args.resourceGroupName,
          path: "api",
          serviceName: apiManagementService.name,
          apiType: apimanagement.ApiType.Http
        }, { parent: this });
    
    
        const operation = new apimanagement.ApiOperation(this.getName("operation"), {
          resourceGroupName: args.resourceGroupName,
          apiId: myApi.id,
          serviceName: apiManagementService.name,
          displayName: "My first operation",
          method: "GET",
          urlTemplate: "api"
        }, { parent: this }); */
  }

  private getName(type: string) {
    return `${this._componentName}-${type}`;
  }
}