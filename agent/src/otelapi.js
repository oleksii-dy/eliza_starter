"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var instrumentation_1 = require("@opentelemetry/instrumentation");
//import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
//import { trace } from '@opentelemetry/api';
var sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
var auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
var sdk_trace_node_2 = require("@opentelemetry/sdk-trace-node");
var exporter_zipkin_1 = require("@opentelemetry/exporter-zipkin");
var resources_1 = require("@opentelemetry/resources");
var semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
var instrumentation_http_1 = require("@opentelemetry/instrumentation-http");
//Specify zipkin url. default url is http://localhost:9411/api/v2/spans
// docker run -d -p 9411:9411 openzipkin/zipkin
var zipkinUrl = 'http://localhost';
var zipkinPort = '9411';
var zipkinPath = '/api/v2/spans';
var zipkinURL = "".concat(zipkinUrl, ":").concat(zipkinPort).concat(zipkinPath);
var options = {
    headers: {
        'module': 'mainai16z',
    },
    url: zipkinURL,
    serviceName: 'ai16z',
    // optional interceptor
    getExportRequestHeaders: function () {
        return {
            'module': 'mainai16z',
        };
    }
};
var traceExporter_zipkin = new exporter_zipkin_1.ZipkinExporter(options);
var traceExporter = new sdk_trace_node_1.ConsoleSpanExporter();
var txz = new sdk_trace_node_2.SimpleSpanProcessor(traceExporter_zipkin);
var tx = new sdk_trace_node_2.SimpleSpanProcessor(traceExporter);
try {
    var serviceName = 'eliza-agent';
    var provider = new sdk_trace_node_2.NodeTracerProvider({
        resource: new resources_1.Resource((_a = {},
            _a[semantic_conventions_1.ATTR_SERVICE_NAME] = serviceName,
            _a[semantic_conventions_1.ATTR_SERVICE_VERSION] = '1.0',
            _a)),
        spanProcessors: [
            txz,
            tx
            //	tx2
        ]
    });
    // Initialize the OpenTelemetry APIs to use the NodeTracerProvider bindings
    provider.register();
    (0, instrumentation_1.registerInstrumentations)({
        instrumentations: [
            (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)(),
            new instrumentation_http_1.HttpInstrumentation(),
        ],
    });
    elizaLogger.log("setup!");
}
catch (error) {
    elizaLogger.log("ERROR", error);
}
