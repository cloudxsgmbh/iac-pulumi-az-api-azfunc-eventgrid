# API Demo

This is a demo to deploy Azure resources with _Pulumi_. The intention of this repository is to learn, how to connect different Azure services together.

## Infrastructure
There is a REST API entry point built with _API Management_ that triggers an _Azure Function_. The Azure Function sends an event to _Event Grid_. Another _Azure Function_ is subscribed to the Event Grid _Topic_ and is triggered when an event is published.

```
┌───────────────┐
│ ApiManagement │
└───────┬───────┘
        │
        │
        ▼
 ┌────────────┐        ┌────────────┐       ┌───────────────────┐
 │ AzFunction │        │ Event Grid │       │ AzFunction        │
 │ HelloNode  ├───────►│   Topic    ├──────►│ EventGridTrigger1 │
 └────────────┘        └────────────┘       └───────────────────┘
```

## Deployment
Make sure you have installed the [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/) and you are connected to an Azure account (`az login`).

Be aware, that there is some configuration in the file `Pulumi.dev.yaml` that is not checked in. You can use the file `Pulumi.dev.yaml.example` as a template.