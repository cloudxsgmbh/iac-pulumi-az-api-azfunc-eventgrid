import * as pulumi from "@pulumi/pulumi";
import "mocha";

// set the mocks
pulumi.runtime.setMocks(
  {
    newResource: function (args: pulumi.runtime.MockResourceArgs): {
      id: string;
      state: any;
    } {
      return {
        id: args.inputs.name + "_id",
        state: args.inputs,
      };
    },
    call: function (args: pulumi.runtime.MockCallArgs) {
      return args.inputs;
    },
  },
  "api-demo",
  "dev",
  true // Sets the flag `dryRun`, which indicates if pulumi is running in preview mode.
);

// set a test config
pulumi.runtime.setAllConfig({
  "apiManagementService:skuType": "Developer",
  "apiManagementService:capacity": "1",
  "apiManagementService:publisherEmail": "dev@example.ch",
  "apiManagementService:publisherName": "Cloudxs",
});

// run the tests
describe("Infrastructure", function () {
  let infra: typeof import("../index");

  before(async function () {
    // It's important to import the program _after_ the mocks are defined.
    infra = await import("../index");
  });

  describe("#Resource Group", function () {
    // check 1: is a resource group defined
    it("must be defined", function (done) {
      if (!infra.resourceGroup) {
        done(new Error("Resource Group not defined"));
      } else {
        done();
      }
    });
  });

  describe("#Function App", function () {
    // check 1: The function app hass httpsOnly set to true
    it("must have httpsOnly set to true", function (done) {
      pulumi
        .all([infra.functionApp.functionApp.httpsOnly])
        .apply(([httpsOnly]) => {
          if (!httpsOnly || httpsOnly !== true) {
            done(new Error(`httpsOnly: ${httpsOnly}. Expected: true`));
          } else {
            done();
          }
        });
    });

    // check 2: The function app has identity set to SystemAssigned
    it("must have identity set to SystemAssigned", function (done) {
      pulumi
        .all([infra.functionApp.functionApp.identity])
        .apply(([identity]) => {
          if (!identity || identity.type !== "SystemAssigned") {
            done(new Error(`identity: ${identity}. Expected: SystemAssigned`));
          } else {
            done();
          }
        });
    });
  });

  describe("#Event Grid / Subscription", function () {
    // check 1: Instances have a Name tag.
    it("must have the correct schema", function (done) {
      pulumi.all([infra.egSub.eventDeliverySchema]).apply(([schema]) => {
        if (!schema || schema !== "EventGridSchema") {
          done(new Error(`Wrong schema: ${schema}. Expected: EventGridSchema`));
        } else {
          done();
        }
      });
    });
  });
});
